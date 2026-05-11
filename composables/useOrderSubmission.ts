import { useOrderStore } from "../stores/Order"
import { logger } from "../utils/logger"
import { useSubmissionIdempotency } from "./useSubmissionIdempotency"

export function useOrderSubmission () {
    const orderStore = useOrderStore()
    const {
        createSubmission,
        completeSubmission,
        resetSubmission,
        canSubmit
    } = useSubmissionIdempotency()

    const submitOrderWithIdempotency = async (payload?: any) => {
        if (!canSubmit()) {
            throw new Error("Order submission already in progress")
        }

        const clientSubmissionId = createSubmission()

        try {
            logger.info(`[OrderSubmission] Submitting order with client_submission_id: ${clientSubmissionId}`)

            const result = await orderStore.submitOrder(payload, {
                clientSubmissionId
            })

            completeSubmission()
            logger.info(`[OrderSubmission] Order submitted successfully: ${clientSubmissionId}`)

            return result
        } catch (error) {
            logger.error(`[OrderSubmission] Order submission failed: ${clientSubmissionId}`, error)
            completeSubmission()
            throw error
        }
    }

    const submitRefillWithIdempotency = async (payload?: any) => {
        if (!canSubmit()) {
            throw new Error("Refill submission already in progress")
        }

        const clientSubmissionId = createSubmission()

        try {
            logger.info(`[OrderSubmission] Submitting refill with client_submission_id: ${clientSubmissionId}`)

            const result = await orderStore.submitRefill(payload, {
                clientSubmissionId
            })

            completeSubmission()
            logger.info(`[OrderSubmission] Refill submitted successfully: ${clientSubmissionId}`)

            return result
        } catch (error) {
            logger.error(`[OrderSubmission] Refill submission failed: ${clientSubmissionId}`, error)
            completeSubmission()
            throw error
        }
    }

    return {
        submitOrderWithIdempotency,
        submitRefillWithIdempotency,
        resetSubmission,
        canSubmit
    }
}
