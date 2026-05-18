/**
 * Safe Reload Composable
 *
 * Determines if it's safe to reload the app without interrupting
 * an in-progress order or causing data loss.
 *
 * Safety criteria:
 * - No order submission in progress (orderStore.isSubmitting === false)
 * - No pending API requests (tracked via axios interceptor)
 * - Order state can be recovered via /recovery if session is active
 *
 * The tablet can safely reload during an active dining session because
 * the /recovery flow will restore the session on reload.
 */

import { readonly, ref } from "vue"
import type { Ref } from "vue"
import { logger } from "~/utils/logger"
import { useOrderStore } from "~/stores/Order"

// Track pending API requests
const pendingRequests = ref(0)

// Minimum time between reloads to prevent loops (30 seconds)
const MIN_RELOAD_INTERVAL_MS = 30 * 1000
const LAST_RELOAD_KEY = "pwa-last-reload-ts"

/**
 * Increment pending request counter
 * Called by axios interceptor before each request
 */
export function incrementPendingRequests (): void {
    pendingRequests.value++
}

/**
 * Decrement pending request counter
 * Called by axios interceptor after each response/error
 */
export function decrementPendingRequests (): void {
    pendingRequests.value = Math.max(0, pendingRequests.value - 1)
}

/**
 * Check if enough time has passed since last reload to prevent loops
 */
function hasReloadCooldownPassed (): boolean {
    if (typeof sessionStorage === "undefined") { return true }

    try {
        const lastReload = parseInt(sessionStorage.getItem(LAST_RELOAD_KEY) || "0", 10)
        if (!lastReload) { return true }

        const elapsed = Date.now() - lastReload
        return elapsed >= MIN_RELOAD_INTERVAL_MS
    } catch {
        return true
    }
}

/**
 * Record that a reload is happening to prevent loops
 */
export function recordReloadTimestamp (): void {
    if (typeof sessionStorage === "undefined") { return }

    try {
        sessionStorage.setItem(LAST_RELOAD_KEY, Date.now().toString())
    } catch (e) {
        logger.debug("[SafeReload] Failed to record reload timestamp", e)
    }
}

/**
 * Check if it's safe to reload the app
 *
 * Unsafe conditions:
 * - Order submission in progress (isSubmitting === true)
 * - Pending API requests (network operations in flight)
 * - Reload cooldown not passed (loop protection)
 *
 * Safe conditions (reload will use /recovery):
 * - Active session (isActive === true) - session restores via recovery
 * - Draft items in cart - cart persists to localStorage
 * - Refill mode - order state persists
 */
export function isSafeToReload (): { safe: boolean; reason: string | null } {
    // Check loop protection first
    if (!hasReloadCooldownPassed()) {
        return { safe: false, reason: "reload_cooldown" }
    }

    // Check for pending API requests
    if (pendingRequests.value > 0) {
        return { safe: false, reason: "pending_requests" }
    }

    // Check order submission in progress
    // We need to access the store state to check if an order is being submitted
    try {
        const orderStore = useOrderStore()
        if (orderStore.isSubmitting) {
            return { safe: false, reason: "order_submitting" }
        }
    } catch {
        // If store is not available (e.g., during SSR or before pinia init), assume safe
    }

    return { safe: true, reason: null }
}

/**
 * Composable for safe reload functionality
 */
export function useSafeReload () {
    /**
     * Perform a guarded reload if safe, or defer if unsafe
     *
     * @param options.force - Force reload even if unsafe (use with caution)
     * @param options.onUnsafe - Callback when reload is deferred
     * @returns true if reload was triggered, false if deferred
     */
    const guardedReload = (options?: { force?: boolean; onUnsafe?: (reason: string) => void }): boolean => {
        const { safe, reason } = isSafeToReload()

        if (!safe && !options?.force) {
            logger.warn(`[SafeReload] Reload deferred: ${reason}`)
            options?.onUnsafe?.(reason || "unknown")
            return false
        }

        // Record reload timestamp for loop protection
        recordReloadTimestamp()

        logger.info("[SafeReload] Performing guarded reload")
        window.location.reload()
        return true
    }

    /**
     * Check if reload is safe without performing it
     */
    const checkSafe = (): { safe: boolean; reason: string | null } => {
        return isSafeToReload()
    }

    /**
     * Get the number of pending API requests
     */
    const pendingCount = readonly(pendingRequests)

    return {
        guardedReload,
        checkSafe,
        pendingCount,
        recordReloadTimestamp,
        incrementPendingRequests,
        decrementPendingRequests,
    }
}
