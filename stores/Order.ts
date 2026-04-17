import { defineStore } from 'pinia'
import { reactive, computed, toRefs, onScopeDispose } from 'vue'
import { useApi } from '../composables/useApi'
import { logger } from '../utils/logger'
import { extractOrderId, extractOrderNumber } from '../utils/orderHelpers'
import { notifyBlockedAction } from '../composables/useNotifier'
import { useDeviceStore } from './Device'
import { useSessionStore } from './Session'
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

  let submitOrderMutex: Promise<any> | null = null
  let submitRefillMutex: Promise<any> | null = null
  let completionTimeoutId: number | null = null
  let pollingStartedAt: number | null = null
  const maxPollingRuntimeMs = 15 * 60 * 1000

  const validateOrderState = (source: string) => {
    const issues: string[] = []

    if (state.isRefillMode && !state.hasPlacedOrder) {
      state.isRefillMode = false
      state.refillItems = []
      issues.push('refillModeWithoutOrder')
    }

    if (state.hasPlacedOrder && !state.currentOrder) {
      state.hasPlacedOrder = false
      state.submittedItems = []
      issues.push('hasPlacedOrderWithoutCurrentOrder')
    }

    if (state.isPolling && !state.pollTimerId) {
      state.isPolling = false
      state.pollInflight = false
      state.pollingOrderId = null
      issues.push('pollingFlagWithoutTimer')
    }

    if (!state.isPolling && state.pollTimerId) {
      try {
        clearInterval(state.pollTimerId as any)
      } catch (e) {
        logger.debug('[OrderStore] validateOrderState: clearInterval failed', e)
      }
      state.pollTimerId = null
      issues.push('timerWithoutPollingFlag')
    }

    if (issues.length > 0) {
      logger.warn('[OrderStore] State recovery applied', { source, issues })
    }
  }

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

    // Validate category in refill mode - only meats and sides allowed
    if (state.isRefillMode) {
      const itemCategory = opts?.category || item.category
      const allowedCategories = ['meats', 'sides']
      if (!itemCategory || !allowedCategories.includes(itemCategory)) {
        logger.warn(`addToCart blocked in refill mode: category "${itemCategory}" not allowed`)
        notifyBlockedAction('Only Meats and Sides can be refilled')
        return
      }
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

    // Validate category in refill mode - prevent modifications to non-refillable items
    if (state.isRefillMode) {
      const itemCategory = existing.category
      const allowedCategories = ['meats', 'sides']
      if (!itemCategory || !allowedCategories.includes(itemCategory)) {
        logger.warn(`updateQuantity blocked in refill mode: category "${itemCategory}" not allowed`)
        notifyBlockedAction('Only Meats and Sides quantities can be modified in Refill mode')
        return
      }
    }
    
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
    // Separate package item with nested modifiers from add-ons
    const meatItems = state.cartItems.filter((i: any) => i.category === 'meats')
    const addOnItems = state.cartItems.filter((i: any) => i.category !== 'meats')
    
    const items: any[] = []
    
    // 1. Package item with meat modifiers (parent-child structure)
    if (state.package?.id) {
      const packageQuantity = Number(state.guestCount)
      const packageUnitPrice = Number((state.package as any)?.price || 0)
      const packageSubtotal = packageUnitPrice * packageQuantity

      items.push({
        menu_id: Number(state.package.id),
        name: String((state.package as any)?.name || 'Package'),
        quantity: packageQuantity,
        price: packageUnitPrice,
        subtotal: packageSubtotal,
        tax: 0,
        discount: 0,
        note: null,
        is_package: true,
        modifiers: meatItems.map((meat: any) => ({
          menu_id: Number(meat.id),
          quantity: Number(meat.quantity)
        }))
      })
    }
    
    // 2. Add-on items (sides, drinks, desserts) as separate top-level items
    addOnItems.forEach((item: any) => {
      const quantity = Number(item.quantity)
      const unitPrice = Number(item.price || 0)
      const subtotal = unitPrice * quantity

      items.push({
        menu_id: Number(item.id),
        name: String(item.name || 'Item'),
        quantity,
        price: unitPrice,
        subtotal,
        tax: 0,
        discount: 0,
        note: item.note ?? null,
        is_package: false,
        modifiers: []
      })
    })

    const subtotal = Number(packageTotal.value || 0) + Number(addOnsTotal.value || 0)
    const tax = Number(taxAmount.value || 0)
    const discount = 0
    const totalAmount = Number(grandTotal.value || 0)
    
    const payload = {
      table_id: null,  // Will be populated from deviceStore in submitOrder
      guest_count: Number(state.guestCount),
      subtotal,
      tax,
      discount,
      total_amount: totalAmount,
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

    if (typeof payload.subtotal !== 'number' || payload.subtotal < 0) {
      throw new Error('Invalid subtotal: must be a non-negative number')
    }

    if (typeof payload.tax !== 'number' || payload.tax < 0) {
      throw new Error('Invalid tax: must be a non-negative number')
    }

    if (typeof payload.discount !== 'number' || payload.discount < 0) {
      throw new Error('Invalid discount: must be a non-negative number')
    }

    if (typeof payload.total_amount !== 'number' || payload.total_amount < 0) {
      throw new Error('Invalid total_amount: must be a non-negative number')
    }
    
    payload.items.forEach((item, index) => {
      if (!item.menu_id || typeof item.menu_id !== 'number') {
        throw new Error(`Invalid item[${index}].menu_id: must be a number`)
      }
      if (!item.name || typeof item.name !== 'string') {
        throw new Error(`Invalid item[${index}].name: must be a string`)
      }
      if (!item.quantity || item.quantity < 1) {
        throw new Error(`Invalid item[${index}].quantity: must be at least 1`)
      }
      if (typeof item.price !== 'number' || item.price < 0) {
        throw new Error(`Invalid item[${index}].price: must be a non-negative number`)
      }
      if (typeof item.subtotal !== 'number' || item.subtotal < 0) {
        throw new Error(`Invalid item[${index}].subtotal: must be a non-negative number`)
      }
      if (typeof item.is_package !== 'boolean') {
        throw new Error(`Invalid item[${index}].is_package: must be a boolean`)
      }
      if (item.is_package && (!Array.isArray(item.modifiers) || item.modifiers.length === 0)) {
        throw new Error(`Invalid item[${index}].modifiers: package items must have at least one modifier`)
      }
      if (item.is_package && item.modifiers) {
        item.modifiers.forEach((mod: any, modIndex: number) => {
          if (!mod.menu_id || typeof mod.menu_id !== 'number') {
            throw new Error(`Invalid item[${index}].modifiers[${modIndex}].menu_id: must be a number`)
          }
          if (!mod.quantity || mod.quantity < 1) {
            throw new Error(`Invalid item[${index}].modifiers[${modIndex}].quantity: must be at least 1`)
          }
        })
      }
    })
    
    logger.debug('✅ Payload validation passed')
    return payload
  }

  function buildRefillPayload() {
    state.refillItems.forEach((item: any, index: number) => {
      if (item?.category && !['meats', 'sides'].includes(item.category)) {
        throw new Error(`Invalid refill item[${index}].category: only meats and sides are allowed`)
      }
    })

    const items = state.refillItems.map((i: any, index: number) => ({
      menu_id: i.id ? Number(i.id) : undefined,
      name: i.name,
      quantity: Number(i.quantity),
      price: i.price !== undefined ? Number(i.price) : 0,
      index: index + 1,
      seat_number: 1,
      note: i.note || 'Refill'
    }))

    const payload = { items }

    logger.debug('🔍 Validating refill payload structure...')

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error('Invalid refill items: must be a non-empty array')
    }

    payload.items.forEach((item, index) => {
      if (!item.menu_id || typeof item.menu_id !== 'number') {
        throw new Error(`Invalid refill item[${index}].menu_id: must be a number`)
      }
      if (!item.name || typeof item.name !== 'string') {
        throw new Error(`Invalid refill item[${index}].name: must be a non-empty string`)
      }
      if (!item.quantity || item.quantity < 1) {
        throw new Error(`Invalid refill item[${index}].quantity: must be at least 1`)
      }
      if (typeof item.price !== 'number' || item.price < 0) {
        throw new Error(`Invalid refill item[${index}].price: must be a non-negative number`)
      }
    })

    logger.debug('✅ Refill payload validation passed')
    return payload
  }

  async function submitOrder(payload?: any) {
    if (submitOrderMutex) {
      logger.warn('submitOrder already in progress; awaiting existing submission')
      return submitOrderMutex
    }

    submitOrderMutex = (async () => {
      if (state.hasPlacedOrder && !state.isRefillMode) {
        throw new Error('An initial order has already been placed for this session. Use refill instead.')
      }
      if (state.isSubmitting) {
        throw new Error('Order submission already in progress. Please wait.')
      }
      state.isSubmitting = true
    // 🔒 VALIDATION: Ensure everything is set before submitting
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
    let body = payload ?? buildPayload()
    
    // Inject table_id from deviceStore if not already set
    if (!body.table_id) {
      body = {
        ...body,
        table_id: tableId
      }
    }
    
    logger.debug('📦 Order Payload:', body)
    
    try {
      const idempotencyKey = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `idemp-${Date.now()}-${Math.random().toString(36).slice(2,10)}`
      const resp = await api.post('/api/devices/create-order', body, { headers: { 'X-Idempotency-Key': idempotencyKey } })
      logger.info('✅ Order submission SUCCESS')
      logger.debug('📥 Response:', resp.data)
      
      // Update session with order ID from response
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
      logger.error('❌ Order submission failed:', error?.message || error)
      
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

      // Handle active-order conflicts by resuming the existing order
      if (error.response?.status === 409) {
        const existingOrder = error.response?.data?.order
        if (existingOrder) {
          logger.warn('↩️ Active order already exists for this device/session. Resuming existing order instead of creating a new one.', {
            orderId: existingOrder?.order_id ?? existingOrder?.id,
            status: existingOrder?.status,
          })

          const recoveredResponse = {
            success: true,
            resumed: true,
            message: error.response?.data?.message || 'Existing active order found. Resuming current order.',
            order: existingOrder,
          }

          await setOrderCreated(recoveredResponse)
          return recoveredResponse
        }

        throw new Error(error.response?.data?.message || 'An active order already exists for this device. Please continue the existing session.')
      }

      if (error.response?.status === 503 && error.response?.data?.code === 'SESSION_NOT_FOUND') {
        throw new Error('❌ No active POS terminal session found. Please ask staff to open a POS session, then try again.')
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
    })()

    try {
      return await submitOrderMutex
    } finally {
      submitOrderMutex = null
    }
  }
  
  async function submitRefill(payload?: any) {
    if (submitRefillMutex) {
      logger.warn('submitRefill already in progress; awaiting existing submission')
      return submitRefillMutex
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
    // Use same structure as initial order with is_package and modifiers
    const refillPayload = {
      items: state.refillItems.map((i: any) => {
        const isMeat = i.category === 'meats'
        return {
          menu_id: Number(i.id),
          quantity: Number(i.quantity),
          is_package: false,  // Refills are standalone items, not packages
          note: i.note ?? 'Refill',
          modifiers: []
        }
      })
    }
    
    logger.debug('[Refill] Submitting refill payload', {
      orderId: currentOrderId,
      refillPayload,
    })
    
    try {
      const idempotencyKey = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : `idemp-${Date.now()}-${Math.random().toString(36).slice(2,10)}`
      const resp = await api.post(`/api/order/${currentOrderId}/refill`, payload ?? refillPayload, { headers: { 'X-Idempotency-Key': idempotencyKey } })
      state.refillItems = []
      state.isRefillMode = false
      state.history = [...state.history, { ...resp.data, type: 'refill' }]
      logger.info('[Refill] Success')
      return resp.data
    } catch (error: any) {
      logger.error('[Refill] Failed:', error?.response?.data || error)
      throw error
    } finally {
      submitRefillMutex = null
    }
  }

  async function setOrderCreated(respData: any) {
    const sessionStore = useSessionStore()

    const orderNumber = extractOrderNumber(respData)
    // Use order_id (business ID like 19583), not order_number or internal id
    const orderId = extractOrderId(respData)

    // Store the numeric order_id in session for API lookups
    if (orderId && sessionStore.orderId) {
      sessionStore.orderId.value = Number(orderId)
    }
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
      logger.debug('stopOrderPolling: clearInterval failed', e)
    }
    state.pollTimerId = null
    state.isPolling = false
    state.pollInflight = false
    state.pollingOrderId = null
    pollingStartedAt = null
    if (completionTimeoutId) {
      try {
        clearTimeout(completionTimeoutId)
      } catch (e) {
        logger.debug('stopOrderPolling: clearTimeout failed', e)
      }
      completionTimeoutId = null
    }
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
    pollingStartedAt = Date.now()

    const tick = async () => {
      if (state.pollInflight) return
      if (!state.isPolling || state.pollingOrderId !== orderId) return

      if (pollingStartedAt && (Date.now() - pollingStartedAt) > maxPollingRuntimeMs) {
        logger.warn('startOrderPolling: max runtime exceeded, stopping polling', { orderId, maxPollingRuntimeMs })
        stopOrderPolling()
        return
      }
      state.pollInflight = true
      const tickStart = performance.now()
      try {
        const api = useApi()
        if (!api || typeof (api as any).get !== 'function') {
          logger.warn('startOrderPolling: api client unavailable — stopping order polling')
          stopOrderPolling()
          return
        }
        const url = `/api/device-order/by-order-id/${orderId}`
        const resp = await api.get(url)
        const tickMs = (performance.now() - tickStart).toFixed(1)
        
        // Normalize returned order object
        const orderObj = resp.data?.order || resp.data?.data || resp.data
        if (orderObj) {
          const status = orderObj?.status
          logger.debug('[Polling] Tick', {
            orderId,
            status,
            latencyMs: tickMs,
          })
          
          // Update currentOrder to canonical server resource
          state.currentOrder = { order: orderObj }
          state.hasPlacedOrder = true
          // Persist session order id if missing
          try {
            const sessionStore = useSessionStore()
            const polledOrderId = extractOrderId(orderObj)
            if (polledOrderId && sessionStore.orderId) {
              sessionStore.orderId.value = Number(polledOrderId)
            }
          } catch (e) {
            logger.debug('startOrderPolling: failed to sync session orderId', e)
          }

          // Stop polling if terminal status observed
          if (status === 'completed' || status === 'cancelled' || status === 'voided') {
            logger.info('[Polling] Terminal status observed', { orderId, status })
            stopOrderPolling()
            
            // End session and navigate to home on completed status
            if (status === 'completed') {
              try {
                const sessionStore = useSessionStore()
                
                // Small delay to allow any final UI updates. Await session end
                // and clear order state immediately to avoid a refill UI loop.
                if (completionTimeoutId) {
                  try { clearTimeout(completionTimeoutId) } catch (e) { logger.debug('order completion timeout clear failed', e) }
                  completionTimeoutId = null
                }
                completionTimeoutId = window.setTimeout(async () => {
                  try {
                    // Load session store instance and call end
                    const sessionStore = useSessionStore()

                    // If end returns a promise, await it
                    try {
                      if (sessionStore.end) {
                        const res = sessionStore.end()
                        if (res && typeof (res as any).then === 'function') await res
                      }
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
                  } finally {
                    completionTimeoutId = null
                  }
                }, 2000)
              } catch (e) {
                logger.warn('Failed to end session on order completion:', e)
              }
            }
          }
        }
      } catch (error) {
        const tickMs = (performance.now() - tickStart).toFixed(1)
        logger.error('[Polling] Error', {
          orderId,
          error: (error as any)?.message,
          latencyMs: tickMs,
        })
        logger.warn('Order polling tick failed:', error)
      } finally {
        state.pollInflight = false
      }
    }

    // Run immediately, then every 5s
    logger.info('[Polling] Started', { orderId, intervalMs: 5000 })
    tick().catch(() => {})
    const timerId = setInterval(() => tick().catch(() => {}), 5000) as unknown as number
    state.pollTimerId = timerId
    logger.info('✅ Order polling started for', orderId)
  }

  async function initializeFromSession() {
    const sessionStore = useSessionStore()
    
    logger.debug('🔁 initializeFromSession called:', {
      sessionOrderId: sessionStore.orderId,
      stateHasPlacedOrder: state.hasPlacedOrder,
      stateCurrentOrder: !!state.currentOrder
    })
    
    // If no orderId in session, attempt server-side active-order recovery first.
    // This handles direct URL access / reloads where local storage lost orderId,
    // but backend still has a pending/confirmed order for this tablet.
    if (!sessionStore.orderId) {
      try {
        const api = useApi()
        const activeResp = await api.get('/api/device-orders', {
          params: {
            status: 'pending,confirmed,ready',
            per_page: 1,
          },
        })

        const activeOrder = activeResp?.data?.data?.data?.[0]
        const activeOrderId = activeOrder?.order_id || activeOrder?.id
        const activeStatus = String(activeOrder?.status || '').toLowerCase()

        if (activeOrderId && !['completed', 'cancelled', 'voided'].includes(activeStatus)) {
          if (sessionStore.orderId) sessionStore.orderId.value = activeOrderId
          if (sessionStore.isActive) sessionStore.isActive.value = true
          if (typeof window !== 'undefined' && window.localStorage) {
            try { window.localStorage.setItem('session_active', '1') } catch (e) { /* ignore */ }
          }

          state.hasPlacedOrder = true
          state.currentOrder = { order: activeOrder }
          logger.info('🔁 Recovered active order from /api/device-orders:', {
            orderId: activeOrderId,
            status: activeStatus,
          })

          startOrderPolling(String(activeOrderId))
          return
        }
      } catch (err) {
        logger.warn('🔁 Active order lookup failed; continuing local-state fallback', err)
      }

      // If still no orderId, reset stale hasPlacedOrder flag after a short grace
      if (state.hasPlacedOrder || state.currentOrder || state.isRefillMode) {
        logger.info('🔁 No session.orderId found, resetting stale order state (with grace)')
        // Apply a short grace period to avoid clearing during quick transitions
        await new Promise(resolve => setTimeout(resolve, 1500))
        // Re-check the session store in case orderId was set during grace
        const refreshed = useSessionStore()
        if (!refreshed.orderId) {
          state.hasPlacedOrder = false
          state.currentOrder = null
          state.isRefillMode = false
          state.submittedItems = []
        } else {
          logger.debug('initializeFromSession: session.orderId appeared during grace, skipping clear')
        }
      }
      validateOrderState('initializeFromSession:no-session')
      return
    }
    
    // Mark order as placed locally and attempt to fetch canonical order details
    state.hasPlacedOrder = true
    try {
      const api = useApi()
      const orderIdStr = String(sessionStore.orderId)
      if (orderIdStr && orderIdStr !== 'null' && orderIdStr !== 'undefined') {
        const resp = await api.get(`/api/device-order/by-order-id/${orderIdStr}`)
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
    validateOrderState('initializeFromSession:completed')
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
  validateOrderState('init')

  onScopeDispose(() => {
    stopOrderPolling()
    if (completionTimeoutId) {
      try { clearTimeout(completionTimeoutId) } catch (e) { logger.debug('OrderStore dispose: clearTimeout failed', e) }
      completionTimeoutId = null
    }
  })

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
    buildRefillPayload,
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
    pick: ['guestCount', 'package', 'hasPlacedOrder', 'currentOrder', 'submittedItems', 'isRefillMode', 'history', 'cartItems', 'refillItems']
  }
})
