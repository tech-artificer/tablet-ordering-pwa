// composables/useSubmitState.ts
// Manages explicit submit state machine for restaurant-floor clarity.
//
// States:
// - idle: No submit in progress
// - submitting: Initial POST request in flight
// - queued: Order successfully queued offline (will retry automatically)
// - retrying: Background sync attempting to send queued order
// - confirmed: Order successfully submitted (server confirmed)
// - failed: Permanent failure (auth error, terminal order, etc.)
//
// UI can show persistent banner with status + pending count + last sync time.

import { computed, reactive } from "vue"
import { logger } from "~/utils/logger"

export type SubmitStateValue = "idle" | "submitting" | "queued" | "retrying" | "confirmed" | "failed"

interface SubmitStateContext {
  state: SubmitStateValue
  lastError: string | null
  pendingCount: number
  lastSyncAttempt: number | null // epoch ms
  confirmedOrderNumber: string | null
  confirmedOrderId: number | null
}

const stateContext = reactive<SubmitStateContext>({
    state: "idle",
    lastError: null,
    pendingCount: 0,
    lastSyncAttempt: null,
    confirmedOrderNumber: null,
    confirmedOrderId: null,
})

export const useSubmitState = () => {
    const state = computed(() => stateContext.state)
    const lastError = computed(() => stateContext.lastError)
    const pendingCount = computed(() => stateContext.pendingCount)
    const lastSyncAttempt = computed(() => stateContext.lastSyncAttempt)
    const confirmedOrderNumber = computed(() => stateContext.confirmedOrderNumber)
    const confirmedOrderId = computed(() => stateContext.confirmedOrderId)

    // State transition helpers
    const setSubmitting = () => {
        stateContext.state = "submitting"
        stateContext.lastError = null
        logger.debug("[SubmitState] Transitioning to submitting")
    }

    const setQueued = (pendingCount: number) => {
        stateContext.state = "queued"
        stateContext.lastError = null
        stateContext.pendingCount = pendingCount
        logger.debug("[SubmitState] Transitioning to queued", { pendingCount })
    }

    const setRetrying = () => {
        stateContext.state = "retrying"
        stateContext.lastError = null
        logger.debug("[SubmitState] Transitioning to retrying")
    }

    const setConfirmed = (orderNumber: string | null, orderId: number | null) => {
        stateContext.state = "confirmed"
        stateContext.lastError = null
        stateContext.confirmedOrderNumber = orderNumber
        stateContext.confirmedOrderId = orderId
        stateContext.lastSyncAttempt = Date.now()
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
        stateContext.pendingCount = 0
        stateContext.confirmedOrderNumber = null
        stateContext.confirmedOrderId = null
        logger.debug("[SubmitState] Transitioning to idle")
    }

    const reset = () => {
        stateContext.state = "idle"
        stateContext.lastError = null
        stateContext.pendingCount = 0
        stateContext.lastSyncAttempt = null
        stateContext.confirmedOrderNumber = null
        stateContext.confirmedOrderId = null
    }

    const updateSyncAttempt = () => {
        stateContext.lastSyncAttempt = Date.now()
    }

    const updatePendingCount = (count: number) => {
        stateContext.pendingCount = count
    }

    // Display helpers
    const stateLabel = computed<string>(() => {
        const m: Record<SubmitStateValue, string> = {
            idle: "Ready",
            submitting: "Submitting order...",
            queued: "Order queued — will retry",
            retrying: "Retrying queued order...",
            confirmed: "Order confirmed ✓",
            failed: "Submission failed",
        }
        return m[stateContext.state] ?? "Unknown state"
    })

    const isTransitioning = computed<boolean>(() => {
        return ["submitting", "retrying"].includes(stateContext.state)
    })

    const isQueued = computed<boolean>(() => {
        return stateContext.state === "queued"
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
        pendingCount,
        lastSyncAttempt,
        confirmedOrderNumber,
        confirmedOrderId,

        // Transitions
        setSubmitting,
        setQueued,
        setRetrying,
        setConfirmed,
        setFailed,
        setIdle,
        reset,
        updateSyncAttempt,
        updatePendingCount,
        resetForNextTransaction,

        // Helpers
        stateLabel,
        isTransitioning,
        isQueued,
        isConfirmed,
        isFailed,
        shouldDisableSubmit,
    }
}
