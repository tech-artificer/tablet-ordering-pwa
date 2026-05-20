import { computed, ref, toValue, watch } from "vue"
import type { MaybeRefOrGetter } from "vue"
import { isSafeToReload, recordReloadTimestamp } from "./useSafeReload"
import { logger } from "~/utils/logger"

const SKIP_WAITING_MESSAGE_TYPE = "SKIP_WAITING" as const
const UPDATE_AVAILABLE_MESSAGE_TYPES = ["UPDATE_AVAILABLE", "APP_UPDATE_AVAILABLE", "SW_UPDATE_AVAILABLE"] as const

// Auto-update guard: max one auto-reload per session to prevent loops
const AUTO_UPDATE_APPLIED_KEY = "pwa-auto-update-applied"

// Deferred update check interval (ms)
const DEFERRED_CHECK_INTERVAL_MS = 5000

/**
 * Check if debug=pwa query param is present for staged rollout testing
 */
function isDebugPwaEnabled (): boolean {
    if (typeof window === "undefined") { return false }
    try {
        const url = new URL(window.location.href)
        return url.searchParams.get("debug") === "pwa"
    } catch {
        return false
    }
}

type UseAppUpdateOptions = {
    /** @deprecated No longer used - updates are staff-controlled only */
    isUpdateApplyBlocked?: MaybeRefOrGetter<boolean>
    reload?: () => void
    /**
     * Returns true when it is SAFE to auto-apply a pending update and reload
     * (i.e. no customer is mid-order). When false, the update is held and
     * auto-applied the moment this becomes true again. If omitted, auto-apply
     * is treated as always safe.
     */
    isSafeToReload?: MaybeRefOrGetter<boolean>
    /** Auto-apply pending updates when safe (default: true — kiosk behaviour). */
    autoApply?: boolean
    /** @deprecated Use isSafeToReload instead. Kept for backward compatibility. */
    autoReload?: boolean
}

const UPDATE_POLL_INTERVAL_MS = 60 * 1000

type WorkerMessageData = {
    type?: string
}

const hasServiceWorkerSupport = (): boolean =>
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.serviceWorker)

/**
 * Check if auto-update was already applied this session
 */
function wasAutoUpdateApplied (): boolean {
    if (typeof sessionStorage === "undefined") { return false }
    try {
        return sessionStorage.getItem(AUTO_UPDATE_APPLIED_KEY) === "1"
    } catch {
        return false
    }
}

/**
 * Mark auto-update as applied to prevent loops
 */
function markAutoUpdateApplied (): void {
    if (typeof sessionStorage === "undefined") { return }
    try {
        sessionStorage.setItem(AUTO_UPDATE_APPLIED_KEY, "1")
    } catch (e) {
        logger.debug("[AppUpdate] Failed to mark auto-update applied", e)
    }
}

/**
 * Kiosk-safe PWA update composable
 *
 * Features:
 * - Passive update detection (needRefresh)
 * - Auto-reload when safe (if autoReload enabled)
 * - Manual update control from settings page
 * - Deferred reload if currently unsafe (order in progress)
 * - Loop protection (max one auto-reload per session)
 *
 * Exposed API:
 * - needRefresh: true when update is available (for passive notice)
 * - offlineReady: true when app is cached for offline use
 * - applyUpdate: staff-controlled function to activate update (only from /settings)
 * - isAutoReloadDeferred: true when auto-reload is waiting for safe state
 */
export function useAppUpdate (options?: UseAppUpdateOptions) {
    // Core state - renamed for clearer kiosk semantics
    const needRefresh = ref(false) // True when waiting worker exists
    const offlineReady = ref(false) // True when controller exists (cached)
    const isApplyingUpdate = ref(false)
    const updateError = ref<string | null>(null)
    const isAutoReloadDeferred = ref(false) // True when waiting for safe state

    // Internal refs
    let initialized = false
    const registration = ref<ServiceWorkerRegistration | null>(null)
    let hasReloaded = false
    let removeControllerChangeListener: (() => void) | null = null
    let removeServiceWorkerMessageListener: (() => void) | null = null
    let removeUpdateFoundListener: (() => void) | null = null
    let deferredCheckTimer: ReturnType<typeof setInterval> | null = null
    const reload = options?.reload ?? (() => window.location.reload())
    // Staged rollout: auto-reload defaults to false unless explicitly enabled or debug=pwa flag is present
    const autoReloadEnabled = options?.autoReload ?? isDebugPwaEnabled()

    const autoApplyEnabled = options?.autoApply !== false
    const isSafeToReloadOption = (): boolean =>
        options?.isSafeToReload === undefined ? true : Boolean(toValue(options.isSafeToReload))
    let updatePollTimer: ReturnType<typeof setInterval> | null = null
    let skipWaitingSent = false

    // Post SKIP_WAITING to the waiting worker. Idempotent per waiting worker;
    // controllerchange (bound below) performs the actual reload.
    const postSkipWaiting = (): boolean => {
        const waiting = registration.value?.waiting
        if (!waiting) { return false }
        bindControllerChangeReload()
        waiting.postMessage({ type: SKIP_WAITING_MESSAGE_TYPE })
        skipWaitingSent = true
        return true
    }

    // Kiosk auto-apply: when a new worker is waiting AND no customer is
    // mid-order, activate it immediately. If unsafe, do nothing now — the
    // safety watcher / poll re-attempts the moment it becomes safe.
    const maybeAutoApply = (): void => {
        if (!autoApplyEnabled || skipWaitingSent) { return }
        if (!registration.value?.waiting) { return }
        if (!isSafeToReloadOption()) {
            logger.info("[PWA] Update ready — deferring (order in progress)")
            return
        }
        logger.info("[PWA] Update ready and safe — auto-applying")
        postSkipWaiting()
    }

    // Controller change always reloads - but only after staff applies update or auto-reload
    const bindControllerChangeReload = () => {
        if (!hasServiceWorkerSupport() || removeControllerChangeListener) { return }
        const onControllerChange = () => {
            if (hasReloaded) { return }
            hasReloaded = true
            reload()
        }
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)
        removeControllerChangeListener = () => {
            navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
            removeControllerChangeListener = null
        }
    }

    /**
     * Perform guarded auto-reload with safety checks and loop protection
     */
    const performGuardedReload = (): boolean => {
        // Loop protection: only one auto-reload per session
        if (wasAutoUpdateApplied()) {
            logger.info("[AppUpdate] Auto-reload already applied this session, skipping")
            return false
        }

        // Check if safe to reload
        const { safe, reason } = isSafeToReload()
        if (!safe) {
            logger.warn(`[AppUpdate] Auto-reload deferred: ${reason}`)
            isAutoReloadDeferred.value = true
            startDeferredCheck()
            return false
        }

        // Mark as applied and reload
        markAutoUpdateApplied()
        recordReloadTimestamp()
        logger.info("[AppUpdate] Performing guarded auto-reload")

        // Trigger skipWaiting first to ensure new SW activates
        if (registration.value?.waiting) {
            registration.value.waiting.postMessage({ type: SKIP_WAITING_MESSAGE_TYPE })
        }

        // Small delay to let skipWaiting propagate
        setTimeout(() => {
            hasReloaded = true
            reload()
        }, 100)

        return true
    }

    /**
     * Start periodic check for deferred reload opportunity
     */
    const startDeferredCheck = () => {
        if (deferredCheckTimer) { return } // Already checking

        logger.info("[AppUpdate] Starting deferred reload checks")

        deferredCheckTimer = setInterval(() => {
            if (!needRefresh.value) {
                // Update no longer needed, stop checking
                stopDeferredCheck()
                return
            }

            const { safe, reason } = isSafeToReload()
            if (safe) {
                logger.info("[AppUpdate] Deferred reload now safe, performing reload")
                stopDeferredCheck()
                performGuardedReload()
            } else {
                logger.debug(`[AppUpdate] Still unsafe to reload: ${reason}`)
            }
        }, DEFERRED_CHECK_INTERVAL_MS)
    }

    /**
     * Stop deferred check timer
     */
    const stopDeferredCheck = () => {
        if (deferredCheckTimer) {
            clearInterval(deferredCheckTimer)
            deferredCheckTimer = null
            isAutoReloadDeferred.value = false
        }
    }

    const updateStateFromRegistration = () => {
        const waiting = Boolean(registration.value?.waiting)
        const controlling = Boolean(registration.value?.active)
        needRefresh.value = waiting
        offlineReady.value = controlling
        maybeAutoApply()
    }

    const attachUpdateFoundListener = () => {
        if (!registration.value || removeUpdateFoundListener) { return }

        const onUpdateFound = () => {
            const installing = registration.value?.installing
            if (!installing) { return }

            installing.addEventListener("statechange", () => {
                if (installing.state === "installed" && navigator.serviceWorker.controller) {
                    updateStateFromRegistration()
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
        if (!hasServiceWorkerSupport() || removeServiceWorkerMessageListener) { return }

        const onMessage = (event: MessageEvent<WorkerMessageData>) => {
            const messageType = event?.data?.type
            if (messageType && UPDATE_AVAILABLE_MESSAGE_TYPES.includes(messageType as (typeof UPDATE_AVAILABLE_MESSAGE_TYPES)[number])) {
                needRefresh.value = true
            }
        }

        navigator.serviceWorker.addEventListener("message", onMessage)
        removeServiceWorkerMessageListener = () => {
            navigator.serviceWorker.removeEventListener("message", onMessage)
            removeServiceWorkerMessageListener = null
        }
    }

    /**
     * Initialize the update watcher
     * Call this once from app.vue on mount
     */
    const initializeAppUpdate = async () => {
        if (initialized) { return }
        initialized = true

        if (!hasServiceWorkerSupport()) {
            offlineReady.value = true // Assume ready if no SW support
            return
        }

        bindControllerChangeReload()
        attachServiceWorkerMessageListener()

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
            updateStateFromRegistration()

            // Ask the SW registration to look for a new worker now.
            await registration.value?.update().catch(() => {})
            updateStateFromRegistration()

            // Poll for a new build regularly so an unattended kiosk picks up
            // deployments without anyone touching the device.
            if (!updatePollTimer) {
                updatePollTimer = setInterval(() => { checkForUpdate().catch(() => {}) }, UPDATE_POLL_INTERVAL_MS)
            }

            // The moment ordering finishes (safe), apply any held update.
            if (options?.isSafeToReload !== undefined) {
                watch(
                    () => isSafeToReloadOption(),
                    (safe) => { if (safe) { maybeAutoApply() } }
                )
            }
        } catch (error) {
            logger.warn("[PWA] Unable to initialize update watcher", error)
        }
    }

    /**
     * Actively check the server for a new service worker. Safe to call often
     * (on a timer, on wake/visibility). Auto-applies when safe.
     */
    const checkForUpdate = async (): Promise<void> => {
        if (!hasServiceWorkerSupport()) { return }
        try {
            if (!registration.value) {
                registration.value = (await navigator.serviceWorker.getRegistration()) ?? null
            }
            await registration.value?.update().catch(() => {})
            updateStateFromRegistration()
        } catch (error) {
            logger.warn("[PWA] checkForUpdate failed", error)
        }
    }

    /**
     * Apply the pending update
     * ONLY call this from /settings page - never during ordering
     */
    const applyUpdate = async (): Promise<void> => {
        if (!registration.value?.waiting) {
            updateError.value = "No update available"
            return
        }

        isApplyingUpdate.value = true
        updateError.value = null

        try {
            postSkipWaiting()
            // Wait a moment for the controller change to trigger
            await new Promise(resolve => setTimeout(resolve, 100))
            isApplyingUpdate.value = false
        } catch (error) {
            isApplyingUpdate.value = false
            updateError.value = "Failed to apply update. Please try again."
            logger.error("[PWA] Failed to apply update", error)
            throw error
        }
    }

    const disposeAppUpdate = () => {
        removeControllerChangeListener?.()
        removeServiceWorkerMessageListener?.()
        removeUpdateFoundListener?.()
        if (updatePollTimer) {
            clearInterval(updatePollTimer)
            updatePollTimer = null
        }
        stopDeferredCheck()
        isApplyingUpdate.value = false
    }

    return {
        // Primary API for template use
        needRefresh,
        offlineReady,
        applyUpdate,
        isAutoReloadDeferred, // True when waiting for safe state to reload

        // Legacy/internal (still needed for component compatibility)
        isApplyingUpdate,
        updateError,
        initializeAppUpdate,
        disposeAppUpdate,
        checkForUpdate,

        // Deprecated - kept for transition, always true now
        canApplyUpdate: computed(() => needRefresh.value && !isApplyingUpdate.value),
        showUpdateBanner: needRefresh, // Alias for backward compatibility
    }
}
