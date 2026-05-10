// composables/useSubmitState.ts
// Manages explicit submit state machine for restaurant-floor clarity.
//
// States:
// - idle: No submit in progress
// - submitting: POST request in flight
// - confirmed: Order successfully submitted (server confirmed)
// - failed: Submission failed — show blocking error to staff

import { computed, reactive } from "vue"
import { logger } from "~/utils/logger"

export type SubmitStateValue = "idle" | "submitting" | "confirmed" | "failed"

interface SubmitStateContext {
  state: SubmitStateValue
  lastError: string | null
  confirmedOrderNumber: string | null
  confirmedOrderId: number | null
}

const stateContext = reactive<SubmitStateContext>({
    state: "idle",
    lastError: null,
    confirmedOrderNumber: null,
    confirmedOrderId: null,
})

export const useSubmitState = () => {
    const state = computed(() => stateContext.state)
    const lastError = computed(() => stateContext.lastError)
    const confirmedOrderNumber = computed(() => stateContext.confirmedOrderNumber)
    const confirmedOrderId = computed(() => stateContext.confirmedOrderId)

    // State transition helpers
    const setSubmitting = () => {
        stateContext.state = "submitting"
        stateContext.lastError = null
        logger.debug("[SubmitState] Transitioning to submitting")
    }

    const setConfirmed = (orderNumber: string | null, orderId: number | null) => {
        stateContext.state = "confirmed"
        stateContext.lastError = null
        stateContext.confirmedOrderNumber = orderNumber
        stateContext.confirmedOrderId = orderId
        logger.debug("[SubmitState] Transitioning to confirmed", { orderNumber, orderId })
    }

    const setFailed = (error: string) => {
        stateContext.state = "failed"
        stateContext.lastError = error
        logger.warn("[SubmitState] Transitioning to failed", { error })
    }

    const setIdle = () => {
        stateContext.state = "idle"
        stateContext.lastError = null
        stateContext.confirmedOrderNumber = null
        stateContext.confirmedOrderId = null
        logger.debug("[SubmitState] Transitioning to idle")
    }

    const reset = () => {
        stateContext.state = "idle"
        stateContext.lastError = null
        stateContext.confirmedOrderNumber = null
        stateContext.confirmedOrderId = null
    }

    // Display helpers
    const stateLabel = computed<string>(() => {
        const m: Record<SubmitStateValue, string> = {
            idle: "Ready",
            submitting: "Submitting order...",
            confirmed: "Order confirmed ✓",
            failed: "Submission failed",
        }
        return m[stateContext.state] ?? "Unknown state"
    })

    const isTransitioning = computed<boolean>(() => {
        return stateContext.state === "submitting"
    })

    const isConfirmed = computed<boolean>(() => {
        return stateContext.state === "confirmed"
    })

    const isFailed = computed<boolean>(() => {
        return stateContext.state === "failed"
    })

    const shouldDisableSubmit = computed<boolean>(() => {
        // Allow submission if state is idle, failed, or confirmed.
        // Confirmed means "last transaction succeeded"; new submission can start fresh transaction.
        return stateContext.state !== "idle" && stateContext.state !== "failed" && stateContext.state !== "confirmed"
    })

    /**
     * Reset to idle state, preparing for a new transaction.
     * Call after refill submission completes (regardless of success/failure).
     */
    const resetForNextTransaction = () => {
        stateContext.state = "idle"
        stateContext.lastError = null
    }

    return {
        // State
        state,
        lastError,
        confirmedOrderNumber,
        confirmedOrderId,

        // Transitions
        setSubmitting,
        setConfirmed,
        setFailed,
        setIdle,
        reset,
        resetForNextTransaction,

        // Helpers
        stateLabel,
        isTransitioning,
        isConfirmed,
        isFailed,
        shouldDisableSubmit,
    }
}
