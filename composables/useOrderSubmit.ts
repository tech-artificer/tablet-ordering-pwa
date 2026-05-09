// composables/useOrderSubmit.ts
// composables/useOrderSubmit.ts
// Offline-safe wrapper for order submission.
//
// Strategy: ALWAYS attempt the fetch via orderStore.submitOrder.
// Do NOT short-circuit on navigator.onLine — if the device is offline, Axios will
// fail immediately with a network error, which causes Workbox BackgroundSyncPlugin
// to queue the request. The catch block then mirrors the queued entry in the Dexie
// outbox for UI state (pendingCount banner).
//
// Pre-checking isOnline would populate Dexie but silently skip Workbox's queue,
// leaving orders permanently stuck (sync event never fires with an empty queue).
//
// - Network error (no response): queues to Workbox AND Dexie; returns { queued: true }
// - 409 responses: handled internally by Order store (setOrderCreated + return)
// - 401 responses: mark the outbox row as auth_error after Axios retry chain exhausts
// - Refill submission is explicitly blocked when offline (requires confirmed orderId)

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
    // Only capture Bearer token — CSRF not applicable on auth:device routes
    if (token) {
        snapshot.Authorization = `Bearer ${token}`
    }
    return snapshot
}

export interface OrderSubmitResult {
  /** true when the order was queued offline rather than submitted live */
  queued?: boolean
  /** numeric order id if submission succeeded online */
  orderId?: number | string | null
  /** full server response data for online success */
  data?: unknown
}

export function useOrderSubmit () {
    async function submitOrder (payload: Record<string, unknown>): Promise<OrderSubmitResult> {
        const orderStore = useOrderStore()
        const deviceStore = useDeviceStore()
        const offlineSyncStore = useOfflineSyncStore()
        const submitState = useSubmitState()
        const { $offlineOutbox } = useNuxtApp()
        const deviceToken = typeof deviceStore.token === "string"
            ? deviceStore.token
            : deviceStore.token?.value ?? null

        const idempotencyKey = generateIdempotencyKey()
        const submitOptions = {
            headers: {
                "X-Idempotency-Key": idempotencyKey,
            },
        }

        submitState.setSubmitting()

        // -----------------------------------------------------------------------
        // Submit via existing orderStore (handles validation + API call).
        // If device is offline the fetch fails immediately; BackgroundSyncPlugin
        // queues it, and the network-error catch path mirrors it in Dexie.
        // -----------------------------------------------------------------------
        try {
            const result = await (orderStore.submitOrder as any)(payload, submitOptions)
            submitState.setConfirmed(
                result?.order?.order_number ?? result?.order_number ?? null,
                result?.order?.order_id ?? result?.order_id ?? null
            )
            return { queued: false, data: result }
        } catch (err: any) {
            const status: number | undefined = err?.response?.status

            // 409: active order already exists; order store already handles this
            // by calling setOrderCreated internally — treat result as success
            if (status === 409) {
                logger.info("[OrderSubmit] 409 — existing order resumed")
                submitState.setConfirmed(
                    err?.response?.data?.order?.order_number ?? null,
                    err?.response?.data?.order?.order_id ?? null
                )
                return { queued: false, data: err?.response?.data }
            }

            // Network failure (no response): queue for later and let Workbox replay
            if (!err?.response) {
                logger.warn("[OrderSubmit] Network error — queuing to outbox for SW replay")
                const record: OfflineOrderRecord = {
                    id: idempotencyKey,
                    endpoint: "/api/devices/create-order",
                    method: "POST",
                    payload: payload as Record<string, unknown>,
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

            // 401 after Axios retry chain exhausted: token expired, cannot auto-retry
            if (status === 401) {
                logger.error("[OrderSubmit] 401 auth error — marking outbox auth_error")
                submitState.setFailed("Authentication failed. Please re-register this device.")
                if ($offlineOutbox) {
                    const errorMsg = "auth_error: 401 — device token expired"
                    const record: OfflineOrderRecord = {
                        id: idempotencyKey,
                        endpoint: "/api/devices/create-order",
                        method: "POST",
                        payload: payload as Record<string, unknown>,
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

            // Re-throw all other errors (422 validation, 500, etc.) for the caller
            submitState.setFailed(err?.message || "Order submission failed")
            throw err
        }
    }

    return { submitOrder }
}
