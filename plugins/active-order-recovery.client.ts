import { useDeviceStore } from "~/stores/Device"
import { useOrderStore } from "~/stores/Order"
import { useSessionStore } from "~/stores/Session"
import { useDiscountStore } from "~/stores/Discount"
import { useApi } from "~/composables/useApi"
import { TERMINAL_ORDER_STATUSES } from "~/stores/Order"
import { API_ENDPOINTS } from "~/config/api"
import { logger } from "~/utils/logger"
import type { ActiveOrderSnapshot } from "~/types"

/**
 * Boot-time plugin: detects a POS-originated active order for this device's
 * table and hydrates the stores so guests can continue ordering (refills only).
 * Runs after device auth (alphabetically after api.client.ts and echo.client.ts).
 *
 * Does nothing if:
 *   - device has no table assignment or no auth token
 *   - a session is already active (order was started on this tablet)
 *   - the server returns 204 (no active POS order)
 *   - the recovered order status is terminal
 */
export default defineNuxtPlugin(async () => {
    const deviceStore = useDeviceStore()
    const orderStore = useOrderStore()
    const sessionStore = useSessionStore()
    const discountStore = useDiscountStore()

    const tableId = deviceStore.getTableId()
    const token = deviceStore.getToken()

    if (!tableId || !token) { return }

    // Skip when a session is already active and an order has been placed.
    if (sessionStore.getIsActive() && orderStore.hasPlacedOrder.value) { return }

    try {
        const api = useApi()
        const resp = await api.get(API_ENDPOINTS.TABLET_TABLE_ACTIVE_ORDER(tableId))

        if (resp?.status === 204 || !resp?.data) { return }

        const payload = resp.data
        const snapshot: ActiveOrderSnapshot = payload?.data ?? payload

        if (!snapshot?.order_id) { return }

        const status = String(snapshot.status ?? "").toLowerCase()
        if ((TERMINAL_ORDER_STATUSES as readonly string[]).includes(status)) { return }

        orderStore.hydrateFromSnapshot(snapshot)
        sessionStore.hydrateFromSnapshot(snapshot)
        discountStore.hydrate(snapshot.discounts ?? [])

        logger.info("[ActiveOrderRecovery] POS order detected — routing to in-session", {
            order_id: snapshot.order_id,
            status: snapshot.status,
        })

        await navigateTo("/order/in-session")
    } catch (err: any) {
        if (err?.response?.status === 204) { return }
        logger.warn("[ActiveOrderRecovery] POS order check failed (non-fatal)", err?.message)
    }
})
