import { defineStore } from 'pinia'
import { reactive, computed, toRefs } from 'vue'
import { useApi } from '../composables/useApi'
import { logger } from '../utils/logger'
import { notifyBlockedAction } from '../composables/useNotifier'
import type { CartItem, Package, MenuItem } from '../types'

export const useOrderStore = defineStore('order', () => {
  const state = reactive({
    cartItems: [] as CartItem[],
    refillItems: [] as CartItem[], // Separate cart for refills
    submittedItems: [] as any[], // Items from the last submitted order (with names for display)
    package: {} as Package,
    guestCount: 2 as number,
    currentOrder: null as any | null,
    history: [] as any[],
    isRefillMode: false as boolean, // Track if we're in refill mode
    hasPlacedOrder: false as boolean, // Track if initial order was placed
    isSubmitting: false as boolean, // Centralized submission flag
    // Polling fallback state (5s interval)
    isPolling: false as boolean,
    pollTimerId: null as number | null,
    pollInflight: false as boolean,
    pollingOrderId: null as string | null
  })

  const getCartItemQuantity = (id: number) => {
    const items = state.isRefillMode ? state.refillItems : state.cartItems
    return items.find(i => i.id === id)?.quantity ?? 0
  }
  
  const getPackage = computed(() => state.package)
  const getPackageModifiers = computed(() => (state.package as any).modifiers)
  
  // Refill-specific getters
  const refillTotal = computed(() =>
    state.refillItems.reduce((sum, it: any) => sum + Number(it.price || 0) * Number(it.quantity || 0), 0)
  )
  
  const activeCart = computed(() => state.isRefillMode ? state.refillItems : state.cartItems)

  const packageTotal = computed(() => Number(state.package?.price || 0) * Number(state.guestCount || 1))

  const addOnsTotal = computed(() =>
    state.cartItems.reduce((sum, it: any) => sum + Number(it.price || 0) * Number(it.quantity || 0), 0)
  )

  const taxAmount = computed(() => {
    if (!(state.package as Package)?.is_taxable) return 0
    const packageTotalVal = Number(state.package?.price || 0) * Number(state.guestCount || 1)
    const addOns = addOnsTotal.value
    const taxRate = Number((state.package as Package)?.tax?.percentage || 0)
    return ((packageTotalVal + addOns) * taxRate) / 100
  })

  const grandTotal = computed(() => packageTotal.value + addOnsTotal.value + taxAmount.value)

  function setPackage(pkg: Package) { state.package = pkg }

  function setGuestCount(count: number) {
    state.guestCount = Math.max(2, Math.min(20, Number(count)))
  }

  function addToCart(item: MenuItem, opts?: { isUnlimited?: boolean; category?: string }) {
    if (state.hasPlacedOrder && !state.isRefillMode) {
      logger.warn('addToCart blocked: initial order already placed; use refill mode to add items')
      notifyBlockedAction()
      return
    }

    if ((state.package as Package)?.id === item.id) {
      state.guestCount = Number(state.guestCount) + 1
      return
    }
    
    const UNLIMITED_ITEM_CAP = 5
    const targetCart = state.isRefillMode ? state.refillItems : state.cartItems
    const existing = targetCart.find(i => i.id === item.id)
    
    if (existing) {
      const isUnlimited = Boolean(existing.isUnlimited || opts?.isUnlimited)
      const max = isUnlimited ? UNLIMITED_ITEM_CAP : 99
      existing.quantity = Math.min(Number(existing.quantity) + 1, max)
    } else {
      const newItem = {
        id: Number(item.id),
        name: item.name,
        img_url: (item as MenuItem).img_url || '',
        price: Number((item as MenuItem).price || 0),
        quantity: 1,
        isUnlimited: Boolean(opts?.isUnlimited),
        category: opts?.category || null
      } as any
      
      if (state.isRefillMode) {
        state.refillItems.push(newItem)
      } else {
        state.cartItems.push(newItem)
      }
    }
  }

  function updateQuantity(id: number, quantity: number) {
    if (state.hasPlacedOrder && !state.isRefillMode) {
      logger.warn('updateQuantity blocked: initial order already placed; use refill mode to modify items')
      notifyBlockedAction()
      return
    }

    if ((state.package as any)?.id === id) {
      state.guestCount = Math.max(2, Number(quantity))
      return
    }
    
    const targetCart = state.isRefillMode ? state.refillItems : state.cartItems
    const existing = targetCart.find(i => i.id === id)
    if (!existing) return
    
    const UNLIMITED_ITEM_CAP = 5
    const max = existing.isUnlimited ? UNLIMITED_ITEM_CAP : 99
    const q = Math.min(Math.max(0, Number(quantity)), max)
    existing.quantity = q
    if (existing.quantity <= 0) remove(id)
  }

  function remove(id: number) {
    if (state.hasPlacedOrder && !state.isRefillMode) {
      logger.warn('remove blocked: initial order already placed; use refill mode to remove items')
      notifyBlockedAction()
      return
    }

    if ((state.package as any)?.id === id) {
      state.package = {} as Package
      return
    }
    
    if (state.isRefillMode) {
      state.refillItems = state.refillItems.filter(i => i.id !== id)
    } else {
      state.cartItems = state.cartItems.filter(i => i.id !== id)
    }
  }
  
  function clearRefillCart() {
    state.refillItems = []
  }
  
  function toggleRefillMode(enabled: boolean) {
    // Prevent entering refill mode if no initial order placed
    if (enabled && !state.hasPlacedOrder) {
      logger.warn('toggleRefillMode blocked: cannot enter refill mode before placing initial order')
      notifyBlockedAction('Cannot enter Refill mode until initial order is placed')
      return
    }

    state.isRefillMode = enabled
    if (enabled) {
      state.refillItems = []
    }
  }

  function buildPayload() {
    const items = state.cartItems.map((i: any) => ({
      menu_id: Number(i.id),
      ordered_menu_id: i.category === 'meats' ? (state.package as any)?.id : null,
      name: i.name,
      quantity: Number(i.quantity),
      price: Number(i.price),
      note: i.note ?? null,
      subtotal: Number(i.price) * Number(i.quantity),
      tax: 0,
      discount: 0
    }))
    
    const payload = {
      guest_count: Number(state.guestCount),
      subtotal: Number(packageTotal.value) + Number(addOnsTotal.value),
      tax: Number(taxAmount.value),
      discount: 0,
      total_amount: Number(grandTotal.value),
      items
    }
    
    // Validate payload structure
    logger.debug('🔍 Validating payload structure...')
    
    if (!payload.guest_count || payload.guest_count < 1) {
      throw new Error('Invalid guest_count: must be at least 1')
    }
    
    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('Invalid items: must be a non-empty array')
    }
    
    payload.items.forEach((item, index) => {
      if (!item.menu_id || typeof item.menu_id !== 'number') {
        throw new Error(`Invalid item[${index}].menu_id: must be a number`)
      }
      if (!item.name || typeof item.name !== 'string') {
        throw new Error(`Invalid item[${index}].name: must be a non-empty string`)
      }
      if (!item.quantity || item.quantity < 1) {
        throw new Error(`Invalid item[${index}].quantity: must be at least 1`)
      }
      if (typeof item.price !== 'number' || item.price < 0) {
        throw new Error(`Invalid item[${index}].price: must be a non-negative number`)
      }
    })
    
    logger.debug('✅ Payload validation passed')
    return payload
  }

  async function submitOrder(payload?: any) {
    if (state.hasPlacedOrder && !state.isRefillMode) {
      throw new Error('An initial order has already been placed for this session. Use refill instead.')
    }
    state.isSubmitting = true
    // 🔒 VALIDATION: Ensure everything is set before submitting
    const { useDeviceStore } = await import('./device')
    const deviceStore = useDeviceStore()
    
    logger.debug('🔍 Pre-submission validation:', {
      hasPackage: !!state.package?.id,
      packageId: state.package?.id,
      guestCount: state.guestCount,
      cartItemsCount: state.cartItems.length,
      isAuthenticated: deviceStore.isAuthenticated
    })
    
    // ❌ Validation checks
    if (!deviceStore.token) {
      throw new Error('❌ Device not authenticated - missing token. Please register device first.')
    }
    
    // Check table assignment - handle both ref and direct value from persist
    // deviceStore.table is a Ref, but after persist reload it might be a plain object
    const tableData = deviceStore.table?.value || deviceStore.table
    const tableId = (tableData as any)?.id
    const tableName = (tableData as any)?.name
    
    logger.debug('🔍 Table validation:', { tableId, tableName })
    
    if (!tableId) {
      logger.error('❌ Table validation failed - no table ID found')
      throw new Error('❌ No table assigned to this device. Please contact staff.')
    }
    logger.debug('✅ Table validated:', tableName)
    
    if (!state.package?.id) {
      throw new Error('❌ No package selected. Please select a package first.')
    }
    
    if (state.guestCount < 1) {
      throw new Error('❌ Guest count must be at least 1.')
    }
    
    logger.debug('✅ All validations passed - proceeding with order submission')
    
    const api = useApi()
    const body = payload ?? buildPayload()
    
    logger.debug('📦 Order Payload:', body)
    
    try {
      const idempotencyKey = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `idemp-${Date.now()}-${Math.random().toString(36).slice(2,10)}`
      const resp = await api.post('/api/devices/create-order', body, { headers: { 'X-Idempotency-Key': idempotencyKey } })
      logger.info('✅ Order submission SUCCESS')
      logger.debug('📥 Response:', resp.data)
      
      // Update session with order ID from response
      const { useSessionStore } = await import('./session')
      const sessionStore = useSessionStore()
      
      // Check for success flag first
      if (!resp.data?.success) {
        logger.error('❌ Server returned success=false:', resp.data)
        throw new Error(resp.data?.message || 'Order processing failed on server')
      }
      
      // Only mark as placed if we get order_number or order_id from server
      const orderNumber = resp.data?.order?.order_number
      const orderId = resp.data?.order?.id
      
      logger.debug('🔍 Order created:', { orderNumber, orderId })
      
      if (orderNumber || orderId) {
        // Centralize marking order created
        await setOrderCreated(resp.data)
      } else {
        logger.error('❌ Missing order identifiers in response:', resp.data)
        throw new Error('Order confirmation failed: No order ID received from server')
      }
      
      return resp.data
    } catch (error: any) {
      logger.error('❌ Order submission failed:', error.message)
      
      // Handle authentication errors specifically
      if (error.response?.status === 401 || error.response?.data?.exception === 'authentication') {
        logger.error('🔐 Authentication error - token invalid or expired')
        throw new Error('❌ Your session has expired. Please re-register this device in Settings.')
      }
      
      // Handle validation errors
      if (error.response?.status === 422) {
        const validationErrors = error.response?.data?.errors
        logger.error('📋 Validation errors:', validationErrors)
        const errorMessages = Object.values(validationErrors || {}).flat().join(', ')
        throw new Error(`❌ Validation failed: ${errorMessages}`)
      }
      
      // Handle server errors with debugging guidance
      if (error.response?.status === 500) {
        const serverMessage = error.response?.data?.message || 'Internal server error'
        logger.error('🔴 SERVER ERROR (500) - Backend crashed')
        
        throw new Error(
          `❌ ${serverMessage}\n\n` +
          `🔧 Backend debugging needed:\n` +
          `1. Check Laravel logs (storage/logs/laravel.log)\n` +
          `2. Enable APP_DEBUG=true in .env\n` +
          `3. Verify database schema and OrderService\n\n` +
          `Use Settings > Backend Diagnostics to test directly.`
        )
      }
      
      // Handle network errors
      if (!error.response) {
        throw new Error('❌ Network error: Cannot reach backend server. Check if Laravel is running.')
      }
      
      throw error
    } finally {
      state.isSubmitting = false
    }
  }
  
  async function submitRefill(payload?: any) {
    if (!state.currentOrder && !state.hasPlacedOrder) {
      throw new Error('No existing order found — cannot submit a refill.')
    }
    state.isSubmitting = true
    const api = useApi()
    
    // Use order_id (business ID) - goes in URL path
    const currentOrderId = state.currentOrder?.order?.order_id || state.currentOrder?.order?.id || state.currentOrder?.order_id || state.currentOrder?.id
    
    if (!currentOrderId) {
      state.isSubmitting = false
      throw new Error('Cannot submit refill: missing order ID')
    }
    
    // Build payload matching POST /api/order/{orderId}/refill spec
    const refillPayload = {
      items: state.refillItems.map((i: any, index: number) => ({
        menu_id: i.id ? Number(i.id) : undefined,
        name: i.name,
        quantity: Number(i.quantity),
        price: i.price !== undefined ? Number(i.price) : undefined,
        index: index + 1,
        seat_number: 1,
        note: i.note || 'Refill'
      }))
    }
    
    console.log('[Refill] Submitting to /api/order/' + currentOrderId + '/refill', refillPayload)
    
    try {
      const idempotencyKey = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `idemp-${Date.now()}-${Math.random().toString(36).slice(2,10)}`
      const resp = await api.post(`/api/order/${currentOrderId}/refill`, payload ?? refillPayload, { headers: { 'X-Idempotency-Key': idempotencyKey } })
      state.refillItems = []
      state.isRefillMode = false
      state.history = [...state.history, { ...resp.data, type: 'refill' }]
      console.log('[Refill] Success:', resp.data)
      return resp.data
    } catch (error: any) {
      console.error('[Refill] Failed:', error?.response?.data || error)
      throw error
    } finally {
      state.isSubmitting = false
    }
  }

  async function setOrderCreated(respData: any) {
    const { useSessionStore } = await import('./session')
    const sessionStore = useSessionStore()

    const orderNumber = respData?.order?.order_number || respData?.order_number || respData?.order?.id
    // Use order_id (business ID like 19583), not order_number or internal id
    const orderId = respData?.order?.order_id || respData?.order_id || respData?.order?.id || respData?.id

    // Store the numeric order_id in session for API lookups
    sessionStore.orderId = orderId
    state.hasPlacedOrder = true
    state.currentOrder = respData
    
    // Save submitted items with names before clearing cart (for display in sidebar)
    // Backend order_items may not include names, so we keep our local copy
    state.submittedItems = state.cartItems.map((item: any) => ({
      id: item.id,
      menu_id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      img_url: item.img_url || item.image,
      category: item.category,
      is_unlimited: item.is_unlimited
    }))
    
    state.cartItems = []
    state.history = [...state.history, respData]

    logger.info('✅ Order marked created:', { orderId: sessionStore.orderId, orderNumber, submittedItemsCount: state.submittedItems.length })
    // Start polling fallback by order_id (only triggered when order is created)
    try {
      // Use order_id (business ID like 19561), not the database id
      const resolvedOrderId = respData?.order?.order_id || respData?.order_id || respData?.order?.id || respData?.id || sessionStore.orderId
      logger.debug('🔄 Starting polling with order_id:', resolvedOrderId)
      if (resolvedOrderId) {
        // Start a lightweight poller that fetches canonical order by order_id every 5s
        // This is used as a fallback in case realtime broadcasts are delayed/unavailable
        startOrderPolling(resolvedOrderId)
      } else {
        logger.warn('setOrderCreated: could not resolve order_id to start polling')
      }
    } catch (err) {
      logger.warn('setOrderCreated: failed to start polling', err)
    }
  }

  // Polling: fixed 5s interval, only started when an order is created
  function stopOrderPolling() {
    try {
      if (state.pollTimerId) {
        clearInterval(state.pollTimerId as any)
      }
    } catch (e) {
      // ignore
    }
    state.pollTimerId = null
    state.isPolling = false
    state.pollInflight = false
    state.pollingOrderId = null
    logger.debug('✅ Order polling stopped')
  }

  function startOrderPolling(orderIdentifier: number | string) {
    const orderId = String(orderIdentifier)
    if (!orderId || orderId === 'null' || orderId === 'undefined') {
      logger.warn('startOrderPolling: invalid order id', orderIdentifier)
      return
    }

    // If already polling same order, no-op
    if (state.isPolling && state.pollingOrderId === orderId) {
      logger.debug('startOrderPolling: already polling order', orderId)
      return
    }

    // Clear any existing poll first
    stopOrderPolling()

    // Only poll when online
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      logger.warn('startOrderPolling: offline — skipping start')
      return
    }

    state.isPolling = true
    state.pollingOrderId = orderId

    const tick = async () => {
      if (state.pollInflight) return
      state.pollInflight = true
      try {
        const api = useApi()
        if (!api || typeof (api as any).get !== 'function') {
          logger.warn('startOrderPolling: api client unavailable — stopping order polling')
          stopOrderPolling()
          return
        }
        const url = `api/device-order/by-order-id/${orderId}`
        const resp = await api.get(url)
        // Normalize returned order object
        const orderObj = resp.data?.order || resp.data?.data || resp.data
        if (orderObj) {
          // Update currentOrder to canonical server resource
          state.currentOrder = { order: orderObj }
          state.hasPlacedOrder = true
          // Persist session order id if missing
          try {
            const { useSessionStore } = await import('./session')
            const sessionStore = useSessionStore()
            sessionStore.orderId = orderObj?.order_id || orderObj?.id || sessionStore.orderId
          } catch (e) {
            // ignore
          }

          // Stop polling if terminal status observed
          const status = orderObj?.status
          if (status === 'completed' || status === 'cancelled' || status === 'voided') {
            stopOrderPolling()
            
            // End session and navigate to home on completed status
            if (status === 'completed') {
              try {
                const { useSessionStore } = await import('./session')
                const sessionStore = useSessionStore()
                
                // Small delay to allow any final UI updates. Await session end
                // and clear order state immediately to avoid a refill UI loop.
                setTimeout(async () => {
                  try {
                    // Load fresh session store instance and call end
                    const { useSessionStore } = await import('./session')
                    const sessionStore = useSessionStore()

                    // If end returns a promise, await it
                    try {
                      const res = sessionStore.end && sessionStore.end()
                      if (res && typeof (res as any).then === 'function') await res
                    } catch (e) {
                      logger.warn('sessionStore.end() threw:', e)
                    }

                    // Immediately clear local order state to prevent UI flicker/loop
                    try {
                      state.cartItems = []
                      state.refillItems = []
                      state.submittedItems = []
                      state.package = {} as any
                      state.currentOrder = null
                      state.hasPlacedOrder = false
                      state.isRefillMode = false
                    } catch (e) {
                      logger.warn('Failed to clear order state after completion:', e)
                    }

                    // Navigate to home page without reload to preserve fullscreen
                    const nuxtApp = useNuxtApp()
                    await nuxtApp.$router.replace('/')
                  } catch (e) {
                    logger.warn('Failed to end session on order completion:', e)
                  }
                }, 2000)
              } catch (e) {
                logger.warn('Failed to end session on order completion:', e)
              }
            }
          }
        }
      } catch (error) {
        logger.warn('Order polling tick failed:', error)
      } finally {
        state.pollInflight = false
      }
    }

    // Run immediately, then every 5s
    tick().catch(() => {})
    const timerId = setInterval(() => tick().catch(() => {}), 5000) as unknown as number
    state.pollTimerId = timerId
    logger.info('✅ Order polling started for', orderId)
  }

  async function initializeFromSession() {
    const { useSessionStore } = await import('./session')
    const sessionStore = useSessionStore()
    
    logger.debug('🔁 initializeFromSession called:', {
      sessionOrderId: sessionStore.orderId,
      stateHasPlacedOrder: state.hasPlacedOrder,
      stateCurrentOrder: !!state.currentOrder
    })
    
    // If no orderId in session, reset stale hasPlacedOrder flag after a short grace
    if (!sessionStore.orderId) {
      if (state.hasPlacedOrder || state.currentOrder || state.isRefillMode) {
        logger.info('🔁 No session.orderId found, resetting stale order state (with grace)')
        // Apply a short grace period to avoid clearing during quick transitions
        await new Promise(resolve => setTimeout(resolve, 1500))
        // Re-check the session store in case orderId was set during grace
        const { useSessionStore: useSessionStore2 } = await import('./session')
        const refreshed = useSessionStore2()
        if (!refreshed.orderId) {
          state.hasPlacedOrder = false
          state.currentOrder = null
          state.isRefillMode = false
          state.submittedItems = []
        } else {
          logger.debug('initializeFromSession: session.orderId appeared during grace, skipping clear')
        }
      }
      return
    }
    
    // Mark order as placed locally and attempt to fetch canonical order details
    state.hasPlacedOrder = true
    try {
      const api = useApi()
      const orderIdStr = String(sessionStore.orderId)
      if (orderIdStr && orderIdStr !== 'null' && orderIdStr !== 'undefined') {
        const resp = await api.get(`api/device-order/by-order-id/${orderIdStr}`)
        const orderObj = resp.data?.order || resp.data
        if (orderObj) {
          state.currentOrder = { order: orderObj }
          logger.debug('🔁 Fetched order from server for session.orderId:', orderIdStr)
          
          // Start polling for this order
          startOrderPolling(orderIdStr)
        } else {
          state.currentOrder = { order: { order_id: sessionStore.orderId } }
          logger.warn('🔁 No order payload returned; initialized minimal order_id:', sessionStore.orderId)
        }
      } else {
        state.currentOrder = { order: { order_id: sessionStore.orderId } }
        logger.warn('🔁 session.orderId is invalid; initialized minimal order_id:', sessionStore.orderId)
      }
    } catch (err) {
      state.currentOrder = { order: { order_id: sessionStore.orderId } }
      logger.warn('🔁 Failed to fetch order during initializeFromSession:', err)
    }
    logger.debug('🔁 Initialized order state from session.orderId:', sessionStore.orderId)
  }

  // Broadcast event handlers
  function updateOrderStatus(status: string) {
    if (state.currentOrder) {
      state.currentOrder.status = status
    }
  }

  function completeOrder() {
    if (state.currentOrder) {
      state.currentOrder.status = 'completed'
    }
  }

  function clearOrder() {
    state.currentOrder = null
  }

  // Return refs so Pinia unwraps them at runtime. Cast to `any` so
  // TypeScript callers (tests) can assign values directly without
  // needing to work with `Ref<T>` types.
  return ({
    ...toRefs(state),
    getCartItemQuantity,
    getPackage,
    getPackageModifiers,
    packageTotal,
    addOnsTotal,
    taxAmount,
    grandTotal,
    refillTotal,
    activeCart,
    setPackage,
    setGuestCount,
    addToCart,
    updateQuantity,
    remove,
    clearRefillCart,
    toggleRefillMode,
    buildPayload,
    submitOrder,
    submitRefill,
    setOrderCreated,
    initializeFromSession,
    updateOrderStatus,
    completeOrder,
    clearOrder,
    // Polling controls
    startOrderPolling,
    stopOrderPolling
  } as unknown) as any
}, { 
  persist: {
    key: 'order-store',
    storage: (typeof localStorage !== 'undefined') ? localStorage : undefined,
    pick: ['guestCount', 'package', 'hasPlacedOrder', 'currentOrder', 'submittedItems', 'isRefillMode', 'history']
  }
})
