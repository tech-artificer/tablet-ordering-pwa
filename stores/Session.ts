import { defineStore } from "pinia"
import { reactive, toRefs } from "vue"
import { useApi } from "../composables/useApi"
import { logger } from "../utils/logger"
import { useOrderStore } from "./Order"
import { useDeviceStore } from "./Device"
import { useMenuStore } from "./Menu"

// BUG-13 Fix: Simple async mutex to prevent concurrent session operations
class AsyncMutex {
    private locked = false
    private queue: Array<() => void> = []

    async lock (): Promise<void> {
        if (!this.locked) {
            this.locked = true
            return
        }
        // Wait in queue until lock is released
        return new Promise((resolve) => {
            this.queue.push(resolve)
        })
    }

    unlock (): void {
        if (this.queue.length > 0) {
            const next = this.queue.shift()
            if (next) { next() } // Release next waiting operation
        } else {
            this.locked = false
        }
    }

    async runExclusive<T> (fn: () => Promise<T>): Promise<T> {
        await this.lock()
        try {
            return await fn()
        } finally {
            this.unlock()
        }
    }
}

export const useSessionStore = defineStore("session", () => {
    const sessionMutex = new AsyncMutex()

    const state = reactive({
        sessionId: null as number | null,
        orderId: null as number | null,
        isActive: false,
        sessionStartedAt: null as number | null,
        sessionEndsAt: null as number | null,
        remainingMs: 0,
        timerExpired: false,
    })

    const SESSION_DURATION_MS = 4 * 60 * 60 * 1000 // 4 hours — matches server session_duration_seconds: 14400
    let sessionTimerId: number | null = null
    let syncResyncTimerId: number | null = null
    let _hiddenAt: number | null = null

    const stopTimerInterval = () => {
        if (sessionTimerId) {
            try { clearInterval(sessionTimerId) } catch (e) { logger.debug("[SessionStore] clearInterval failed", e) }
            sessionTimerId = null
        }
    }

    const expireSession = () => {
        state.timerExpired = true
        clear()
    }

    const updateRemaining = () => {
        if (!state.sessionEndsAt) {
            state.remainingMs = 0
            return
        }
        const remaining = Math.max(0, Number(state.sessionEndsAt) - Date.now())
        state.remainingMs = remaining
        if (remaining <= 0 && state.isActive) {
            expireSession()
        }
    }

    const startTimerInterval = () => {
        if (sessionTimerId || typeof window === "undefined") { return }
        sessionTimerId = window.setInterval(updateRemaining, 1000)
    }

    const startTimer = (durationMs: number = SESSION_DURATION_MS) => {
        const now = Date.now()
        state.sessionStartedAt = now
        state.sessionEndsAt = now + durationMs
        state.timerExpired = false
        updateRemaining()
        startTimerInterval()
    }

    const ensureTimer = () => {
        if (!state.isActive) {
            stopTimerInterval()
            return
        }
        if (!state.sessionEndsAt) {
            startTimer()
            return
        }
        updateRemaining()
        startTimerInterval()
    }

    const stopSyncResyncTimer = () => {
        if (syncResyncTimerId) {
            try { clearInterval(syncResyncTimerId) } catch (e) { logger.debug("[SessionStore] clearInterval (sync) failed", e) }
            syncResyncTimerId = null
        }
    }

    const startSyncResyncTimer = () => {
        if (syncResyncTimerId || typeof window === "undefined") { return }
        syncResyncTimerId = window.setInterval(syncFromServer, 60_000)
    }

    const _onVisibilityChange = () => {
        if (typeof document === "undefined") { return }

        if (document.hidden) {
            // Page going to background — record the time
            _hiddenAt = Date.now()
            return
        }

        // Page became visible (wake from sleep or tab focus)
        if (!state.isActive) { return }

        const hiddenMs = _hiddenAt !== null ? Date.now() - _hiddenAt : 0
        _hiddenAt = null

        // Always re-sync session timer from server
        syncFromServer()

        // Restart order polling if an order is active and we have a known order ID
        const orderStore = useOrderStore()
        if (orderStore.hasPlacedOrder) {
            const orderId = orderStore.getPollingOrderId()
            if (orderId) {
                orderStore.startOrderPolling(orderId)
            }
        }

        // Note: WebSocket reconnection is handled automatically by useBroadcasts
        // exponential-backoff state-change handler (Mission-7 Task 1.7).
        // Log the wake duration so operators can monitor sleep recovery.
        if (hiddenMs > 5 * 60 * 1000) {
            logger.warn("[Session] visibilitychange: wake after extended sleep", { hiddenMs: Math.round(hiddenMs / 1000) + "s" })
        }
    }

    const _unregisterVisibilitySync = () => {
        if (typeof window !== "undefined") {
            window.removeEventListener("visibilitychange", _onVisibilityChange)
        }
    }

    const _registerVisibilitySync = () => {
        if (typeof window !== "undefined") {
            // Remove first to prevent duplicate listeners on hot-reload
            window.removeEventListener("visibilitychange", _onVisibilityChange)
            window.addEventListener("visibilitychange", _onVisibilityChange)
        }
    }

    async function syncFromServer (): Promise<void> {
        if (!state.isActive) { return }
        const api = useApi()
        try {
            const response = await api.get("/api/session/latest")
            const responseData = response?.data ?? null
            if (!responseData) { return }
            const serverTime: string | undefined = responseData.server_time
            const sessionStartedAt: string | undefined = responseData.session_started_at
            const durationSeconds: number = responseData.session_duration_seconds ?? 14400
            if (serverTime && sessionStartedAt) {
                const serverNow = new Date(serverTime).getTime()
                const sessionStart = new Date(sessionStartedAt).getTime()
                const durationMs = durationSeconds * 1000
                const serverEndAt = sessionStart + durationMs
                // Correct for client/server clock skew
                const localOffset = Date.now() - serverNow
                const newSessionEndsAt = serverEndAt + localOffset

                // Guard against stale or cross-session data wiping an active session.
                // If the computed expiry is imminent (< 30s) but the server elapsed time
                // is less than the session duration, the /session/latest response returned
                // data for a different (older) session. Skip the update so the 1-second
                // timer doesn't fire expireSession() prematurely.
                const clientNow = Date.now()
                if (newSessionEndsAt < clientNow + 30_000) {
                    const serverElapsedMs = serverNow - sessionStart
                    if (serverElapsedMs < durationMs) {
                        logger.warn("[Session] syncFromServer: would cause premature expiry — stale session data returned, skipping sessionEndsAt update", {
                            serverNow: new Date(serverNow).toISOString(),
                            sessionStart: new Date(sessionStart).toISOString(),
                            serverElapsedMs: Math.round(serverElapsedMs / 1000) + "s",
                            durationMs: Math.round(durationMs / 1000) + "s",
                        })
                        return
                    }
                }

                state.sessionEndsAt = newSessionEndsAt
                logger.debug("[Session] syncFromServer: sessionEndsAt recalibrated", {
                    serverNow: new Date(serverNow).toISOString(),
                    sessionStart: new Date(sessionStart).toISOString(),
                    sessionEndsAt: new Date(state.sessionEndsAt).toISOString(),
                })
            }
        } catch (err: any) {
            logger.debug("[Session] syncFromServer failed (non-fatal):", err?.message)
        }
    }

    async function fetchLatestSession () {
        const api = useApi()
        const deviceStore = useDeviceStore()
        try {
            const response = await api.get("/api/session/latest")
            const responseData = response?.data ?? null
            const sessionPayload = responseData?.data ?? responseData

            if (!sessionPayload || !sessionPayload.id) {
                logger.debug("[Session] fetchLatestSession: no active session returned")
                return
            }

            const currentDeviceId = deviceStore.getDeviceId()
            const sessionDeviceId = Number(sessionPayload.device_id || 0) || null

            if (currentDeviceId && sessionDeviceId && currentDeviceId !== sessionDeviceId) {
                logger.warn("[Session] fetchLatestSession: rejected foreign session", {
                    sessionId: sessionPayload.id,
                    currentDeviceId,
                    sessionDeviceId,
                })
                return
            }

            const sessionId = Number(sessionPayload.id) || null
            if (!sessionId) {
                logger.warn("[Session] fetchLatestSession: session id is not a valid number", sessionPayload.id)
                return
            }
            state.sessionId = sessionId
            logger.debug("[Session] fetchLatestSession: assigned sessionId", sessionId)
        } catch (error: any) {
            logger.debug("[Session] fetchLatestSession error (non-fatal):", error?.message)
        }
    }

    async function start (): Promise<boolean> {
    // BUG-13 Fix: Serialize session operations to prevent race conditions
        return sessionMutex.runExclusive(async () => {
            const timestamp = new Date().toISOString()
            // Ensure device token is present and valid before starting session
            const deviceStore = useDeviceStore()

            // If no token present, try authenticate (login) the device
            if (!deviceStore.token) {
                const ok = await deviceStore.authenticate()
                if (!ok) {
                    // Authentication failed; caller should handle registration UI
                    console.log(`[❌ Device Auth Failed] Cannot start session without token at ${timestamp}`)
                    return false
                }
            }

            // Parse expiration value robustly (supports ISO string, ms, or seconds)
            const parseExpiration = (val: any): number | null => {
                if (!val && val !== 0) { return null }
                if (typeof val === "number") {
                    // if timestamp appears to be in seconds, convert to ms
                    return val < 1e12 ? val * 1000 : val
                }
                const asNumber = Number(val)
                if (!isNaN(asNumber) && asNumber !== 0) {
                    return asNumber < 1e12 ? asNumber * 1000 : asNumber
                }
                const parsed = Date.parse(String(val))
                return isNaN(parsed) ? null : parsed
            }

            const expiresAt = parseExpiration(deviceStore.expiration)
            const now = Date.now()
            const refreshBuffer = 60 * 1000 // 1 minute buffer to avoid mid-session expiry

            if (!expiresAt || now >= (expiresAt - refreshBuffer)) {
                // Token is missing/expired/near expiry — try refreshing
                console.log(`[🔄 Token Refresh] Token expired or missing, refreshing at ${timestamp}`)
                const refreshed = await deviceStore.refresh()
                if (!refreshed) {
                    // Refresh failed — require re-registration
                    console.log(`[❌ Token Refresh Failed] Cannot refresh token at ${timestamp}`)
                    return false
                }
                console.log(`[✅ Token Refreshed] Valid token obtained at ${timestamp}`)
            }

            // Fetch latest session id from server to keep local state in-sync
            try {
                await fetchLatestSession()
            } catch (e) {
                // non-fatal; proceed but log
                logger.warn("[SessionStore] fetchLatestSession failed before start:", e)
            }

            // Preload menu data so customers don't wait when ordering
            const menuStore = useMenuStore()
            try {
                console.log(`[📦 Menu Preload] Loading menus for quick response at ${timestamp}`)
                await menuStore.loadAllMenus()
                console.log(`[✅ Menu Preloaded] Ready for ordering at ${timestamp}`)
            } catch (e) {
                logger.warn("[SessionStore] preload menus failed:", e)
            }

            // Reset order store to fresh state — only when truly starting a new session.
            // If the session is already active (e.g. called again from packageSelection as an
            // auth-guard), skip the reset so the guest count and package the user already
            // set are not wiped out.
            const orderStore = useOrderStore()
            if (!state.isActive) {
                orderStore.setGuestCount(2) // Default guest count
                orderStore.clearCart()
                orderStore.clearRefillItems()
                orderStore.clearSubmittedItems()
                orderStore.clearPackage()
                orderStore.clearCurrentOrder()
                orderStore.setHasPlacedOrder(false)
                orderStore.setIsRefillMode(false)
            }

            state.isActive = true
            state.timerExpired = false
            startTimer()
            startSyncResyncTimer()
            _registerVisibilitySync()

            // Centralized lightweight flag to signal session is active for simple pages
            // Avoid direct localStorage writes from pages/components — use this store instead
            if (typeof window !== "undefined" && window.localStorage) {
                try { window.localStorage.setItem("session_active", "1") } catch (e) { logger.warn("[SessionStore] failed to set session_active", e) }
            }

            console.log(`[✅ Session Started] Ready for guest ordering flow at ${timestamp}`)
            logger.info("[SessionStore] Session started")

            return true
        }) // End mutex.runExclusive
    }

    function end () {
    // BUG-13 Fix: Synchronous wrapper calls async mutex (safe because end() is top-level)
    // Must return promise to maintain async contract
        return sessionMutex.runExclusive(async () => {
            const timestamp = new Date().toISOString()
            const orderStore = useOrderStore()
            const currentOrderId = state.orderId
            const finalStatus = orderStore.getCurrentOrderStatus() || "unknown"

            console.log(`[🔚 Session Ending] order_id=${currentOrderId} final_status=${finalStatus} at ${timestamp}`)
            logger.info("🔚 Session ending - clearing all session and order state")
            state.timerExpired = false
            await clearInternal() // Call internal version to avoid double-locking
            console.log(`[✅ Session Cleared] Ready for next guest at ${timestamp}`)
        })
    }

    // Internal clear function (not mutex-protected, called by end() which is already locked)
    async function clearInternal () {
        const timestamp = new Date().toISOString()
        logger.debug("🧹 Clearing session state...")
        state.sessionId = null
        state.orderId = null
        state.isActive = false
        state.sessionStartedAt = null
        state.sessionEndsAt = null
        state.remainingMs = 0
        stopTimerInterval()
        stopSyncResyncTimer()
        _unregisterVisibilitySync()

        // Reset order state when session ends
        const orderStore = useOrderStore()

        // Stop any active polling first
        try { orderStore.stopOrderPolling && orderStore.stopOrderPolling() } catch (e) { logger.debug("[SessionStore] stopOrderPolling failed", e) }

        orderStore.setGuestCount(2)
        orderStore.clearCart()
        orderStore.clearRefillItems()
        orderStore.clearSubmittedItems()
        orderStore.clearPackage()
        orderStore.clearCurrentOrder()
        orderStore.setHasPlacedOrder(false)
        orderStore.setIsRefillMode(false)
        // Note: orderStore.history is KEPT for historical tracking

        logger.info(`[Session] State cleared at ${timestamp}`)

        // Force persist to localStorage immediately to avoid hydration issues
        if (typeof window !== "undefined" && window.localStorage) {
            try {
                // Re-save session store with cleared values
                window.localStorage.setItem("session-store", JSON.stringify({
                    sessionId: null,
                    orderId: null,
                    isActive: false
                }))

                // Also persist cleared order store (matching its pick config)
                window.localStorage.setItem("order-store", JSON.stringify({
                    guestCount: 2,
                    package: null,
                    hasPlacedOrder: false,
                    currentOrder: null,
                    submittedItems: [],
                    isRefillMode: false,
                    history: orderStore.getHistory() // Keep history
                }))

                logger.debug(`[Session] Cleared state persisted at ${timestamp}`)
                logger.debug("✅ Session and order stores cleared and persisted")
            } catch (e) {
                logger.warn("Failed to persist cleared stores:", e)
            }
        }
        // Remove lightweight active flag from localStorage (SSR-safe)
        if (typeof window !== "undefined" && window.localStorage) {
            try { window.localStorage.removeItem("session_active") } catch (e) { logger.debug("[SessionStore] failed to remove session_active", e) }
        }
        // Clear persisted idempotency key — prevents previous-session key leaking into next order attempt
        if (typeof sessionStorage !== "undefined") {
            try { sessionStorage.removeItem("woosoo_order_idem_key") } catch (e) { logger.debug("[SessionStore] failed to clear idempotency key", e) }
        }
        // Clear offline order queue — queued orders must not survive session end (session boundary safety)
        if (typeof localStorage !== "undefined") {
            try { localStorage.removeItem("woosoo_order_queue") } catch (e) { logger.debug("[SessionStore] failed to clear offline order queue", e) }
        }
    }

    // Public clear function with mutex protection
    function clear () {
        return sessionMutex.runExclusive(async () => {
            await clearInternal()
        })
    }

    // Compatibility alias used by some callers
    function endSession () {
        try { return end() } catch (e) { logger.warn("[SessionStore] endSession failed", e) }
    }

    function reset () {
    // BUG-13 Fix: Protect reset with mutex
        return sessionMutex.runExclusive(async () => {
            // Full reset including history (for end of day or device reset)
            state.sessionId = null
            state.orderId = null
            state.isActive = false
            state.sessionStartedAt = null
            state.sessionEndsAt = null
            state.remainingMs = 0
            state.timerExpired = false
            stopTimerInterval()
            stopSyncResyncTimer()
            _unregisterVisibilitySync()

            const orderStore = useOrderStore()

            // Stop any active polling first
            try { orderStore.stopOrderPolling && orderStore.stopOrderPolling() } catch (e) { logger.debug("[SessionStore] stopOrderPolling failed", e) }

            orderStore.setGuestCount(2)
            orderStore.clearCart()
            orderStore.clearRefillItems()
            orderStore.clearSubmittedItems()
            orderStore.clearPackage()
            orderStore.clearCurrentOrder()
            orderStore.setHasPlacedOrder(false)
            orderStore.setIsRefillMode(false)
            orderStore.clearHistory()

            // Force persist to localStorage immediately
            if (typeof window !== "undefined" && window.localStorage) {
                try {
                    window.localStorage.setItem("session-store", JSON.stringify({
                        sessionId: null,
                        orderId: null,
                        isActive: false
                    }))

                    // Also persist cleared order store (full reset clears history too)
                    window.localStorage.setItem("order-store", JSON.stringify({
                        guestCount: 2,
                        package: null,
                        hasPlacedOrder: false,
                        currentOrder: null,
                        submittedItems: [],
                        isRefillMode: false,
                        history: []
                    }))

                    logger.debug("✅ Session and order stores fully reset and persisted")
                } catch (e) {
                    logger.warn("Failed to persist reset stores:", e)
                }
            }
            if (typeof window !== "undefined" && window.localStorage) {
                try { window.localStorage.removeItem("session_active") } catch (e) { logger.debug("[SessionStore] failed to remove session_active", e) }
            }
        }) // End mutex.runExclusive
    }

    // Typed cross-store mutation helpers — avoids TypeScript Ref<T> false-positives
    // when Pinia 3 + Vue 3.5 fails to unwrap setup store return types.
    function setOrderId (id: number | null) { state.orderId = id }
    function setIsActive (val: boolean) { state.isActive = val }
    function setSessionId (id: number | null) { state.sessionId = id }
    function getOrderId (): number | null { return state.orderId }
    function getIsActive (): boolean { return state.isActive }
    function getSessionId (): number | null { return state.sessionId }

    return {
        ...toRefs(state),
        fetchLatestSession,
        syncFromServer,
        start,
        end,
        endSession,
        clear,
        reset,
        startTimer,
        ensureTimer,
        setOrderId,
        setIsActive,
        setSessionId,
        getOrderId,
        getIsActive,
        getSessionId,
    }
}, {
    persist: {
        key: "session-store",
        storage: (typeof window !== "undefined" && window.localStorage) ? window.localStorage : undefined,
        pick: ["sessionId", "isActive", "orderId", "sessionStartedAt", "sessionEndsAt"]
    }
})
