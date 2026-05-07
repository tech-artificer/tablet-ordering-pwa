import { readonly } from "vue"
import { logger } from "~/utils/logger"

type EchoChannel = {
  listen: (event: string, callback: (payload: unknown) => void) => EchoChannel
  stopListening?: (event: string) => void
}

type EchoLike = {
  channel: (name: string) => EchoChannel
  leave?: (name: string) => void
}

type EchoWindow = Window & {
    Echo?: EchoLike
}

const MAX_ECHO_SUBSCRIBE_ATTEMPTS = 10
const ECHO_SUBSCRIBE_RETRY_MS = 500

export const useAppUpdate = () => {
    const updateAvailable = ref(false)
    const updating = ref(false)
    const registration = ref<ServiceWorkerRegistration | null>(null)
    let updateInterval: ReturnType<typeof setInterval> | null = null
    let swStateListener: ((event: Event) => void) | null = null
    let echoChannel: EchoChannel | null = null
    let echoRetryTimer: ReturnType<typeof setTimeout> | null = null

    const getEcho = (): EchoLike | null => {
        if (typeof window === "undefined") {
            return null
        }

        return ((window as EchoWindow).Echo ?? null)
    }

    const refreshWaitingState = () => {
        updateAvailable.value = Boolean(registration.value?.waiting)
    }

    const attachWaitingWorkerListener = () => {
        if (!registration.value?.installing) {
            return
        }

        const installingWorker = registration.value.installing
        if (!installingWorker) {
            return
        }

        swStateListener = () => {
            if (installingWorker.state === "installed" && registration.value?.waiting) {
                updateAvailable.value = true
            }
        }

        installingWorker.addEventListener("statechange", swStateListener)
    }

    const setupServiceWorkerWatcher = async () => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
            return
        }

        try {
            registration.value = await navigator.serviceWorker.getRegistration()
            refreshWaitingState()

            registration.value?.addEventListener("updatefound", attachWaitingWorkerListener)

            updateInterval = setInterval(async () => {
                if (document.visibilityState !== "visible") {
                    return
                }

                try {
                    await registration.value?.update()
                    refreshWaitingState()
                } catch (error) {
                    logger.warn("[PWA] Failed to check service worker update", error)
                }
            }, 60_000)
        } catch (error) {
            logger.warn("[PWA] Failed to initialize service worker watcher", error)
        }
    }

    const setupReverbUpdateSignal = (attempt = 0) => {
        if (echoChannel) {
            return
        }

        const echo = getEcho()
        if (!echo) {
            if (attempt < MAX_ECHO_SUBSCRIBE_ATTEMPTS) {
                echoRetryTimer = setTimeout(() => {
                    setupReverbUpdateSignal(attempt + 1)
                }, ECHO_SUBSCRIBE_RETRY_MS)
            }

            return
        }

        try {
            echoChannel = echo.channel("app.updates")
            echoChannel.listen(".AppUpdated", () => {
                updateAvailable.value = true
            })
        } catch (error) {
            logger.warn("[PWA] Failed to subscribe app update channel", error)
        }
    }

    const applyUpdate = () => {
        if (updating.value || typeof window === "undefined") {
            return
        }

        updating.value = true

        try {
            if (registration.value?.waiting) {
                registration.value.waiting.postMessage({ type: "SKIP_WAITING" })
            }

            window.location.reload()
        } finally {
            updating.value = false
        }
    }

    const initialize = async () => {
        await setupServiceWorkerWatcher()
        setupReverbUpdateSignal()
    }

    const dispose = () => {
        if (updateInterval) {
            clearInterval(updateInterval)
            updateInterval = null
        }

        if (echoRetryTimer) {
            clearTimeout(echoRetryTimer)
            echoRetryTimer = null
        }

        if (registration.value) {
            registration.value.removeEventListener("updatefound", attachWaitingWorkerListener)
        }

        if (echoChannel?.stopListening) {
            echoChannel.stopListening(".AppUpdated")
        }

        const echo = getEcho()
        if (echo?.leave) {
            echo.leave("app.updates")
        }

        echoChannel = null
        registration.value = null
        swStateListener = null
    }

    return {
        updateAvailable: readonly(updateAvailable),
        updating: readonly(updating),
        initialize,
        applyUpdate,
        dispose,
    }
}
