import { ref, computed } from 'vue'
import type { OrderApiResponse } from '../types'
import { useDeviceStore } from '../stores/Device'
import { useSessionStore } from '../stores/Session'
import { useOrderStore } from '../stores/Order'

/**
 * useRealtimeStatus
 * 
 * Provides real-time observability dashboard showing:
 * - WebSocket connection status
 * - Active subscriptions
 * - Device/table status
 * - Last events and polling
 */
export const useRealtimeStatus = () => {
  const deviceStore = useDeviceStore()
  const sessionStore = useSessionStore()
  const orderStore = useOrderStore()

  // Connection state
  const echoConnected = ref<boolean>(false)
  const websocketState = ref<string>('unknown')
  const lastConnectionTime = ref<string | null>(null)

  // Subscriptions
  const activeSubscriptions = ref<{
    device: boolean
    deviceControl: boolean
    orders: boolean
    serviceRequest: boolean
  }>({
    device: false,
    deviceControl: false,
    orders: false,
    serviceRequest: false
  })

  // Device/Table Status
  const deviceIsActive = computed(() => {
    return !!(deviceStore.getDeviceId() && deviceStore.getTableId() && deviceStore.getToken())
  })

  const tableInfo = computed(() => {
    const table = deviceStore.getTable()
    return {
      id: table?.id,
      name: table?.name,
      status: table?.status || 'unknown',
      isAvailable: table?.is_available ?? false,
      isLocked: table?.is_locked ?? false
    }
  })

  const deviceInfo = computed(() => {
    return {
      id: deviceStore.getDeviceId(),
      ipAddress: deviceStore.getDeviceLastIpAddress() || deviceStore.getLastServerIpUsed(),
      hasToken: !!deviceStore.getToken(),
      expiresAt: deviceStore.expiration
    }
  })

  // Order status
  const currentOrderStatus = computed(() => {
    const orderResp = orderStore.getCurrentOrder()
    const order = (orderResp?.order || orderResp) as (OrderApiResponse['order'] & { unprinted_items_count?: number }) | null | undefined
    return {
      hasOrder: !!order?.id,
      orderId: order?.id,
      orderNumber: order?.order_number,
      status: order?.status,
      hasUnprinted: order?.unprinted_items_count > 0 || false,
      isPolling: orderStore.getIsPolling(),
      pollingOrderId: orderStore.getPollingOrderId()
    }
  })

  // Event tracking
  const lastEventReceived = ref<{
    type: string
    timestamp: string | null
    orderId?: any
  } | null>(null)

  const lastPollingTick = ref<{
    timestamp: string | null
    orderId?: string
    status?: string
    latencyMs?: number
  } | null>(null)

  // Monitor Echo connection state
  const monitorEchoConnection = () => {
    if (typeof window === 'undefined') return

    const checkConnectionState = () => {
      try {
        const echo = (window as any).Echo
        if (!echo) {
          echoConnected.value = false
          websocketState.value = 'unavailable'
          return
        }

        const connector = echo.connector
        if (!connector) {
          echoConnected.value = false
          websocketState.value = 'no-connector'
          return
        }

        const socket = connector?.socket || connector?.pusher?.connection
        if (!socket) {
          echoConnected.value = false
          websocketState.value = 'no-socket'
          return
        }

        // Check Pusher connection state
        if (connector.pusher?.connection?.state) {
          websocketState.value = connector.pusher.connection.state
          echoConnected.value = connector.pusher.connection.state === 'connected'
          if (echoConnected.value) {
            lastConnectionTime.value = new Date().toISOString()
          }
        }
      } catch (e) {
        console.error('[useRealtimeStatus] Failed to check connection state:', e)
      }
    }

    // Check immediately and then every 2 seconds
    checkConnectionState()
    setInterval(checkConnectionState, 2000)
  }

  // Monitor subscription state (call this from useBroadcasts)
  const updateSubscriptionStatus = (subscriptions: any) => {
    activeSubscriptions.value = subscriptions
  }

  // Monitor events (call this from event handlers in useBroadcasts)
  const trackEventReceived = (eventType: string, orderId?: any) => {
    lastEventReceived.value = {
      type: eventType,
      timestamp: new Date().toISOString(),
      orderId
    }
    console.log(`[📊 Status] Event received: ${eventType}`)
  }

  // Monitor polling (call this from Order.ts polling tick)
  const trackPollingTick = (orderId: string, status: string, latencyMs: number) => {
    lastPollingTick.value = {
      timestamp: new Date().toISOString(),
      orderId,
      status,
      latencyMs
    }
  }

  // Full status dashboard
  const getStatusDashboard = () => {
    return {
      timestamp: new Date().toISOString(),
      connection: {
        echo: echoConnected.value,
        state: websocketState.value,
        lastConnected: lastConnectionTime.value
      },
      subscriptions: {
        ...activeSubscriptions.value,
        isAnyActive: Object.values(activeSubscriptions.value).some(v => v === true)
      },
      device: {
        ...deviceInfo.value,
        isActive: deviceIsActive.value
      },
      table: tableInfo.value,
      order: currentOrderStatus.value,
      lastEvent: lastEventReceived.value,
      lastPolling: lastPollingTick.value,
      summary: {
        isFullyOperational: echoConnected.value && Object.values(activeSubscriptions.value).some(v => v === true) && deviceIsActive.value,
        connectionHealthy: echoConnected.value,
        subscriptionsActive: Object.values(activeSubscriptions.value).some(v => v === true),
        deviceReady: deviceIsActive.value,
        orderActive: currentOrderStatus.value.hasOrder
      }
    }
  }

  // Log dashboard to console
  const logStatusDashboard = () => {
    const dashboard = getStatusDashboard()
    console.log(
      `%c🔍 REALTIME STATUS DASHBOARD`,
      `background: #1a1a1a; color: #00ff00; font-weight: bold; font-size: 14px; padding: 5px 10px; border-radius: 3px;`
    )
    console.table({
      'Echo Connected': dashboard.connection.echo ? '✅' : '❌',
      'WebSocket State': dashboard.connection.state,
      'Subscriptions Active': dashboard.subscriptions.isAnyActive ? '✅' : '❌',
      'Device Active': dashboard.device.isActive ? '✅' : '❌',
      'Has Order': dashboard.order.hasOrder ? '✅' : '❌',
      'Has Polling': dashboard.order.isPolling ? '✅' : '❌',
      'Last Event': dashboard.lastEvent?.type || 'none',
      'Last Polling': dashboard.lastPolling?.timestamp || 'none'
    })
    console.log('📊 Full Dashboard:', dashboard)
    return dashboard
  }

  // Initialize monitoring
  const initializeMonitoring = () => {
    monitorEchoConnection()
  }

  // Expose status displays for templates
  const connectionIndicator = computed(() => {
    if (echoConnected.value) return '🟢'
    if (websocketState.value === 'connecting') return '🟡'
    return '🔴'
  })

  const subscriptionsIndicator = computed(() => {
    const count = Object.values(activeSubscriptions.value).filter(v => v === true).length
    if (count >= 3) return '🟢'
    if (count > 0) return '🟡'
    return '🔴'
  })

  const deviceIndicator = computed(() => {
    return deviceIsActive.value ? '🟢' : '🔴'
  })

  const orderIndicator = computed(() => {
    if (!currentOrderStatus.value.hasOrder) return '⚪'
    if (currentOrderStatus.value.status === 'completed') return '🟢'
    if (currentOrderStatus.value.hasUnprinted) return '🔴'
    return '🟡'
  })

  return {
    // Monitoring
    initializeMonitoring,
    monitorEchoConnection,
    updateSubscriptionStatus,
    trackEventReceived,
    trackPollingTick,
    logStatusDashboard,
    getStatusDashboard,

    // State
    echoConnected,
    websocketState,
    lastConnectionTime,
    activeSubscriptions,
    lastEventReceived,
    lastPollingTick,

    // Computed
    deviceIsActive,
    tableInfo,
    deviceInfo,
    currentOrderStatus,

    // Indicators (for UI display)
    connectionIndicator,
    subscriptionsIndicator,
    deviceIndicator,
    orderIndicator
  }
}
