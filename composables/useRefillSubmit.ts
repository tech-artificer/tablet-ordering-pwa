// composables/useRefillSubmit.ts
// Offline-safe wrapper for refill submission (mirrors useOrderSubmit pattern).
//
// Strategy: ALWAYS attempt the fetch via orderStore.submitRefill.
// Network errors (no response) are queued to the offline outbox for SW replay.
// Validation errors (422, 409, 503) and auth errors (401) are re-thrown.
//
// - Network error (no response): queues to Workbox AND Dexie; returns { queued: true }
// - 422/409/503/500: re-thrown for caller to display
// - 401: marked as auth_error in outbox after Axios retry exhausts
// - Refill queue items preserve orderId, guest context, and idempotency key for safe replay

import { useNuxtApp } from "#app"
import { useDeviceStore } from "~/stores/Device"
import { useOrderStore } from "~/stores/Order"
import { useOfflineSyncStore } from "~/stores/OfflineSync"
import { useSubmitState } from "~/composables/useSubmitState"
import { logger } from "~/utils/logger"
import type { OfflineOrderRecord } from "~/types/offline-order"

function generateIdempotencyKey (): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return (crypto as any).randomUUID() as string
    }
    return `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function buildHeadersSnapshot (token: string | null): Record<string, string> {
    const snapshot: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
    }
    if (token) {
        snapshot.Authorization = `Bearer ${token}`
    }
    return snapshot
}

export interface RefillSubmitResult {
  /** true when the refill was queued offline rather than submitted live */
  queued?: boolean
  /** full server response data for online success */
  data?: unknown
}

export function useRefillSubmit () {
    async function submitRefill (payload?: Record<string, unknown>): Promise<RefillSubmitResult> {
        const orderStore = useOrderStore()
        const deviceStore = useDeviceStore()
        const offlineSyncStore = useOfflineSyncStore()
        const submitState = useSubmitState()
        const { $offlineOutbox } = useNuxtApp()
        const deviceToken = typeof deviceStore.token === "string"
            ? deviceStore.token
            : deviceStore.token?.value ?? null

        const idempotencyKey = generateIdempotencyKey()

        submitState.setSubmitting()

        // -----------------------------------------------------------------------
        // Submit via existing orderStore.submitRefill (handles validation + API call).
        // If device is offline the fetch fails immediately; BackgroundSyncPlugin
        // queues it, and the network-error catch path mirrors it in Dexie.
        // -----------------------------------------------------------------------
        try {
            const result = await (orderStore.submitRefill as any)(payload, {
                idempotencyKey
            })
            submitState.setConfirmed(
                result?.order?.order_number ?? result?.order_number ?? null,
                result?.order?.order_id ?? result?.order_id ?? null
            )
            return { queued: false, data: result }
        } catch (err: any) {
            const status: number | undefined = err?.response?.status

            // Network failure (no response): queue for later and let Workbox replay
            if (!err?.response) {
                logger.warn("[RefillSubmit] Network error — queuing to outbox for SW replay")

                // Preserve current order state for safe replay
                const currentOrder = orderStore.currentOrder as any
                const currentOrderId = currentOrder?.order?.order_id ??
                    currentOrder?.order?.id ??
                    currentOrder?.order_id ??
                    currentOrder?.id

                if (!currentOrderId) {
                    logger.error("[RefillSubmit] Cannot queue refill without order ID")
                    submitState.setFailed("Refill submission failed: order ID not available")
                    throw new Error("Refill submission failed: order ID not available for offline queueing")
                }

                // Queue item includes original idempotency key + refill payload context
                const record: OfflineOrderRecord = {
                    id: idempotencyKey,
                    endpoint: `/api/devices/order/${currentOrderId}/refill`,
                    method: "POST",
                    payload: payload || orderStore.buildRefillPayload(),
                    headersSnapshot: buildHeadersSnapshot(deviceToken),
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    retryCount: 0,
                    status: "queued_sw",
                    lastError: err?.message ?? "Network error",
                    idempotencyKey,
                }
                if ($offlineOutbox) {
                    await ($offlineOutbox as any).enqueue(record)
                }
                await offlineSyncStore.refreshPendingCount()
                submitState.setQueued(offlineSyncStore.pendingCount)
                return { queued: true }
            }

            // 401 after Axios retry chain exhausted: token expired
            if (status === 401) {
                logger.error("[RefillSubmit] 401 auth error — marking outbox auth_error")
                submitState.setFailed("Authentication failed. Please re-register this device.")
                if ($offlineOutbox) {
                    const errorMsg = "auth_error: 401 — device token expired"
                    const currentOrder = orderStore.currentOrder as any
                    const currentOrderId = currentOrder?.order?.order_id ??
                        currentOrder?.order?.id ??
                        currentOrder?.order_id ??
                        currentOrder?.id
                    const record: OfflineOrderRecord = {
                        id: idempotencyKey,
                        endpoint: currentOrderId ? `/api/devices/order/${currentOrderId}/refill` : "/api/devices/order/refill",
                        method: "POST",
                        payload: payload || orderStore.buildRefillPayload(),
                        headersSnapshot: buildHeadersSnapshot(deviceToken),
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                        retryCount: 0,
                        status: "auth_error",
                        lastError: errorMsg,
                        idempotencyKey,
                    }
                    await ($offlineOutbox as any).enqueue(record)
                    await offlineSyncStore.refreshPendingCount()
                }
            }

            // Re-throw all other errors (422, 409, 503, 500, validation) for the caller
            submitState.setFailed(err?.message || "Refill submission failed")
            throw err
        }
    }

    return { submitRefill }
}
