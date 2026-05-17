/**
 * Connection store - tracks network and Reverb connectivity state
 * Provides blocking state with debounce to prevent flashing overlays
 */

import { defineStore } from "pinia"
import { ref, computed } from "vue"
import { logger } from "~/utils/logger"

export type ReverbState = "connected" | "disconnected" | "unavailable" | "failed"
export type ConnectionPhase = "ok" | "reconnecting" | "escalated"

export const useConnectionStore = defineStore("connection", () => {
    const online = ref(true)
    const reverbState = ref<ReverbState>("connected")
    const reconnectAttempt = ref(0)
    const phase = ref<ConnectionPhase>("ok")

    // Debounce to prevent flashing overlays on brief disconnects
    const BLOCKING_DEBOUNCE_MS = 1500
    let blockingDebounceTimer: number | null = null
    let debouncedBlockingState = false

    /**
   * Whether the app should be blocked (with 1.5s debounce)
   * Returns true if offline OR Reverb is not connected
   */
    const blocking = computed(() => {
        const shouldBlock = !online.value || reverbState.value !== "connected"
        return debouncedBlockingState
    })

    /**
   * Set online status
   */
    const setOnline = (value: boolean) => {
        if (online.value === value) { return }
        online.value = value
        logger.debug("[Connection] Online status:", value)
        updateBlockingState()
    }

    /**
   * Set Reverb connectivity state
   */
    const setReverbState = (state: ReverbState) => {
        if (reverbState.value === state) { return }
        reverbState.value = state
        logger.debug("[Connection] Reverb state:", state)
        updateBlockingState()
    }

    /**
   * Set reconnection attempt count (from useBroadcasts backoff index)
   */
    const setReconnectAttempt = (attempt: number) => {
        if (reconnectAttempt.value === attempt) { return }
        reconnectAttempt.value = attempt

        // Escalate to staff assistance after ~10 attempts (~90s)
        const MAX_ATTEMPTS = 10
        if (attempt >= MAX_ATTEMPTS && phase.value !== "escalated") {
            phase.value = "escalated"
            logger.warn("[Connection] Escalated to staff assistance at attempt", attempt)
        }
    }

    /**
   * Update blocking state with debounce
   * This prevents flashing overlays on brief disconnects
   */
    const updateBlockingState = () => {
        const shouldBlock = !online.value || reverbState.value !== "connected"

        // Clear existing debounce
        if (blockingDebounceTimer) {
            clearTimeout(blockingDebounceTimer)
        }

        // If we should unblock, do it immediately
        if (!shouldBlock && debouncedBlockingState) {
            debouncedBlockingState = false
            phase.value = "ok"
            logger.info("[Connection] Recovered - blocking cleared")
            return
        }

        // If we should block, debounce it
        if (shouldBlock && !debouncedBlockingState) {
            blockingDebounceTimer = window.setTimeout(() => {
                blockingDebounceTimer = null
                debouncedBlockingState = true
                if (phase.value === "ok") {
                    phase.value = "reconnecting"
                }
                logger.warn("[Connection] Debounced blocking activated, phase:", phase.value)
            }, BLOCKING_DEBOUNCE_MS)
        }
    }

    /**
   * Reset to fully connected state
   */
    const reset = () => {
        if (blockingDebounceTimer) {
            clearTimeout(blockingDebounceTimer)
            blockingDebounceTimer = null
        }
        online.value = true
        reverbState.value = "connected"
        reconnectAttempt.value = 0
        phase.value = "ok"
        debouncedBlockingState = false
        logger.debug("[Connection] Reset to initial state")
    }

    return {
        online,
        reverbState,
        reconnectAttempt,
        phase,
        blocking,
        setOnline,
        setReverbState,
        setReconnectAttempt,
        reset,
    }
})
