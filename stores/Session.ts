import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'
import { useApi } from '../composables/useApi'
import { useOrderStore } from './order'
import { useDeviceStore } from './device'
import { useMenuStore } from './menu'
import { logger } from '../utils/logger'

export const useSessionStore = defineStore('session', () => {
  const state = reactive({
    sessionId: null as number | null,
    orderId: null as number | null,
    isActive: false as boolean
  })

  async function fetchLatestSession() {
    const $api = useApi();
    try {
      const { data } = await $api('/api/session/latest', { method: 'GET' })
      state.sessionId = Number(data.id) || data.id
    } catch (error: any) {
      // ignore
    }
  }

  async function start(): Promise<boolean> {
    // Ensure device token is present and valid before starting session
    const deviceStore = useDeviceStore()

    // If no token present, try authenticate (login) the device
    if (!deviceStore.token) {
      const ok = await deviceStore.authenticate()
      if (!ok) {
        // Authentication failed; caller should handle registration UI
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
      const refreshed = await deviceStore.refresh()
      if (!refreshed) {
        // Refresh failed — require re-registration
        return false
      }
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
      await menuStore.loadAllMenus()
    } catch (e) {
      logger.warn('[SessionStore] preload menus failed:', e)
    }

    // Reset order store to fresh state for new dining session
    const orderStore = useOrderStore()
    orderStore.setGuestCount(2)       // Default guest count
    orderStore.cartItems = []          // Clear active cart
    orderStore.package = {} as any     // Clear package selection
    orderStore.currentOrder = null     // Clear current order reference

    state.isActive = true

    // Centralized lightweight flag to signal session is active for simple pages
    // Avoid direct localStorage writes from pages/components — use this store instead
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.setItem('session_active', '1') } catch (e) { logger.warn('[SessionStore] failed to set session_active', e) }
    }

    return true
  }

  function end() {
    logger.info('🔚 Session ending - clearing all session and order state')
    clear()
  }

  // Compatibility alias used by some callers
  function endSession() {
    try { return end() } catch (e) { logger.warn('[SessionStore] endSession failed', e) }
  }

  function clear() {
    logger.debug('🧹 Clearing session state...')
    state.sessionId = null
    state.orderId = null
    state.isActive = false
    
    // Reset order state when session ends
    const orderStore = useOrderStore()
    
    // Stop any active polling first
    try { orderStore.stopOrderPolling && orderStore.stopOrderPolling() } catch (e) { /* ignore */ }
    
    orderStore.setGuestCount(2)
    orderStore.cartItems = []
    orderStore.refillItems = []
    orderStore.submittedItems = []
    orderStore.package = {} as any
    orderStore.currentOrder = null
    orderStore.hasPlacedOrder = false
    orderStore.isRefillMode = false
    // Note: orderStore.history is KEPT for historical tracking
    
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
        
        logger.debug('✅ Session and order stores cleared and persisted')
      } catch (e) {
        logger.warn('Failed to persist cleared stores:', e)
      }
    }
    // Remove lightweight active flag from localStorage (SSR-safe)
    if (typeof window !== 'undefined' && window.localStorage) {
      try { window.localStorage.removeItem('session_active') } catch (e) { /* ignore */ }
    }
  }

  function reset() {
    // Full reset including history (for end of day or device reset)
    state.sessionId = null
    state.orderId = null
    state.isActive = false
    
    const orderStore = useOrderStore()
    
    // Stop any active polling first
    try { orderStore.stopOrderPolling && orderStore.stopOrderPolling() } catch (e) { /* ignore */ }
    
    orderStore.setGuestCount(2)
    orderStore.cartItems = []
    orderStore.refillItems = []
    orderStore.submittedItems = []
    orderStore.package = {} as any
    orderStore.currentOrder = null
    orderStore.hasPlacedOrder = false
    orderStore.isRefillMode = false
    orderStore.history = []  // Only cleared on full reset
    
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
      try { window.localStorage.removeItem('session_active') } catch (e) { /* ignore */ }
    }
  }

  return {
    ...toRefs(state),
    fetchLatestSession,
    start,
    end,
    endSession,
    clear,
    reset
  }
}, {
  persist: {
    key: 'session-store',
    storage: (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : undefined,
    pick: ['sessionId', 'isActive', 'orderId']
  }
})