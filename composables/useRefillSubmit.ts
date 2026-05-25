// composables/useRefillSubmit.ts
// Live-only wrapper for refill submission.
//
// Strategy: ALWAYS require a live server connection.
// Refills MUST reach the backend immediately — no offline queueing.
// If the device has no server connection, the refill is rejected with a
// blocking error. Kitchen staff never receives an order that cannot print.
//
// - Network error (no response): throws immediately — "Ordering is unavailable. Please call staff."
// - 422/409/503/500: re-thrown for caller to display
// - 401: re-thrown after logging

import { useOrderStore } from "~/stores/Order"
import { useSubmitState } from "~/composables/useSubmitState"
import { logger } from "~/utils/logger"

export interface RefillSubmitResult {
  /** full server response data for online success */
  data?: unknown
}

export function useRefillSubmit () {
    async function submitRefill (payload?: Record<string, unknown>): Promise<RefillSubmitResult> {
        const orderStore = useOrderStore()
        const submitState = useSubmitState()

        if (submitState.isTransitioning.value) {
            logger.warn("[RefillSubmit] Already in progress — duplicate call ignored")
            return {}
        }

        submitState.setSubmitting()

        // -----------------------------------------------------------------------
        // Submit via existing orderStore.submitRefill (handles validation + API call).
        // No offline fallback — if there is no server response the refill is rejected.
        // Idempotency key is generated and persisted to sessionStorage by the store.
        // -----------------------------------------------------------------------
        try {
            const result = await (orderStore.submitRefill as any)(payload)
            submitState.setConfirmed(
                result?.order?.order_number ?? result?.order_number ?? null,
                result?.order?.order_id ?? result?.order_id ?? null
            )
            return { data: result }
        } catch (err: any) {
            const status: number | undefined = err?.response?.status

            // Network failure (no response): hard block — no queueing
            if (!err?.response) {
                logger.warn("[RefillSubmit] Network error — rejecting refill (no offline queue)")
                const message = "Ordering is unavailable. Please call staff."
                submitState.setFailed(message)
                throw new Error(message)
            }

            // 401: token expired
            if (status === 401) {
                logger.error("[RefillSubmit] 401 auth error")
                submitState.setFailed("Authentication failed. Please re-register this device.")
                throw err
            }

            // 419: Laravel CSRF/session protection triggered — backend middleware misconfiguration
            if (status === 419) {
                logger.error("[RefillSubmit] 419 CSRF error — backend treating device API as web/session route. Move API route to Sanctum middleware or exclude from CSRF.")
                const message = "We could not send your order yet. Please ask a staff member for assistance."
                submitState.setFailed(message)
                throw new Error(message)
            }

            // Re-throw all other errors (422, 409, 503, 500, validation) for the caller
            submitState.setFailed(err?.message || "Refill submission failed")
            throw err
        }
    }

    return { submitRefill }
}
