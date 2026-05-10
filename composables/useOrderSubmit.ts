// composables/useOrderSubmit.ts
// Live-only wrapper for initial order submission.
//
// Strategy: ALWAYS require a live server connection.
// Orders MUST reach the backend immediately — no offline queueing.
// If the device has no server connection, the submission is rejected with a
// blocking error. Kitchen staff never receives an order that cannot print.
//
// - Network error (no response): throws immediately — "Ordering is unavailable. Please call staff."
// - 409 responses: handled internally by Order store (setOrderCreated + return)
// - 401: re-thrown after logging

import { useOrderStore } from "~/stores/Order"
import { useSubmitState } from "~/composables/useSubmitState"
import { logger } from "~/utils/logger"

function generateIdempotencyKey (): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return (crypto as any).randomUUID() as string
    }
    return `idemp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export interface OrderSubmitResult {
  /** numeric order id if submission succeeded online */
  orderId?: number | string | null
  /** full server response data for online success */
  data?: unknown
}

export function useOrderSubmit () {
    async function submitOrder (payload: Record<string, unknown>): Promise<OrderSubmitResult> {
        const orderStore = useOrderStore()
        const submitState = useSubmitState()

        const idempotencyKey = generateIdempotencyKey()
        const submitOptions = {
            headers: {
                "X-Idempotency-Key": idempotencyKey,
            },
        }

        submitState.setSubmitting()

        // -----------------------------------------------------------------------
        // Submit via existing orderStore (handles validation + API call).
        // No offline fallback — if there is no server response the order is rejected.
        // -----------------------------------------------------------------------
        try {
            const result = await (orderStore.submitOrder as any)(payload, submitOptions)
            submitState.setConfirmed(
                result?.order?.order_number ?? result?.order_number ?? null,
                result?.order?.order_id ?? result?.order_id ?? null
            )
            return { data: result }
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
                return { data: err?.response?.data }
            }

            // Network failure (no response): hard block — no queueing
            if (!err?.response) {
                logger.warn("[OrderSubmit] Network error — rejecting order (no offline queue)")
                const message = "Ordering is unavailable. Please call staff."
                submitState.setFailed(message)
                throw new Error(message)
            }

            // 401: token expired
            if (status === 401) {
                logger.error("[OrderSubmit] 401 auth error")
                submitState.setFailed("Authentication failed. Please re-register this device.")
                throw err
            }

            // Re-throw all other errors (422 validation, 500, etc.) for the caller
            submitState.setFailed(err?.message || "Order submission failed")
            throw err
        }
    }

    return { submitOrder }
}
