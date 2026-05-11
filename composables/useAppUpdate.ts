import { computed, ref, toValue, watch } from "vue"
import type { MaybeRefOrGetter } from "vue"
import { logger } from "~/utils/logger"

const SKIP_WAITING_MESSAGE_TYPE = "SKIP_WAITING" as const
const UPDATE_AVAILABLE_MESSAGE_TYPES = ["UPDATE_AVAILABLE", "APP_UPDATE_AVAILABLE", "SW_UPDATE_AVAILABLE"] as const

type UseAppUpdateOptions = {
    isUpdateApplyBlocked?: MaybeRefOrGetter<boolean>
    reload?: () => void
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
    const registration = ref<ServiceWorkerRegistration | null>(null)
    let hasReloaded = false
    let reloadPending = false
    let applyUpdateInProgress = false
    let removeControllerChangeListener: (() => void) | null = null
    let removeServiceWorkerMessageListener: (() => void) | null = null
    let removeUpdateFoundListener: (() => void) | null = null
    let stopBlockedWatcher: (() => void) | null = null
    const reload = options?.reload ?? (() => window.location.reload())

    const reloadIfSafe = () => {
        if (hasReloaded || isUpdateApplyBlocked.value) {
            reloadPending = isUpdateApplyBlocked.value
            return
        }
        hasReloaded = true
        reload()
    }

    const bindControllerChangeReload = () => {
        if (!hasServiceWorkerSupport() || removeControllerChangeListener) { return }
        const onControllerChange = () => {
            if (applyUpdateInProgress) {
                return
            }
            reloadIfSafe()
        }
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)
        removeControllerChangeListener = () => {
            navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
            removeControllerChangeListener = null
        }
    }

    const updateBannerVisibility = () => {
        showUpdateBanner.value = Boolean(registration.value?.waiting)
    }

    const attachUpdateFoundListener = () => {
        if (!registration.value || removeUpdateFoundListener) {
            return
        }
        const onUpdateFound = () => {
            const installing = registration.value?.installing
            if (!installing) {
                return
            }
            installing.addEventListener("statechange", () => {
                if (installing.state === "installed" && navigator.serviceWorker.controller) {
                    updateBannerVisibility()
                }
            })
        }
        registration.value.addEventListener("updatefound", onUpdateFound)
        removeUpdateFoundListener = () => {
            registration.value?.removeEventListener("updatefound", onUpdateFound)
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
            const timeoutMs = 4000
            const readyWithTimeout = Promise.race([
                navigator.serviceWorker.ready,
                new Promise<null>(resolve => setTimeout(() => resolve(null), timeoutMs)),
            ])
            const resolved = await readyWithTimeout
            if (resolved === null) {
                logger.warn("[PWA] serviceWorker.ready timed out — falling back to getRegistration()")
                registration.value = (await navigator.serviceWorker.getRegistration()) ?? null
            } else {
                registration.value = resolved
            }
            attachUpdateFoundListener()
            updateBannerVisibility()
            await registration.value?.update().catch(() => {})
            updateBannerVisibility()
        } catch (error) {
            logger.warn("[PWA] Unable to initialize update watcher", error)
        }
    }

    const applyUpdate = async () => {
        if (!canApplyUpdate.value) {
            return
        }

        isApplyingUpdate.value = true
        applyUpdateInProgress = true
        updateError.value = null

        try {
            // Unregister all service workers so the new version loads clean on reload.
            if (hasServiceWorkerSupport()) {
                const registrations = await navigator.serviceWorker.getRegistrations()
                for (const reg of registrations) {
                    reg.waiting?.postMessage({ type: SKIP_WAITING_MESSAGE_TYPE })
                }
                await Promise.all(registrations.map(r => r.unregister()))
            }

            // Clear all caches so the new SW precache takes effect immediately.
            if ("caches" in window) {
                const cacheNames = await caches.keys()
                await Promise.all(cacheNames.map(name => caches.delete(name)))
            }

            reloadIfSafe()
            applyUpdateInProgress = false
        } catch (error) {
            applyUpdateInProgress = false
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
    }
}
