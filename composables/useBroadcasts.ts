import { ref, unref, watch } from "vue"
import { ElNotification, ElMessage } from "element-plus"
import type { Channel } from "laravel-echo"
import { useDeviceStore } from "~/stores/Device"
import { useMenuStore } from "~/stores/Menu"
import { useOrderStore } from "~/stores/Order"
import { useSessionStore } from "~/stores/Session"
import { useDiscountStore } from "~/stores/Discount"
import { useConnectionStore } from "~/stores/Connection"
import { extractOrderId } from "~/utils/orderHelpers"
import { logger } from "~/utils/logger"
import { useSessionEndFlow } from "~/composables/useSessionEndFlow"
import type { ActiveOrderSnapshot } from "~/types"

/** Echo channel with the concrete `name` property exposed by all Pusher-backed channels */
type EchoChannel = Channel & { name: string }

// ─── WebSocket event interfaces ────────────────────────────────────────────
// Shapes MUST stay in sync with woosoo-nexus broadcast events.
// Reference: contracts/websocket-events.contract.md
// Note: backend does NOT send `eventId` — removed from all interfaces.

/** Single service request embedded in order events */
interface ServiceRequest {
  id: number
  order_id: number | null
  table_id: number
  device_id: number
  type: string
  message?: string
  status: "pending" | "acknowledged" | "completed"
  created_at: string
  updated_at: string
}

interface OrderCreatedEvent {
  order: {
    id: number
    order_id: number | null
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
    subtotal: string
    guest_count: number
    created_at: string
    updated_at: string
    is_printed: boolean
    device: { id: number; name: string }
    table: { id: number; name: string }
    serviceRequests: ServiceRequest[]
  }
}

/** Emitted by OrderStatusUpdated — channel Device.{deviceId} */
interface OrderUpdatedEvent {
  order: {
    id: number
    order_id: number | null
    order_number: string
    device_id: number
    table_id: number
    branch_id: number
    status: "pending" | "confirmed" | "in_progress" | "ready" | "completed" | "cancelled" | "voided"
    is_printed: boolean
    total: string
    created_at: string
    updated_at: string
    device: { id: number; name: string }
    table: { id: number; name: string }
    /** Refill items sent by backend on order.updated after refill */
    items?: Array<{ id: number; name: string; quantity: number; price: string; is_refill: boolean }>
  }
}

interface OrderCompletedEvent {
  order: {
    id: number
    order_id: number | null
    order_number: string
    device_id: number
    table_id: number
    branch_id: number
    session_id: number
    status: "completed"
    items: Array<{ id: number; name: string; quantity: number; price: string; is_refill: boolean }>
    total: string
    tax: string
    discount: string | null
    subtotal: string
    guest_count: number
    created_at: string
    updated_at: string
    is_printed: boolean
    device: { id: number; name: string }
    table: { id: number; name: string }
    serviceRequests: ServiceRequest[]
  }
}

interface OrderCancelledEvent {
  order: {
    id: number
    order_id: number | null
    order_number: string
    device_id: number
    status: "cancelled" | "voided"
  }
}

interface OrderDetailsUpdatedEvent {
  order: {
    order_id: number
    guest_count: number | null
    subtotal: string | null
    tax: string | null
    discount: string | null
    total: string | null
  }
}

interface DiscountAppliedEvent {
  order_id: number
  totals: { subtotal: number; discount_total: number; total: number }
}

interface OrderStartedFromPosEvent {
  snapshot: ActiveOrderSnapshot
}

interface ServiceRequestEvent {
  service_request: ServiceRequest
}

interface DeviceControlEvent {
  action: "restart" | "lock" | "unlock" | "update" | "reload" | "message" | "volume" | "table_changed"
  payload: {
    message?: string
    volume?: number
    url?: string
    duration?: number
    [key: string]: unknown
  }
  deviceId: number
}

export const useBroadcasts = () => {
    const deviceStore = useDeviceStore()
    const orderStore = useOrderStore()
    const sessionStore = useSessionStore()
    const { triggerSessionEnd } = useSessionEndFlow()

    const getCurrentOrderId = (): string | number | null => unref(orderStore.serverOrderId)
    const getEventOrderId = (payload: { order?: Record<string, unknown> }): string | number | null => extractOrderId(payload?.order ?? payload)

    let deviceChannel: EchoChannel | null = null
    let orderChannel: EchoChannel | null = null
    let serviceRequestChannel: EchoChannel | null = null
    let sessionChannel: EchoChannel | null = null
    let tableChannel: EchoChannel | null = null
    let subscribedSessionId: number | string | null = null
    let stopSessionIdWatcher: (() => void) | null = null
    let stopOrderIdWatcher: (() => void) | null = null
    let stopTableIdWatcher: (() => void) | null = null
    let reloadTimeoutId: number | null = null
    let menuRefreshTimeoutId: number | null = null

    // BUG-7 Fix: Exponential backoff for WebSocket reconnection
    let reconnectAttempts = 0
    let reconnectTimer: number | null = null
    let boundPusherConnection: unknown = null
    let boundStateChangeHandler: ((states: { current: string; previous: string }) => void) | null = null
    let boundMessageHandler: (() => void) | null = null
    const RECONNECTION_BACKOFF = [1, 2, 4, 8, 16, 30, 60] // seconds, capped at 60s

    // Silent-death watchdog: fires every 30s and forces a disconnect when the socket
    // reports "connected" but has seen no *transport* activity for 3 minutes. Activity
    // is fed by the Pusher connection's raw "message" frames (data events plus the
    // server's periodic ping/pong keepalive), NOT app-level broadcasts — so an
    // ordinarily quiet tablet with a healthy socket is left alone, and only genuinely
    // zombie transports (no frames at all, which Pusher's own keepalive can miss) trip it.
    const WATCHDOG_INTERVAL_MS = 30_000
    const WATCHDOG_SILENCE_THRESHOLD_MS = 180_000
    let watchdogTimer: number | null = null
    let lastEventAt = 0

    const touchLastEvent = () => { lastEventAt = Date.now() }

    const startWatchdog = () => {
        if (watchdogTimer !== null) { return }
        watchdogTimer = window.setInterval(() => {
            const connectionStore = useConnectionStore()
            if (unref(connectionStore.reverbState) !== "connected") { return }
            const silentMs = Date.now() - lastEventAt
            if (silentMs < WATCHDOG_SILENCE_THRESHOLD_MS) { return }
            logger.warn(`[🔍 Watchdog] ${Math.round(silentMs / 1000)}s silence on "connected" socket — forcing disconnect`)
            touchLastEvent() // reset before disconnect to prevent rapid re-triggers
            const pusherConn = (window as any).Echo?.connector?.pusher?.connection
            if (pusherConn && typeof pusherConn.disconnect === "function") {
                pusherConn.disconnect()
            } else {
                scheduleReconnection()
            }
        }, WATCHDOG_INTERVAL_MS)
    }

    const stopWatchdog = () => {
        if (watchdogTimer !== null) {
            window.clearInterval(watchdogTimer)
            watchdogTimer = null
        }
    }

    const scheduleReconnection = () => {
        const connectionStore = useConnectionStore()

        if (reconnectTimer) { return } // Already scheduled

        reconnectAttempts++
        connectionStore.setReverbState("disconnected")
        connectionStore.setReconnectAttempt(reconnectAttempts)
        const backoffIndex = Math.min(reconnectAttempts - 1, RECONNECTION_BACKOFF.length - 1)
        const delaySeconds = RECONNECTION_BACKOFF[backoffIndex]

        logger.debug(`[🔄 WebSocket] Scheduling reconnection in ${delaySeconds}s (attempt ${reconnectAttempts})`)

        reconnectTimer = window.setTimeout(() => {
            reconnectTimer = null
            logger.debug(`[🔄 WebSocket] Attempting reconnection (attempt ${reconnectAttempts})`)

            // Re-subscribe to channels (Echo handles socket reconnection internally)
            subscribeToDeviceChannel()
            const currentOrderId = sessionStore.getOrderId()
            if (currentOrderId) {
                subscribeToOrderChannel(currentOrderId.toString())
            }
        }, delaySeconds * 1000)
    }

    const cancelReconnection = () => {
        const connectionStore = useConnectionStore()

        if (reconnectTimer) {
            window.clearTimeout(reconnectTimer)
            reconnectTimer = null
        }
        reconnectAttempts = 0 // Reset on successful connection
        lastEventAt = Date.now() // Reset watchdog clock on reconnect
        connectionStore.setReverbState("connected")
        connectionStore.setReconnectAttempt(0)
    }

    // Channel connection status
    const channelStatus = ref({
        device: false,
        deviceControl: false,
        order: false,
        serviceRequest: false
    })

    // Event Handlers
    const handleOrderCreated = (event: OrderCreatedEvent) => {
        touchLastEvent()
        logger.debug("[📨 .order.created]", { order_id: event.order.order_id, order_number: event.order.order_number })

        ElNotification({
            title: "Order Confirmed",
            message: `Order ${event.order.order_number} has been placed successfully!`,
            type: "success",
            duration: 5000
        })

        // Sync both stores to the POS-canonical order_id so getCurrentOrderId()
        // (which reads orderStore.serverOrderId) and the channel watcher both
        // use the same canonical identifier for all subsequent match guards.
        if (sessionStore.getSessionId() === event.order.session_id) {
            sessionStore.setOrderId(event.order.order_id)
            orderStore.setServerOrderId(event.order.order_id)
        }
    }

    const handleOrderUpdated = (event: OrderUpdatedEvent) => {
        touchLastEvent()
        const { order } = event
        logger.debug("[📨 .order.updated]", { order_id: order.order_id, status: order.status })

        const statusMessages: Record<string, { title: string; message: string; type: "success" | "warning" | "info" | "error" }> = {
            in_progress: {
                title: "Order in Progress",
                message: "Your order is being prepared by our kitchen!",
                type: "info"
            },
            ready: {
                title: "Order Ready! 🔥",
                message: "Your delicious food is ready to be served!",
                type: "success"
            },
            completed: {
                title: "Order Completed",
                message: "Enjoy your meal!",
                type: "success"
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
        const currentOrderId = getCurrentOrderId()
        const eventOrderId = getEventOrderId(event)

        logger.debug("🔄 Order update check:", { currentOrderId, eventOrderId, status: order.status })

        if (currentOrderId != null && eventOrderId != null && String(currentOrderId) === String(eventOrderId)) {
            orderStore.updateOrderStatus(order.status)
            if (["completed", "voided", "cancelled"].includes(order.status)) {
                triggerSessionEnd(order.status as "completed" | "voided" | "cancelled", { source: "broadcast" })
            }
        }
    }

    const handleOrderCompleted = (event: OrderCompletedEvent) => {
        touchLastEvent()
        logger.debug("Order completed:", event.order)

        ElNotification({
            title: "✅ Order Complete",
            message: `Order ${event.order.order_number} has been completed. Thank you!`,
            type: "success",
            duration: 8000
        })

        // Mark order as completed in store
        const currentOrderId = getCurrentOrderId()
        const eventOrderId = getEventOrderId(event)

        logger.debug("✅ Order completed check:", { currentOrderId, eventOrderId })

        if (currentOrderId != null && (String(currentOrderId) === String(eventOrderId))) {
            orderStore.updateOrderStatus("completed")
            triggerSessionEnd("completed", { source: "broadcast", orderNumber: event.order.order_number ?? null })
        }
    }

    const handleOrderCancelled = (event: OrderCancelledEvent) => {
        touchLastEvent()
        logger.debug("Order cancelled:", event.order)

        ElNotification({
            title: "Order Cancelled",
            message: `Order ${event.order.order_number} has been cancelled.`,
            type: "warning",
            duration: 8000
        })

        // Clear order from store — compare by normalized order id
        const currentId = getCurrentOrderId()
        const eventOrderId = getEventOrderId(event)
        if (currentId != null && eventOrderId != null && String(currentId) === String(eventOrderId)) {
            orderStore.updateOrderStatus(event.order.status)
            triggerSessionEnd(event.order.status as "cancelled" | "voided", { source: "broadcast", orderNumber: event.order.order_number ?? null })
        }
    }

    const handleOrderDetailsUpdated = (event: OrderDetailsUpdatedEvent) => {
        touchLastEvent()
        logger.debug("[📨 .order.details.updated]", { order_id: event.order.order_id })

        const currentOrderId = getCurrentOrderId()
        if (currentOrderId != null && String(currentOrderId) === String(event.order.order_id)) {
            orderStore.applyDetailsUpdate(event.order)
        }
    }

    const handleDiscountApplied = (event: DiscountAppliedEvent) => {
        touchLastEvent()
        logger.debug("[📨 .discount.applied]", { order_id: event.order_id, discount_total: event.totals.discount_total })

        const currentOrderId = getCurrentOrderId()
        if (currentOrderId != null && String(currentOrderId) === String(event.order_id)) {
            const discountStore = useDiscountStore()
            discountStore.apply(event.totals.discount_total)
            orderStore.updateTotals(event.totals)
            ElNotification({
                title: "Discount Applied",
                message: "A discount has been applied to your order.",
                type: "success",
                duration: 6000,
            })
        }
    }

    const handleServiceRequest = (event: ServiceRequestEvent) => {
        touchLastEvent()
        logger.debug("Service request update:", event.service_request)

        const statusMessages: Record<string, string> = {
            pending: "Request sent to staff",
            acknowledged: "Staff has been notified and will assist you shortly",
            completed: "Request completed!"
        }

        const message = statusMessages[event.service_request.status]
        if (message) {
            ElMessage({
                message,
                type: event.service_request.status === "completed" ? "success" : "info",
                duration: 4000
            })
        }
    }

    const handleDeviceControl = (event: DeviceControlEvent) => {
        touchLastEvent()
        logger.debug("Device control command:", event.action)

        switch (event.action) {
        case "restart":
        case "reload":
            ElMessage.warning("App will restart in 3 seconds...")
            if (reloadTimeoutId) {
                try { window.clearTimeout(reloadTimeoutId) } catch (e) { logger.debug("[Broadcasts] clearTimeout failed", e) }
                reloadTimeoutId = null
            }
            reloadTimeoutId = window.setTimeout(() => {
                window.location.reload()
            }, 3000)
            break

        case "lock":
            ElMessage.error("Device has been locked by administrator")
            // Implement device lock UI
            break

        case "unlock":
            ElMessage.success("Device has been unlocked")
            // Remove device lock UI
            break

        case "message":
            if (event.payload.message) {
                ElNotification({
                    title: "Message from Management",
                    message: event.payload.message,
                    type: "info",
                    duration: 10000
                })
            }
            break

        case "volume":
        // Implement volume control if supported
            logger.debug("Volume set to:", event.payload.volume)
            break

        case "update":
            ElMessage.info("Checking for updates...")
            // Implement update check
            break

        case "table_changed":
            logger.info("[Broadcasts] table_changed received — device store refreshed")
            deviceStore.refresh().then(() => {
                if (deviceStore.getTableId() === null) {
                    ElMessage.warning("Table assignment removed. Contact an administrator.")
                } else {
                    ElNotification({
                        title: "Table Updated",
                        message: `Table reassigned to ${deviceStore.getTableName() ?? "unknown"}`,
                        type: "info",
                        duration: 5000
                    })
                }
            }).catch((err: unknown) => logger.warn("[Broadcasts] table_changed refresh failed", err))
            break
        }
    }

    // Admin edited tablet categories — refetch the whole menu surface, bypassing
    // the 30-min localStorage cache. Debounced: a burst of admin edits (reorder,
    // multi-attach) emits one event per mutation but should trigger one refetch.
    const handleTabletCategoryUpdated = () => {
        touchLastEvent()
        logger.info("[Broadcasts] tablet_category.updated received — scheduling menu refresh")

        if (menuRefreshTimeoutId) {
            try { window.clearTimeout(menuRefreshTimeoutId) } catch (e) { logger.debug("[Broadcasts] clearTimeout failed", e) }
            menuRefreshTimeoutId = null
        }

        menuRefreshTimeoutId = window.setTimeout(() => {
            menuRefreshTimeoutId = null
            const menuStore = useMenuStore()
            menuStore.refreshMenus()
                .then(() => logger.info("[Broadcasts] Menu data refreshed after tablet_category.updated"))
                .catch((err: unknown) => logger.warn("[Broadcasts] Menu refresh failed after tablet_category.updated", err))
        }, 2000)
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
        const canLeave = typeof (window as any).Echo?.leave === "function"
        if (deviceChannel) {
            if (canLeave) {
                ;(window as any).Echo.leave(deviceChannel.name)
            }
            deviceChannel = null
            channelStatus.value.device = false
            channelStatus.value.deviceControl = false
        }
    }

    // Subscribe to device-specific channel
    const subscribeToDeviceChannel = () => {
        const deviceId = deviceStore.getDeviceId()
        if (!deviceId || !(window as any).Echo) { return }

        // GUARD: Check if already subscribed to this exact device to prevent duplicates on reconnect
        if (deviceChannel && deviceChannel.name === `device.${deviceId}`) {
            logger.debug(`[Echo] Already subscribed to device.${deviceId}, skipping`)
            return
        }

        // Tear down any existing subscriptions before creating new ones to prevent duplicate handlers
        unsubscribeDeviceChannels()

        // Subscribe to device.{deviceId} for order updates and control events (single channel, chained listeners)
        logger.debug("[Echo] Subscribing to channel: device." + deviceId)
        deviceChannel = (window as any).Echo.channel(`device.${deviceId}`)
            .listen(".order.updated", (event: OrderUpdatedEvent) => {
                handleOrderUpdated(event)
            })
            .listen(".device.control", (event: DeviceControlEvent) => {
                handleDeviceControl(event)
            })
            .listen(".tablet_category.updated", () => {
                handleTabletCategoryUpdated()
            })

        channelStatus.value.device = true
        channelStatus.value.deviceControl = true
        logger.debug("[Echo] ✅ Subscribed to channel: device." + deviceId)
        logger.debug(`✅ Subscribed to device.${deviceId}`)

        ElNotification({
            title: "📡 Connected",
            message: `Listening to device.${deviceId}`,
            type: "success",
            duration: 3000,
            position: "bottom-right"
        })
    }

    // Subscribe to order-specific channels
    const subscribeToOrderChannel = (orderId: string) => {
        if (!orderId || !(window as any).Echo) { return }

        // GUARD: Check if already subscribed to this exact order to prevent duplicates on reconnect
        if (orderChannel && orderChannel.name === `orders.${orderId}`) {
            logger.debug(`[Echo] Already subscribed to orders.${orderId}, skipping`)
            return
        }

        unsubscribeFromOrderChannel()

        logger.debug("[Echo] Subscribing to orders." + orderId)
        orderChannel = (window as any).Echo.channel(`orders.${orderId}`)
            .listen(".order.created", (event: OrderCreatedEvent) => {
                handleOrderCreated(event)
            })
            .listen(".order.completed", (event: OrderCompletedEvent) => {
                handleOrderCompleted(event)
            })
            .listen(".order.cancelled", (event: OrderCancelledEvent) => {
                handleOrderCancelled(event)
            })
            .listen(".order.voided", (event: OrderCancelledEvent) => {
                handleOrderCancelled(event)
            })
            .listen(".order.details.updated", (event: OrderDetailsUpdatedEvent) => {
                handleOrderDetailsUpdated(event)
            })
            .listen(".discount.applied", (event: DiscountAppliedEvent) => {
                handleDiscountApplied(event)
            })

        channelStatus.value.order = true
        logger.debug(`✅ Subscribed to orders.${orderId}`)

        // Subscribe to service requests for this order
        logger.debug("[Echo] Subscribing to service-requests." + orderId)
        serviceRequestChannel = (window as any).Echo.channel(`service-requests.${orderId}`)
            .listen(".service-request.notification", (event: ServiceRequestEvent) => {
                handleServiceRequest(event)
            })

        channelStatus.value.serviceRequest = true
        logger.debug(`✅ Subscribed to service-requests.${orderId}`)
    }

    // Unsubscribe from order channels
    const unsubscribeFromOrderChannel = () => {
        const canLeave = typeof (window as any).Echo?.leave === "function"
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

    const subscribeToSessionChannel = (sessionId: number | string) => {
        if (!sessionId || !(window as any).Echo) { return }
        unsubscribeFromSessionChannel()
        logger.debug("[Echo] Subscribing to session." + sessionId)
        sessionChannel = (window as any).Echo.channel(`session.${sessionId}`)
            .listen(".session.reset", (_event: { session_id: number; version: number }) => {
                touchLastEvent()
                logger.info("[Broadcasts] session.reset received — ending session", { session_id: _event.session_id })
                triggerSessionEnd("unknown", { source: "broadcast" })
            })
        subscribedSessionId = sessionId
        logger.debug(`✅ Subscribed to session.${sessionId}`)
    }

    const unsubscribeFromSessionChannel = () => {
        if (sessionChannel && subscribedSessionId) {
            const canLeave = typeof (window as any).Echo?.leave === "function"
            if (canLeave) {
                ;(window as any).Echo.leave(`session.${subscribedSessionId}`)
            }
        }
        sessionChannel = null
        subscribedSessionId = null
    }

    const subscribeToTableChannel = (tableId: string | number) => {
        if (!tableId || !(window as any).Echo) { return }
        if (tableChannel?.name === `table.${tableId}`) { return }
        if (tableChannel) {
            const canLeave = typeof (window as any).Echo?.leave === "function"
            if (canLeave) { ;(window as any).Echo.leave(tableChannel.name) }
        }
        logger.debug("[Echo] Subscribing to table." + tableId)
        tableChannel = (window as any).Echo.channel(`table.${tableId}`)
            .listen(".order.started-from-pos", (event: OrderStartedFromPosEvent) => {
                touchLastEvent()
                logger.debug("[📨 .order.started-from-pos]", { order_id: event.snapshot?.order_id })
                const currentTableId = deviceStore.getTableId()
                if (!event.snapshot || currentTableId == null || String(event.snapshot.table_id) !== String(currentTableId)) { return }
                if (!sessionStore.getIsActive()) {
                    const discountStore = useDiscountStore()
                    orderStore.hydrateFromSnapshot(event.snapshot)
                    sessionStore.hydrateFromSnapshot(event.snapshot)
                    discountStore.hydrate(event.snapshot.discounts ?? [])
                    navigateTo("/order/in-session")
                }
            })
        logger.debug(`✅ Subscribed to table.${tableId}`)
    }

    const unsubscribeFromTableChannel = () => {
        if (tableChannel) {
            const canLeave = typeof (window as any).Echo?.leave === "function"
            if (canLeave) { ;(window as any).Echo.leave(tableChannel.name) }
            tableChannel = null
        }
    }

    const ensureSessionChannelAutoSubscription = () => {
        if (stopSessionIdWatcher) { return }

        // Own session.{id} subscription from the long-lived app bootstrap closure.
        // This prevents page-scoped closures from registering listeners that cleanup()
        // can never reach.
        stopSessionIdWatcher = watch(
            () => sessionStore.getSessionId(),
            (sessionId) => {
                if (!sessionId) {
                    unsubscribeFromSessionChannel()
                    return
                }
                if (String(subscribedSessionId) === String(sessionId)) { return }
                subscribeToSessionChannel(sessionId)
            },
            { immediate: true }
        )
    }

    const ensureOrderChannelAutoSubscription = () => {
        if (stopOrderIdWatcher) { return }

        // Mirrors ensureSessionChannelAutoSubscription: watches for an orderId to
        // appear (e.g. after order placement mid-session) and subscribes to
        // orders.{id} immediately. Without this, the order channel is only
        // subscribed at initializeBroadcasts time — before any order exists.
        stopOrderIdWatcher = watch(
            () => sessionStore.getOrderId() ?? orderStore.serverOrderId,
            (orderId) => {
                if (!orderId) {
                    unsubscribeFromOrderChannel()
                    return
                }
                subscribeToOrderChannel(String(orderId))
            },
            { immediate: true }
        )
    }

    const ensureTableChannelAutoSubscription = () => {
        if (stopTableIdWatcher) { return }

        stopTableIdWatcher = watch(
            () => deviceStore.getTableId(),
            (tableId) => {
                if (!tableId) {
                    unsubscribeFromTableChannel()
                    return
                }
                if (tableChannel?.name === `table.${tableId}`) { return }
                subscribeToTableChannel(tableId)
            },
            { immediate: true }
        )
    }

    const resubscribeChannels = () => {
        subscribeToDeviceChannel()
        const currentOrderId = sessionStore.getOrderId()
        if (currentOrderId) {
            subscribeToOrderChannel(String(currentOrderId))
        }
        const currentSessionId = sessionStore.getSessionId()
        if (currentSessionId) {
            subscribeToSessionChannel(currentSessionId)
        }
    }

    const unbindConnectionStateHandler = () => {
        const conn = boundPusherConnection as Record<string, unknown> | null
        if (conn && typeof conn.unbind === "function") {
            const unbind = conn.unbind as (event: string, handler: unknown) => void
            if (boundStateChangeHandler) {
                try {
                    unbind("state_change", boundStateChangeHandler)
                } catch (e) {
                    logger.debug("[Broadcasts] unbind state_change failed", e)
                }
            }
            if (boundMessageHandler) {
                try {
                    unbind("message", boundMessageHandler)
                } catch (e) {
                    logger.debug("[Broadcasts] unbind message failed", e)
                }
            }
        }
        boundPusherConnection = null
        boundStateChangeHandler = null
        boundMessageHandler = null
    }

    const bindConnectionStateHandler = () => {
        const echo = (window as any).Echo
        const connection = echo?.connector?.pusher?.connection
        if (!connection || typeof connection.bind !== "function") {
            return
        }
        if (boundPusherConnection === connection && boundStateChangeHandler) {
            return
        }

        unbindConnectionStateHandler()

        boundStateChangeHandler = (states: { current: string; previous: string }) => {
            const connectionStore = useConnectionStore()
            const timestamp = new Date().toISOString()
            logger.debug(`[🔗 WebSocket State Change] ${states.previous || "?"} → ${states.current} at ${timestamp}`)
            logger.debug("WebSocket state change:", states.current)

            if (states.current === "connected") {
                logger.debug(`[✅ WebSocket Connected] All subscriptions active at ${timestamp}`)
                logger.debug("✅ WebSocket connected")
                connectionStore.setReverbState("connected")
                cancelReconnection()
                resubscribeChannels()
                ElNotification({
                    title: "✅ Connected",
                    message: "Real-time connection established",
                    type: "success",
                    duration: 2000,
                    position: "bottom-right"
                })
                return
            }

            if (states.current === "disconnected") {
                connectionStore.setReverbState("disconnected")
                logger.warn(`⚠️ WebSocket ${states.current} — scheduling reconnect`)
                resetChannelStatus()
                scheduleReconnection()
            } else if (states.current === "unavailable") {
                connectionStore.setReverbState("unavailable")
                logger.warn(`⚠️ WebSocket ${states.current} — scheduling reconnect`)
                resetChannelStatus()
                scheduleReconnection()
            } else if (states.current === "failed") {
                connectionStore.setReverbState("failed")
                logger.warn(`⚠️ WebSocket ${states.current} — scheduling reconnect`)
                resetChannelStatus()
                scheduleReconnection()
            }
        }

        connection.bind("state_change", boundStateChangeHandler)

        // Feed the silent-death watchdog from transport-level traffic. Every frame the
        // server sends — real data events and the protocol ping/pong keepalive — fires
        // "message", so a healthy-but-idle socket keeps the watchdog satisfied without
        // any business broadcast. Only a transport that stops emitting entirely (a true
        // zombie) goes silent long enough to trip the disconnect.
        boundMessageHandler = () => { touchLastEvent() }
        connection.bind("message", boundMessageHandler)

        boundPusherConnection = connection
    }

    // Initialize broadcasts
    const initializeBroadcasts = () => {
        if (!(window as any).Echo) {
            logger.warn("Echo not available, broadcasts disabled")
            return
        }

        // Subscribe to device channels
        subscribeToDeviceChannel()

        // Reactively subscribe to order channel whenever an orderId appears
        // (covers order placed mid-session, reconnects, and page reload recovery).
        ensureOrderChannelAutoSubscription()

        // Keep session.{id} subscription in sync with session lifecycle.
        ensureSessionChannelAutoSubscription()

        // Reactively subscribe to table channel so it tracks device table reassignment.
        ensureTableChannelAutoSubscription()

        bindConnectionStateHandler()
        lastEventAt = Date.now()
        startWatchdog()
    }

    // Cleanup on unmount
    const cleanup = () => {
    // Clear any pending timeouts to prevent memory leaks in kitchen environment
        if (reloadTimeoutId) {
            try { window.clearTimeout(reloadTimeoutId) } catch (e) { logger.debug("[Broadcasts] cleanup clearTimeout failed", e) }
            reloadTimeoutId = null
        }
        if (menuRefreshTimeoutId) {
            try { window.clearTimeout(menuRefreshTimeoutId) } catch (e) { logger.debug("[Broadcasts] cleanup menuRefresh timer failed", e) }
            menuRefreshTimeoutId = null
        }
        // BUG-7 Fix: Clear reconnection timer on cleanup
        if (reconnectTimer) {
            try { window.clearTimeout(reconnectTimer) } catch (e) { logger.debug("[Broadcasts] cleanup reconnection timer failed", e) }
            reconnectTimer = null
        }
        reconnectAttempts = 0

        unsubscribeFromOrderChannel()
        unsubscribeFromSessionChannel()
        unsubscribeFromTableChannel()
        if (stopOrderIdWatcher) {
            stopOrderIdWatcher()
            stopOrderIdWatcher = null
        }
        if (stopSessionIdWatcher) {
            stopSessionIdWatcher()
            stopSessionIdWatcher = null
        }
        if (stopTableIdWatcher) {
            stopTableIdWatcher()
            stopTableIdWatcher = null
        }
        unsubscribeDeviceChannels()
        unbindConnectionStateHandler()
        stopWatchdog()
        resetChannelStatus()
    }

    return {
        initializeBroadcasts,
        subscribeToOrderChannel,
        unsubscribeFromOrderChannel,
        subscribeToSessionChannel,
        cleanup,
        channelStatus
    }
}
