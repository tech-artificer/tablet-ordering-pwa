import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '~/stores/Device'
import { useOrderStore } from '~/stores/Order'
import { useSessionStore } from '~/stores/Session'
import { logger } from '~/utils/logger'
import { ElNotification, ElMessage } from 'element-plus'
import { useApi } from '~/composables/useApi'

// Timeout tracking for proper cleanup on unmount (prevents memory leaks)
let orderCompletionTimeoutId: ReturnType<typeof setTimeout> | null = null
let reloadTimeoutId: number | null = null
let deviceChannel: any = null
let orderChannel: any = null
let serviceRequestChannel: any = null
let deviceControlChannel: any = null
let reconnectAttempts = 0
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let boundPusherConnection: any = null
let boundStateChangeHandler: ((states: any) => void) | null = null

const channelStatus = ref({
  device: false,
  deviceControl: false,
  order: false,
  serviceRequest: false
})

// ─── WebSocket event interfaces ────────────────────────────────────────────
// Shapes MUST stay in sync with woosoo-nexus broadcast events.
// Reference: docs/websocket-events.md
// Note: backend does NOT send `eventId` — removed from all interfaces.

interface OrderCreatedEvent {
  order: {
    id: number
    order_id: string
    order_number: string
    device_id: number
    table_id: number
    branch_id: number
    session_id: number
    status: string
    items: Array<{
      id: number
      name: string
      quantity: number
      price: string
      is_refill: boolean
    }>
    total: string
    tax: string
    discount: string | null
    sub_total: string
    guest_count: number
    created_at: string
    updated_at: string
    is_printed: boolean
    device: { id: number; name: string }
    table: { id: number; name: string }
    serviceRequests: any[]
  }
}

/** Emitted by OrderStatusUpdated — channel Device.{deviceId} */
interface OrderUpdatedEvent {
  order: {
    id: number
    order_id: string
    order_number: string
    device_id: number
    table_id: number
    branch_id: number
    status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'voided'
    is_printed: boolean
    total: string
    created_at: string
    updated_at: string
    device: { id: number; name: string }
    table: { id: number; name: string }
  }
}

interface OrderCompletedEvent {
  order: {
    id: number
    order_id: string
    order_number: string
    device_id: number
    table_id: number
    branch_id: number
    session_id: number
    status: 'completed'
    items: Array<{ id: number; name: string; quantity: number; price: string; is_refill: boolean }>
    total: string
    tax: string
    discount: string | null
    sub_total: string
    guest_count: number
    created_at: string
    updated_at: string
    is_printed: boolean
    device: { id: number; name: string }
    table: { id: number; name: string }
    serviceRequests: any[]
  }
}

interface OrderCancelledEvent {
  order: {
    id: number
    order_id: string
    order_number: string
    device_id: number
    status: 'cancelled' | 'voided'
  }
}

interface ServiceRequestEvent {
  service_request: {
    id: number
    order_id: string
    table_id: number
    device_id: number
    type: string
    message?: string
    status: 'pending' | 'acknowledged' | 'completed'
    created_at: string
    updated_at: string
  }
}

interface DeviceControlEvent {
  action: 'restart' | 'lock' | 'unlock' | 'update' | 'reload' | 'message' | 'volume'
  payload: {
    message?: string
    volume?: number
    url?: string
    duration?: number
    [key: string]: any
  }
  deviceId: number
}

export const useBroadcasts = () => {
  const router = useRouter()
  const deviceStore = useDeviceStore()
  const orderStore = useOrderStore()
  const sessionStore = useSessionStore()

  // Track last event ID for reliability
  const getLastEventId = (): number => {
    return parseInt(localStorage.getItem('lastEventId') || '0')
  }

  const setLastEventId = (eventId: number) => {
    localStorage.setItem('lastEventId', eventId.toString())
  }

  // Process events based on type
  const processEvent = (eventType: string, payload: any) => {
    if (payload.eventId) {
      setLastEventId(payload.eventId)
    }

    logger.debug('Processing event:', eventType, payload)
    switch (eventType) {
      case 'order.created':
        handleOrderCreated(payload)
        break
      case 'order.updated':
        handleOrderUpdated(payload)
        break
      case 'order.completed':
        handleOrderCompleted(payload)
        break
      case 'order.cancelled':
        handleOrderCancelled(payload)
        break
      case 'service-request.notification':
        handleServiceRequest(payload)
        break
      case 'device.control':
        handleDeviceControl(payload)
        break
    }
  }

  // Event Handlers
  const handleOrderCreated = (event: OrderCreatedEvent) => {
    logger.debug('[📨 .order.created]', { order_id: event.order.id, order_number: event.order.order_number })
    
    ElNotification({
      title: 'Order Confirmed',
      message: `Order ${event.order.order_number} has been placed successfully!`,
      type: 'success',
      duration: 5000
    })

    // Update session order ID
    if (sessionStore.getSessionId() === event.order.session_id) {
      sessionStore.setOrderId(event.order.id)
    }
  }

  const handleOrderUpdated = (event: OrderUpdatedEvent) => {
    const { order } = event
    logger.debug('[📨 .order.updated]', { order_id: order.order_id, status: order.status })

    const statusMessages: Record<string, { title: string; message: string; type: any }> = {
      preparing: {
        title: 'Order in Progress',
        message: 'Your order is being prepared by our kitchen!',
        type: 'info'
      },
      ready: {
        title: 'Order Ready! 🔥',
        message: 'Your delicious food is ready to be served!',
        type: 'success'
      },
      completed: {
        title: 'Order Completed',
        message: 'Enjoy your meal!',
        type: 'success'
      }
    }

    const notification = statusMessages[order.status]
    if (notification) {
      ElNotification({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        duration: 6000
      })
    }

    // Update current order status in store
    const currentOrderResp = orderStore.getCurrentOrder()
    const currentOrderId = currentOrderResp?.order?.id || currentOrderResp?.order?.order_id || currentOrderResp?.id || currentOrderResp?.order_id
    const eventOrderId = order.order_id

    logger.debug('🔄 Order update check:', { currentOrderId, eventOrderId, status: order.status })

    if (currentOrderId && (String(currentOrderId) === String(eventOrderId))) {
      orderStore.updateOrderStatus(order.status)
      // If this is a terminal status, stop the polling fallback
      if (order.status === 'completed' || order.status === 'cancelled' || order.status === 'voided') {
        try { orderStore.stopOrderPolling && orderStore.stopOrderPolling() } catch (e) { logger.debug('[Broadcasts] stopOrderPolling failed', e) }

        // End session and navigate to home on completed
        if (order.status === 'completed') {
          logger.info('✅ Order completed via broadcast - ending session in 2s')
          if (orderCompletionTimeoutId) clearTimeout(orderCompletionTimeoutId)
          orderCompletionTimeoutId = setTimeout(async () => {
            sessionStore.end()
            await router.replace('/')
          }, 2000)
        }
      }
    }
  }

  const handleOrderCompleted = (event: OrderCompletedEvent) => {
    logger.debug('Order completed:', event.order)
    
    ElNotification({
      title: '✅ Order Complete',
      message: `Order ${event.order.order_number} has been completed. Thank you!`,
      type: 'success',
      duration: 8000
    })

    // Mark order as completed in store
    // Handle both { order: {...} } and direct order object structures
    const currentOrderResp = orderStore.getCurrentOrder()
    const currentOrderId = currentOrderResp?.order?.id || currentOrderResp?.order?.order_id || currentOrderResp?.id || currentOrderResp?.order_id
    const eventOrderId = event.order.order_id || event.order.id
    
    logger.debug('✅ Order completed check:', { currentOrderId, eventOrderId })
    
    if (currentOrderId && (String(currentOrderId) === String(eventOrderId))) {
      orderStore.completeOrder()
      try { orderStore.stopOrderPolling && orderStore.stopOrderPolling() } catch (e) { logger.debug('[Broadcasts] stopOrderPolling failed', e) }
      
      // End session and navigate to home after a short delay
      logger.info('✅ Order completed via broadcast - ending session in 2s')
      if (orderCompletionTimeoutId) clearTimeout(orderCompletionTimeoutId)
      orderCompletionTimeoutId = setTimeout(async () => {
        sessionStore.end()
        await router.replace('/')
      }, 2000)
    }
  }

  const handleOrderCancelled = (event: OrderCancelledEvent) => {
    logger.debug('Order cancelled:', event.order)
    
    ElNotification({
      title: 'Order Cancelled',
      message: `Order ${event.order.order_number} has been cancelled.`,
      type: 'warning',
      duration: 8000
    })

    // Clear order from store — order_id is a string (e.g. "ORD-2026-0001"), compare as strings
    const currentOrderResp = orderStore.getCurrentOrder()
    const currentId = currentOrderResp?.order_id ?? currentOrderResp?.order?.order_id
    if (currentId && String(currentId) === String(event.order.order_id)) {
      orderStore.clearOrder()
      try { orderStore.stopOrderPolling && orderStore.stopOrderPolling() } catch (e) { logger.debug('[Broadcasts] stopOrderPolling failed', e) }
    }
  }

  const handleServiceRequest = (event: ServiceRequestEvent) => {
    logger.debug('Service request update:', event.service_request)
    
    const statusMessages: Record<string, string> = {
      pending: 'Request sent to staff',
      acknowledged: 'Staff has been notified and will assist you shortly',
      completed: 'Request completed!'
    }

    const message = statusMessages[event.service_request.status]
    if (message) {
      ElMessage({
        message: message,
        type: event.service_request.status === 'completed' ? 'success' : 'info',
        duration: 4000
      })
    }
  }

  const handleDeviceControl = (event: DeviceControlEvent) => {
    logger.debug('Device control command:', event.action)
    
    switch (event.action) {
      case 'restart':
      case 'reload':
        ElMessage.warning('App will restart in 3 seconds...')
        if (reloadTimeoutId) {
          try { clearTimeout(reloadTimeoutId) } catch (e) { logger.debug('[Broadcasts] clearTimeout failed', e) }
          reloadTimeoutId = null
        }
        reloadTimeoutId = window.setTimeout(() => {
          window.location.reload()
        }, 3000)
        break

      case 'lock':
        ElMessage.error('Device has been locked by administrator')
        // Implement device lock UI
        break

      case 'unlock':
        ElMessage.success('Device has been unlocked')
        // Remove device lock UI
        break

      case 'message':
        if (event.payload.message) {
          ElNotification({
            title: 'Message from Management',
            message: event.payload.message,
            type: 'info',
            duration: 10000
          })
        }
        break

      case 'volume':
        // Implement volume control if supported
        logger.debug('Volume set to:', event.payload.volume)
        break

      case 'update':
        ElMessage.info('Checking for updates...')
        // Implement update check
        break
    }
  }

  const clearReconnectTimer = () => {
    if (reconnectTimer) {
      try { clearTimeout(reconnectTimer) } catch (e) { logger.debug('[Broadcasts] clearReconnectTimer failed', e) }
      reconnectTimer = null
    }
    reconnectAttempts = 0
  }

  const resetChannelStatus = () => {
    channelStatus.value = {
      device: false,
      deviceControl: false,
      order: false,
      serviceRequest: false
    }
  }

  const unsubscribeDeviceChannels = () => {
    const canLeave = typeof (window as any).Echo?.leave === 'function'
    if (deviceChannel) {
      if (canLeave) {
        ;(window as any).Echo.leave(deviceChannel.name)
      }
      deviceChannel = null
      channelStatus.value.device = false
    }
    if (deviceControlChannel) {
      if (canLeave) {
        ;(window as any).Echo.leave(deviceControlChannel.name)
      }
      deviceControlChannel = null
      channelStatus.value.deviceControl = false
    }
  }

  // Subscribe to device-specific channel
  const subscribeToDeviceChannel = () => {
    const deviceId = deviceStore.getDeviceId()
    if (!deviceId || !(window as any).Echo) return

    unsubscribeDeviceChannels()

    // Subscribe to Device.{deviceId} for order updates
    logger.debug('[Echo] Subscribing to Device.' + deviceId)
    deviceChannel = (window as any).Echo.channel(`Device.${deviceId}`)
      .listen('.order.updated', (event: OrderUpdatedEvent) => {
        handleOrderUpdated(event)
      })

    channelStatus.value.device = true
    logger.debug(`✅ Subscribed to Device.${deviceId}`)

    // Subscribe to device.{deviceId} for control events
    logger.debug('[Echo] Subscribing to device.' + deviceId)
    deviceControlChannel = (window as any).Echo.channel(`device.${deviceId}`)
      .listen('.device.control', (event: DeviceControlEvent) => {
        handleDeviceControl(event)
      })

    channelStatus.value.deviceControl = true
    logger.debug(`✅ Subscribed to device.${deviceId} (control)`)
  }

  // Subscribe to order-specific channels
  const subscribeToOrderChannel = (orderId: string) => {
    if (!orderId || !(window as any).Echo) return

    unsubscribeFromOrderChannel()

    logger.debug('[Echo] Subscribing to orders.' + orderId)
    orderChannel = (window as any).Echo.channel(`orders.${orderId}`)
      .listen('.order.created', (event: OrderCreatedEvent) => {
        handleOrderCreated(event)
      })
      .listen('.order.completed', (event: OrderCompletedEvent) => {
        handleOrderCompleted(event)
      })
      .listen('.order.cancelled', (event: OrderCancelledEvent) => {
        handleOrderCancelled(event)
      })
      .listen('.order.voided', (event: OrderCancelledEvent) => {
        handleOrderCancelled(event)
      })

    channelStatus.value.order = true
    logger.debug(`✅ Subscribed to orders.${orderId}`)

    // Subscribe to service requests for this order
    logger.debug('[Echo] Subscribing to service-requests.' + orderId)
    serviceRequestChannel = (window as any).Echo.channel(`service-requests.${orderId}`)
      .listen('.service-request.notification', (event: ServiceRequestEvent) => {
        handleServiceRequest(event)
      })

    channelStatus.value.serviceRequest = true
    logger.debug(`✅ Subscribed to service-requests.${orderId}`)
  }

  // Unsubscribe from order channels
  const unsubscribeFromOrderChannel = () => {
    const canLeave = typeof (window as any).Echo?.leave === 'function'
    if (orderChannel) {
      logger.debug(`[🔕 Unsubscribing] Channel: ${orderChannel.name}`)
      if (canLeave) {
        ;(window as any).Echo.leave(orderChannel.name)
      }
      orderChannel = null
      channelStatus.value.order = false
    }
    if (serviceRequestChannel) {
      logger.debug(`[🔕 Unsubscribing] Channel: ${serviceRequestChannel.name}`)
      if (canLeave) {
        ;(window as any).Echo.leave(serviceRequestChannel.name)
      }
      serviceRequestChannel = null
      channelStatus.value.serviceRequest = false
    }
  }

  const resubscribeChannels = () => {
    subscribeToDeviceChannel()
    const currentOrderId = sessionStore.getOrderId()
    if (currentOrderId) {
      subscribeToOrderChannel(String(currentOrderId))
    }
  }

  const unbindConnectionStateHandler = () => {
    if (boundPusherConnection && boundStateChangeHandler && typeof boundPusherConnection.unbind === 'function') {
      try {
        boundPusherConnection.unbind('state_change', boundStateChangeHandler)
      } catch (e) {
        logger.debug('[Broadcasts] unbind state_change failed', e)
      }
    }
    boundPusherConnection = null
    boundStateChangeHandler = null
  }

  const scheduleReconnect = () => {
    if (reconnectTimer) {
      return
    }
    const MAX_RECONNECT_ATTEMPTS = 10
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      logger.error('[Broadcasts] Max reconnect attempts reached — manual page reload required')
      return
    }
    const jitterMs = Math.floor(Math.random() * 1000)
    const backoffMs = Math.min(1000 * Math.pow(2, reconnectAttempts) + jitterMs, 30000)
    reconnectAttempts++
    logger.warn(`[Broadcasts] Scheduling reconnect attempt ${reconnectAttempts} in ${backoffMs}ms`)
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      logger.info('[Broadcasts] Attempting reconnect...')
      try {
        const echo = (window as any).Echo
        if (typeof echo?.connect === 'function') {
          echo.connect()
          return
        }
        if (typeof echo?.connector?.pusher?.connect === 'function') {
          echo.connector.pusher.connect()
          return
        }
        throw new Error('Echo reconnect API unavailable')
      } catch (e) {
        logger.error('[Broadcasts] Reconnect call failed:', e)
        scheduleReconnect()
      }
    }, backoffMs)
  }

  const bindConnectionStateHandler = () => {
    const echo = (window as any).Echo
    const connection = echo?.connector?.pusher?.connection
    if (!connection || typeof connection.bind !== 'function') {
      return
    }
    if (boundPusherConnection === connection && boundStateChangeHandler) {
      return
    }

    unbindConnectionStateHandler()

    boundStateChangeHandler = (states: any) => {
      logger.debug('WebSocket state change:', states.current)

      if (states.current === 'connected') {
        logger.debug('✅ WebSocket connected')
        clearReconnectTimer()
        resubscribeChannels()
        return
      }

      if (states.current === 'disconnected' || states.current === 'unavailable' || states.current === 'failed') {
        logger.warn(`⚠️ WebSocket ${states.current} — scheduling reconnect`)
        resetChannelStatus()
        scheduleReconnect()
      }
    }

    connection.bind('state_change', boundStateChangeHandler)
    boundPusherConnection = connection
  }

  // Initialize broadcasts
  const initializeBroadcasts = () => {
    if (!(window as any).Echo) {
      logger.warn('Echo not available, broadcasts disabled')
      return
    }

    resubscribeChannels()
    bindConnectionStateHandler()
  }

  // Cleanup on unmount
  const cleanup = () => {
    // Clear any pending timeouts to prevent memory leaks in kitchen environment
    if (orderCompletionTimeoutId) {
      try { clearTimeout(orderCompletionTimeoutId) } catch (e) { logger.debug('[Broadcasts] cleanup clearTimeout failed', e) }
      orderCompletionTimeoutId = null
    }
    if (reloadTimeoutId) {
      try { clearTimeout(reloadTimeoutId) } catch (e) { logger.debug('[Broadcasts] cleanup clearTimeout failed', e) }
      reloadTimeoutId = null
    }
    clearReconnectTimer()
    unsubscribeFromOrderChannel()
    unsubscribeDeviceChannels()
    unbindConnectionStateHandler()
    resetChannelStatus()
  }

  return {
    initializeBroadcasts,
    subscribeToOrderChannel,
    unsubscribeFromOrderChannel,
    cleanup,
    channelStatus
  }
}
