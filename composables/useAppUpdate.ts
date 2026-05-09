import { computed, ref, toValue, watch } from "vue"
import type { MaybeRefOrGetter } from "vue"
import { logger } from "~/utils/logger"

const SKIP_WAITING_MESSAGE_TYPE = "SKIP_WAITING" as const
const UPDATE_AVAILABLE_MESSAGE_TYPES = ["UPDATE_AVAILABLE", "APP_UPDATE_AVAILABLE", "SW_UPDATE_AVAILABLE"] as const

type UseAppUpdateOptions = {
    isUpdateApplyBlocked?: MaybeRefOrGetter<boolean>
}

type WorkerMessageData = {
    type?: string
}

const hasServiceWorkerSupport = (): boolean =>
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.serviceWorker)

export function useAppUpdate (options?: UseAppUpdateOptions) {
    const showUpdateBanner = ref(false)
    const isApplyingUpdate = ref(false)
    const updateError = ref<string | null>(null)

    const isUpdateApplyBlocked = computed(() => {
        return Boolean(toValue(options?.isUpdateApplyBlocked ?? false))
    })

    const canApplyUpdate = computed(() =>
        showUpdateBanner.value &&
        !isApplyingUpdate.value &&
        !isUpdateApplyBlocked.value
    )

    let initialized = false
    let serviceWorkerRegistration: ServiceWorkerRegistration | null = null
    let hasReloaded = false
    let reloadPending = false
    let removeControllerChangeListener: (() => void) | null = null
    let removeServiceWorkerMessageListener: (() => void) | null = null
    let removeUpdateFoundListener: (() => void) | null = null
    let stopBlockedWatcher: (() => void) | null = null

    const reloadIfSafe = () => {
        if (hasReloaded || isUpdateApplyBlocked.value) {
            reloadPending = isUpdateApplyBlocked.value
            return
        }
        hasReloaded = true
        window.location.reload()
    }

    const bindControllerChangeReload = () => {
        if (!hasServiceWorkerSupport() || removeControllerChangeListener) {
            return
        }
        const onControllerChange = () => {
            reloadIfSafe()
        }
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)
        removeControllerChangeListener = () => {
            navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
            removeControllerChangeListener = null
        }
    }

    const updateBannerVisibility = () => {
        showUpdateBanner.value = Boolean(serviceWorkerRegistration?.waiting)
    }

    const attachUpdateFoundListener = () => {
        if (!serviceWorkerRegistration || removeUpdateFoundListener) {
            return
        }
        const onUpdateFound = () => {
            const installing = serviceWorkerRegistration?.installing
            if (!installing) {
                return
            }
            installing.addEventListener("statechange", () => {
                if (installing.state === "installed" && navigator.serviceWorker.controller) {
                    updateBannerVisibility()
                }
            })
        }
        serviceWorkerRegistration.addEventListener("updatefound", onUpdateFound)
        removeUpdateFoundListener = () => {
            serviceWorkerRegistration?.removeEventListener("updatefound", onUpdateFound)
            removeUpdateFoundListener = null
        }
    }

    const attachServiceWorkerMessageListener = () => {
        if (!hasServiceWorkerSupport() || removeServiceWorkerMessageListener) {
            return
        }
        const onMessage = (event: MessageEvent<WorkerMessageData>) => {
            const messageType = event?.data?.type
            if (messageType && UPDATE_AVAILABLE_MESSAGE_TYPES.includes(messageType as (typeof UPDATE_AVAILABLE_MESSAGE_TYPES)[number])) {
                showUpdateBanner.value = true
            }
        }
        navigator.serviceWorker.addEventListener("message", onMessage)
        removeServiceWorkerMessageListener = () => {
            navigator.serviceWorker.removeEventListener("message", onMessage)
            removeServiceWorkerMessageListener = null
        }
    }

    const initializeAppUpdate = async () => {
        if (initialized) {
            return
        }
        initialized = true

        if (!hasServiceWorkerSupport()) {
            return
        }

        bindControllerChangeReload()
        attachServiceWorkerMessageListener()

        stopBlockedWatcher = watch(isUpdateApplyBlocked, (blocked) => {
            if (!blocked && reloadPending) {
                reloadPending = false
                reloadIfSafe()
            }
        })

        try {
            serviceWorkerRegistration = await navigator.serviceWorker.ready
            attachUpdateFoundListener()
            updateBannerVisibility()
            await serviceWorkerRegistration.update().catch(() => {})
            updateBannerVisibility()
        } catch (error) {
            logger.warn("[PWA] Unable to initialize update watcher", error)
        }
    }

    const applyUpdate = () => {
        if (!canApplyUpdate.value) {
            return
        }
        if (!serviceWorkerRegistration || !serviceWorkerRegistration.waiting) {
            return
        }

        isApplyingUpdate.value = true
        updateError.value = null
        bindControllerChangeReload()

        try {
            serviceWorkerRegistration.waiting.postMessage({ type: SKIP_WAITING_MESSAGE_TYPE })
        } catch (error) {
            isApplyingUpdate.value = false
            updateError.value = "Failed to apply update. Please try again."
            logger.error("[PWA] Failed to apply update", error)
        }
    }

    const disposeAppUpdate = () => {
        removeControllerChangeListener?.()
        removeServiceWorkerMessageListener?.()
        removeUpdateFoundListener?.()
        stopBlockedWatcher?.()
        isApplyingUpdate.value = false
    }

    return {
        showUpdateBanner,
        canApplyUpdate,
        isApplyingUpdate,
        updateError,
        initializeAppUpdate,
        applyUpdate,
        disposeAppUpdate,
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
    let controllerChangeListener: (() => void) | null = null
    let echoChannel: EchoChannel | null = null
    let echoRetryTimer: ReturnType<typeof setTimeout> | null = null
    let refreshing = false

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
        const installingWorker = registration.value?.installing
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

    const setupControllerChangeReload = () => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator) || controllerChangeListener) {
            return
        }

        controllerChangeListener = () => {
            if (refreshing) {
                return
            }

            refreshing = true
            window.location.reload()
        }

        navigator.serviceWorker.addEventListener("controllerchange", controllerChangeListener)
    }

    const setupServiceWorkerWatcher = async () => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
            return
        }

        setupControllerChangeReload()

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
            echoChannel.listen(".AppUpdated", async () => {
                updateAvailable.value = true

                try {
                    await registration.value?.update()
                    refreshWaitingState()
                } catch (error) {
                    logger.warn("[PWA] Failed to refresh service worker after app update signal", error)
                }
            })
        } catch (error) {
            logger.warn("[PWA] Failed to subscribe app update channel", error)
        }
    }

    const applyUpdate = async () => {
        if (updating.value || typeof window === "undefined") {
            return
        }

        updating.value = true

        try {
            if (!registration.value) {
                registration.value = await navigator.serviceWorker.getRegistration()
            }

            if (!registration.value?.waiting) {
                await registration.value?.update()
                refreshWaitingState()
                return
            }

            registration.value.waiting.postMessage({ type: "SKIP_WAITING" })
        } catch (error) {
            logger.warn("[PWA] Failed to apply service worker update", error)
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

        if (controllerChangeListener && typeof navigator !== "undefined" && "serviceWorker" in navigator) {
            navigator.serviceWorker.removeEventListener("controllerchange", controllerChangeListener)
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
        controllerChangeListener = null
    }

    return {
        updateAvailable: readonly(updateAvailable),
        updating: readonly(updating),
        initialize,
        applyUpdate,
        dispose,
    }
}
