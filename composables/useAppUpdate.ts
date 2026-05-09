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
    }
}
