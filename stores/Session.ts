import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'
import { useApi } from '../composables/useApi'
import { useOrderStore } from './Order'
import { useDeviceStore } from './Device'
import { useMenuStore } from './Menu'
import { logger } from '../utils/logger'

export const useSessionStore = defineStore('session', () => {
  const state = reactive({
    sessionId: null as number | null,
    orderId: null as number | null,
    isActive: false,
    sessionStartedAt: null as number | null,
    sessionEndsAt: null as number | null,
    remainingMs: 0,
    timerExpired: false,
  })

  const SESSION_DURATION_MS = 60 * 60 * 1000
  let sessionTimerId: number | null = null

  const stopTimerInterval = () => {
    if (sessionTimerId) {
      try { clearInterval(sessionTimerId) } catch (e) { logger.debug('[SessionStore] clearInterval failed', e) }
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
    if (sessionTimerId || typeof window === 'undefined') return
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

  async function fetchLatestSession() {
    const api = useApi();
    try {
      const { data } = await api.get('/api/session/latest')
      state.sessionId = Number(data.id) || data.id
    } catch (error: any) {
      // ignore
    }
  }

  async function start(): Promise<boolean> {
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
      if (!val && val !== 0) return null
      if (typeof val === 'number') {
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
      logger.warn('[SessionStore] fetchLatestSession failed before start:', e)
    }

    // Preload menu data so customers don't wait when ordering
    const menuStore = useMenuStore()
    try {
      console.log(`[📦 Menu Preload] Loading menus for quick response at ${timestamp}`)
      await menuStore.loadAllMenus()
      console.log(`[✅ Menu Preloaded] Ready for ordering at ${timestamp}`)
    } catch (e) {
      logger.warn('[SessionStore] preload menus failed:', e)
    }

    // Reset order store to fresh state for new dining session
    const orderStore = useOrderStore()
    orderStore.setGuestCount(2)       // Default guest count
    orderStore.clearCart()             // Clear active cart
    orderStore.clearPackage()          // Clear package selection
    orderStore.clearCurrentOrder()     // Clear current order reference

    state.isActive = true
    state.timerExpired = false
    startTimer()

    // Centralized lightweight flag to signal session is active for simple pages
    // Avoid direct localStorage writes from pages/components — use this store instead
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.setItem('session_active', '1') } catch (e) { logger.warn('[SessionStore] failed to set session_active', e) }
    }

    console.log(`[✅ Session Started] Ready for guest ordering flow at ${timestamp}`)
    logger.info('[SessionStore] Session started')

    return true
  }

  function end() {
    const timestamp = new Date().toISOString()
    const orderStore = useOrderStore()
    const currentOrderId = state.orderId
    const finalStatus = orderStore.getCurrentOrderStatus() || 'unknown'
    
    console.log(`[🔚 Session Ending] order_id=${currentOrderId} final_status=${finalStatus} at ${timestamp}`)
    logger.info('🔚 Session ending - clearing all session and order state')
    state.timerExpired = false
    clear()
    console.log(`[✅ Session Cleared] Ready for next guest at ${timestamp}`)
  }

  // Compatibility alias used by some callers
  function endSession() {
    try { return end() } catch (e) { logger.warn('[SessionStore] endSession failed', e) }
  }

  function clear() {
    const timestamp = new Date().toISOString()
    logger.debug('🧹 Clearing session state...')
    state.sessionId = null
    state.orderId = null
    state.isActive = false
    state.sessionStartedAt = null
    state.sessionEndsAt = null
    state.remainingMs = 0
    stopTimerInterval()
    
    // Reset order state when session ends
    const orderStore = useOrderStore()
    
    // Stop any active polling first
    try { orderStore.stopOrderPolling && orderStore.stopOrderPolling() } catch (e) { logger.debug('[SessionStore] stopOrderPolling failed', e) }
    
    orderStore.setGuestCount(2)
    orderStore.clearCart()
    orderStore.clearRefillItems()
    orderStore.clearSubmittedItems()
    orderStore.clearPackage()
    orderStore.clearCurrentOrder()
    orderStore.setHasPlacedOrder(false)
    orderStore.setIsRefillMode(false)
    // Note: orderStore.history is KEPT for historical tracking
    
    console.log(`[📊 State Cleared] All order/cart/package data cleared at ${timestamp}`)
    
    // Force persist to localStorage immediately to avoid hydration issues
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        // Re-save session store with cleared values
        window.localStorage.setItem('session-store', JSON.stringify({
          sessionId: null,
          orderId: null,
          isActive: false
        }))
        
        // Also persist cleared order store (matching its pick config)
        window.localStorage.setItem('order-store', JSON.stringify({
          guestCount: 2,
          package: {},
          hasPlacedOrder: false,
          currentOrder: null,
          submittedItems: [],
          isRefillMode: false,
          history: orderStore.history || [] // Keep history
        }))
        
        console.log(`[💾 Persisted] Session state saved at ${timestamp}`)
        logger.debug('✅ Session and order stores cleared and persisted')
      } catch (e) {
        logger.warn('Failed to persist cleared stores:', e)
      }
    }
    // Remove lightweight active flag from localStorage (SSR-safe)
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.removeItem('session_active') } catch (e) { logger.debug('[SessionStore] failed to remove session_active', e) }
    }
  }

  function reset() {
    // Full reset including history (for end of day or device reset)
    state.sessionId = null
    state.orderId = null
    state.isActive = false
    state.sessionStartedAt = null
    state.sessionEndsAt = null
    state.remainingMs = 0
    state.timerExpired = false
    stopTimerInterval()
    
    const orderStore = useOrderStore()
    
    // Stop any active polling first
    try { orderStore.stopOrderPolling && orderStore.stopOrderPolling() } catch (e) { logger.debug('[SessionStore] stopOrderPolling failed', e) }
    
    orderStore.setGuestCount(2)
    orderStore.clearCart()
    orderStore.clearRefillItems()
    orderStore.clearSubmittedItems()
    orderStore.clearPackage()
    orderStore.clearCurrentOrder()
    orderStore.setHasPlacedOrder(false)
    orderStore.setIsRefillMode(false)
    orderStore.clearHistory()          // Only cleared on full reset
    
    // Force persist to localStorage immediately
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('session-store', JSON.stringify({
          sessionId: null,
          orderId: null,
          isActive: false
        }))
        
        // Also persist cleared order store (full reset clears history too)
        window.localStorage.setItem('order-store', JSON.stringify({
          guestCount: 2,
          package: {},
          hasPlacedOrder: false,
          currentOrder: null,
          submittedItems: [],
          isRefillMode: false,
          history: []
        }))
        
        logger.debug('✅ Session and order stores fully reset and persisted')
      } catch (e) {
        logger.warn('Failed to persist reset stores:', e)
      }
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.removeItem('session_active') } catch (e) { logger.debug('[SessionStore] failed to remove session_active', e) }
    }
  }

  // Typed cross-store mutation helpers — avoids TypeScript Ref<T> false-positives
  // when Pinia 3 + Vue 3.5 fails to unwrap setup store return types.
  function setOrderId(id: number | null) { state.orderId = id }
  function setIsActive(val: boolean) { state.isActive = val }
  function setSessionId(id: number | null) { state.sessionId = id }
  function getOrderId(): number | null { return state.orderId }
  function getIsActive(): boolean { return state.isActive }
  function getSessionId(): number | null { return state.sessionId }

  return {
    ...toRefs(state),
    fetchLatestSession,
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
    key: 'session-store',
    storage: (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : undefined,
    pick: ['sessionId', 'isActive', 'orderId', 'sessionStartedAt', 'sessionEndsAt']
  }
})