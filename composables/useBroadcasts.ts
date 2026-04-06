import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '~/stores/Device'
import { useOrderStore } from '~/stores/Order'
import { useSessionStore } from '~/stores/Session'
import { logger } from '~/utils/logger'
import { ElNotification, ElMessage } from 'element-plus'
import { useApi } from '~/composables/useApi'

// Timeout tracking for proper cleanup on unmount (prevents memory leaks)
let orderCompletionTimeoutId: ReturnType<typeof setTimeout> | null = null
let reloadTimeoutId: ReturnType<typeof setTimeout> | null = null

interface OrderCreatedEvent {
  eventId: number
  event: 'created'
  order: {
    id: number
    order_id: string
    order_number: string
    device_id: number
    session_id: number
    table_id: number
    status: string
    items: any[]
    subtotal: string
    tax: string
    service_charge: string
    total: string
    guest_count: number
    created_at: string
    updated_at: string
  }
}

interface OrderUpdatedEvent {
  eventId: number
  order_id: string
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled' | 'voided'
}

interface OrderCompletedEvent {
  eventId: number
  order: {
    id: number
    order_id: string
    order_number: string
    device_id: number
    session_id: number
    status: 'completed'
  }
}

interface OrderCancelledEvent {
  eventId: number
  order: {
    id: number
    order_id: string
    order_number: string
    device_id: number
    status: 'cancelled'
  }
}

interface ServiceRequestEvent {
  eventId: number
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
  eventId: number
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

  let deviceChannel: any = null
  let orderChannel: any = null
  let serviceRequestChannel: any = null
  let deviceControlChannel: any = null
  let orderCompletionTimeoutId: number | null = null
  let reloadTimeoutId: number | null = null

  // Channel connection status
  const channelStatus = ref({
    device: false,
    deviceControl: false,
    order: false,
    serviceRequest: false
  })

  // Track last event ID for reliability
  const getLastEventId = (): number => {
    return parseInt(localStorage.getItem('lastEventId') || '0')
  }

  const setLastEventId = (eventId: number) => {
    localStorage.setItem('lastEventId', eventId.toString())
  }

  // Replay missed events after reconnection
  const replayMissedEvents = async () => {
    const lastEventId = getLastEventId()
    const deviceId = deviceStore.getDeviceId()

    if (!deviceId) return

    try {
      const api = useApi()
      const response = await api.get(`/api/events/missing?after=${lastEventId}&device_id=${deviceId}&limit=100`)
      
      const { events, hasMore } = response.data

      for (const event of events) {
        processEvent(event.event_type, event.payload)
        setLastEventId(event.id)
      }

      if (hasMore) {
        await replayMissedEvents()
      }
    } catch (error) {
      logger.error('Failed to replay missed events:', error)
    }
  }

  // Process events based on type
  const processEvent = (eventType: string, payload: any) => {
    if (payload.eventId) {
      setLastEventId(payload.eventId)
    }

    console.log('Processing event:', eventType, payload)
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
    const timestamp = new Date().toISOString()
    console.log(`[📨 .order.created] Received at ${timestamp}`, { order_id: event.order.id, order_number: event.order.order_number })
    logger.debug('Order created:', event.order)
    
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
    const timestamp = new Date().toISOString()
    console.log(`[📨 .order.updated] Received at ${timestamp}`, { order_id: event.order_id, status: event.status })
    logger.debug('Order status updated:', event)
    
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

    const notification = statusMessages[event.status]
    if (notification) {
      ElNotification({
        title: notification.title,
        message: notification.message,
        type: notification.type,
        duration: 6000
      })
    }

    // Update current order status in store
    // Handle both { order: {...} } and direct order object structures
    const currentOrderResp = orderStore.getCurrentOrder()
    const currentOrderId = currentOrderResp?.order?.id || currentOrderResp?.order?.order_id || currentOrderResp?.id || currentOrderResp?.order_id
    const eventOrderId = event.order_id
    
    logger.debug('🔄 Order update check:', { currentOrderId, eventOrderId, status: event.status })
    
    if (currentOrderId && (String(currentOrderId) === String(eventOrderId))) {
      orderStore.updateOrderStatus(event.status)
      // If this is a terminal status, stop the polling fallback
      if (event.status === 'completed' || event.status === 'cancelled' || event.status === 'voided') {
        try { orderStore.stopOrderPolling && orderStore.stopOrderPolling() } catch (e) { logger.debug('[Broadcasts] stopOrderPolling failed', e) }
        
        // End session and navigate to home on completed
        if (event.status === 'completed') {
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

    // Clear order from store
    const currentOrderResp = orderStore.getCurrentOrder()
    if (currentOrderResp?.order_id === Number(event.order.order_id) ||
        currentOrderResp?.order?.order_id === Number(event.order.order_id)) {
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

  // Subscribe to device-specific channel
  const subscribeToDeviceChannel = () => {
    const deviceId = deviceStore.getDeviceId()
    if (!deviceId || !(window as any).Echo) return

    // Subscribe to Device.{deviceId} for order updates
    console.log('[Echo] Subscribing to channel: Device.' + deviceId)
    deviceChannel = (window as any).Echo.channel(`Device.${deviceId}`)
      .listen('.order.updated', (event: OrderUpdatedEvent) => {
        console.log('[Echo] .order.updated', event)
        handleOrderUpdated(event)
      })

    channelStatus.value.device = true
    console.log('[Echo] ✅ Subscribed to channel: Device.' + deviceId)
    logger.debug(`✅ Subscribed to Device.${deviceId}`)
    
    ElNotification({
      title: '📡 Connected',
      message: `Listening to Device.${deviceId}`,
      type: 'success',
      duration: 3000,
      position: 'bottom-right'
    })

    // Subscribe to device.{deviceId} for control events
    console.log('[Echo] Subscribing to channel: device.' + deviceId)
    deviceControlChannel = (window as any).Echo.channel(`device.${deviceId}`)
      .listen('.device.control', (event: DeviceControlEvent) => {
        console.log('[Echo] .device.control', event)
        handleDeviceControl(event)
      })

    channelStatus.value.deviceControl = true
    console.log('[Echo] ✅ Subscribed to channel: device.' + deviceId + ' (control)')
    logger.debug(`✅ Subscribed to device.${deviceId} (control)`)
  }

  // Subscribe to order-specific channels
  const subscribeToOrderChannel = (orderId: string) => {
    if (!orderId || !(window as any).Echo) return

    console.log('[Echo] Subscribing to channel: orders.' + orderId)
    orderChannel = (window as any).Echo.channel(`orders.${orderId}`)
      .listen('.order.created', (event: OrderCreatedEvent) => {
        console.log('[Echo] .order.created', event)
        handleOrderCreated(event)
      })
      .listen('.order.completed', (event: OrderCompletedEvent) => {
        console.log('[Echo] .order.completed', event)
        handleOrderCompleted(event)
      })
      .listen('.order.cancelled', (event: OrderCancelledEvent) => {
        console.log('[Echo] .order.cancelled', event)
        handleOrderCancelled(event)
      })
      .listen('.order.voided', (event: OrderCancelledEvent) => {
        console.log('[Echo] .order.voided', event)
        handleOrderCancelled(event)
      })

    channelStatus.value.order = true
    console.log('[Echo] ✅ Subscribed to channel: orders.' + orderId)
    logger.debug(`✅ Subscribed to orders.${orderId}`)

    // Subscribe to service requests for this order
    console.log('[Echo] Subscribing to channel: service-requests.' + orderId)
    serviceRequestChannel = (window as any).Echo.channel(`service-requests.${orderId}`)
      .listen('.service-request.notification', (event: ServiceRequestEvent) => {
        console.log('[Echo] .service-request.notification', event)
        handleServiceRequest(event)
      })

    channelStatus.value.serviceRequest = true
    console.log('[Echo] ✅ Subscribed to channel: service-requests.' + orderId)
    logger.debug(`✅ Subscribed to service-requests.${orderId}`)
  }

  // Unsubscribe from order channels
  const unsubscribeFromOrderChannel = () => {
    const canLeave = typeof (window as any).Echo?.leave === 'function'
    if (orderChannel) {
      console.log(`[🔕 Unsubscribing] Channel: ${orderChannel.name} at ${new Date().toISOString()}`)
      if (canLeave) {
        ;(window as any).Echo.leave(orderChannel.name)
      }
      orderChannel = null
      channelStatus.value.order = false
    }
    if (serviceRequestChannel) {
      console.log(`[🔕 Unsubscribing] Channel: ${serviceRequestChannel.name} at ${new Date().toISOString()}`)
      if (canLeave) {
        ;(window as any).Echo.leave(serviceRequestChannel.name)
      }
      serviceRequestChannel = null
      channelStatus.value.serviceRequest = false
    }
  }

  // Initialize broadcasts
  const initializeBroadcasts = () => {
    if (!(window as any).Echo) {
      logger.warn('Echo not available, broadcasts disabled')
      return
    }

    // Subscribe to device channels
    subscribeToDeviceChannel()

    // Subscribe to current order if exists
    const currentOrderId = sessionStore.getOrderId()
    if (currentOrderId) {
      subscribeToOrderChannel(currentOrderId.toString())
    }

    // Connection event handlers for Reverb/Pusher
    const echo = (window as any).Echo
    if (echo?.connector?.pusher) {
      const pusher = echo.connector.pusher
      
      // Reverb uses state_change event instead of direct bind
      pusher.connection.bind('state_change', (states: any) => {
        const timestamp = new Date().toISOString()
        console.log(`[🔗 WebSocket State Change] ${states.previous || '?'} → ${states.current} at ${timestamp}`)
        logger.debug('WebSocket state change:', states.current)
        
        if (states.current === 'connected') {
          console.log(`[✅ WebSocket Connected] All subscriptions active at ${timestamp}`)
          logger.debug('✅ WebSocket connected')
          ElNotification({
            title: '✅ Connected',
            message: 'Real-time connection established',
            type: 'success',
            duration: 2000,
            position: 'bottom-right'
          })
          // TODO: Enable when backend implements GET /api/events/missing
          // replayMissedEvents()
        } else if (states.current === 'disconnected' || states.current === 'unavailable') {
          logger.debug('⚠️ WebSocket disconnected')
          channelStatus.value = {
            device: false,
            deviceControl: false,
            order: false,
            serviceRequest: false
          }
        }
      })
    }
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
    unsubscribeFromOrderChannel()
    const canLeave = typeof (window as any).Echo?.leave === 'function'
    if (deviceChannel) {
      if (canLeave) {
        (window as any).Echo.leave(deviceChannel.name)
      }
      deviceChannel = null
      channelStatus.value.device = false
    }
    if (deviceControlChannel) {
      if (canLeave) {
        (window as any).Echo.leave(deviceControlChannel.name)
      }
      deviceControlChannel = null
      channelStatus.value.deviceControl = false
    }
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    initializeBroadcasts,
    subscribeToOrderChannel,
    unsubscribeFromOrderChannel,
    replayMissedEvents,
    cleanup,
    channelStatus
  }
}
