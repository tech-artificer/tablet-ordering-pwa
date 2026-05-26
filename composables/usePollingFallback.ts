import { computed, ref, watch } from "vue"
import { storeToRefs } from "pinia"
import { useConnectionStore } from "~/stores/Connection"
import { useOrderStore } from "~/stores/Order"
import { useSessionStore } from "~/stores/Session"
import { useApi } from "~/composables/useApi"
import { useSessionEndFlow } from "~/composables/useSessionEndFlow"
import { useRealtimeStatus } from "~/composables/useRealtimeStatus"
import { safeValidate, OrderStatusResponseSchema } from "~/schemas/api"
import { logger } from "~/utils/logger"

const POLL_INTERVAL_MS = 10_000
const TERMINAL_STATUSES = new Set(["completed", "voided", "cancelled"])

// Singleton guard — only one polling loop at a time across all component instances
let activeIntervalId: ReturnType<typeof setInterval> | null = null
// Reentrancy guard — prevent setInterval from stacking concurrent requests when
// a previous pollOnce() is still awaiting the API (e.g. on degraded connectivity).
let pollInFlight = false

export function usePollingFallback () {
    const isPolling = ref(false)

    const connectionStore = useConnectionStore()
    const orderStore = useOrderStore()
    const sessionStore = useSessionStore()
    const realtimeStatus = useRealtimeStatus()

    function stopPolling () {
        if (activeIntervalId !== null) {
            clearInterval(activeIntervalId)
            activeIntervalId = null
        }
        isPolling.value = false
        connectionStore.setPollingActive(false)
        logger.info("[PollingFallback] Stopped")
    }

    async function pollOnce () {
        if (pollInFlight) { return }
        const orderId = orderStore.serverOrderId ?? sessionStore.getOrderId()
        if (!orderId) {
            stopPolling()
            return
        }

        pollInFlight = true
        const startMs = Date.now()
        try {
            const api = useApi()
            const resp = await api.get(`/api/device-order/by-order-id/${orderId}`)
            const raw = resp?.data ?? null

            const validation = safeValidate(OrderStatusResponseSchema, raw, "PollingFallback")
            const liveOrder = validation.success
                ? (raw?.order || raw?.data || raw)
                : (raw?.order || raw?.data || raw)

            const liveStatus = String(liveOrder?.status || "").toLowerCase()
            const latencyMs = Date.now() - startMs

            realtimeStatus.trackPollingTick(String(orderId), liveStatus, latencyMs)
            logger.debug("[PollingFallback] Poll result", { orderId, liveStatus, latencyMs })

            if (TERMINAL_STATUSES.has(liveStatus)) {
                logger.info("[PollingFallback] Terminal status detected via poll — triggering session end", { liveStatus })
                stopPolling()
                const { triggerSessionEnd } = useSessionEndFlow()
                const orderNumber = String(liveOrder?.order_number || "")
                await triggerSessionEnd(
                    liveStatus as "completed" | "voided" | "cancelled",
                    { source: "polling", orderNumber: orderNumber || null }
                )
            }
        } catch (err) {
            logger.warn("[PollingFallback] Poll request failed", err)
        } finally {
            pollInFlight = false
        }
    }

    function startPolling () {
        if (activeIntervalId !== null) { return } // already running

        const orderId = orderStore.serverOrderId ?? sessionStore.getOrderId()
        if (!orderId) {
            logger.debug("[PollingFallback] No active order — not starting poll")
            return
        }

        logger.warn("[PollingFallback] Reverb escalated — starting HTTP order status polling", { orderId })
        isPolling.value = true
        connectionStore.setPollingActive(true)

        // Poll immediately, then on interval
        pollOnce()
        activeIntervalId = setInterval(pollOnce, POLL_INTERVAL_MS)
    }

    function initialize () {
        const { phase } = storeToRefs(connectionStore)
        const { isActive } = storeToRefs(sessionStore)

        // Watch the effective order id (server-confirmed or session-restored),
        // not just orderStore.serverOrderId. After a reload the session store
        // may already hold the order id while the order store has yet to
        // repopulate — polling would never start otherwise.
        const effectiveOrderId = computed(() => orderStore.serverOrderId ?? sessionStore.getOrderId())

        // Watch both phase AND effectiveOrderId so that if phase is already
        // "escalated" when an order is submitted/restored, polling starts as
        // soon as an order id appears.
        watch(
            [phase, effectiveOrderId],
            ([newPhase, newOrderId]) => {
                if (newPhase === "escalated" && newOrderId !== null) {
                    startPolling()
                } else if (newPhase === "ok") {
                    if (activeIntervalId !== null) {
                        logger.info("[PollingFallback] Reverb recovered — stopping HTTP poll")
                        stopPolling()
                    }
                }
            },
            { immediate: true }
        )

        // Also stop when session ends
        watch(isActive, (active) => {
            if (!active && activeIntervalId !== null) {
                stopPolling()
            }
        })
    }

    return { isPolling, initialize, startPolling, stopPolling }
}
