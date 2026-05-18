import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useConnectionStore } from "~/stores/Connection"

describe("useConnectionStore", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.useFakeTimers()
        // Ensure fresh store instance
        const store = useConnectionStore()
        store.reset()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("should initialize with connected state", () => {
        const store = useConnectionStore()
        expect(store.online).toBe(true)
        expect(store.reverbState).toBe("connected")
        expect(store.reconnectAttempt).toBe(0)
        expect(store.phase).toBe("ok")
    })

    it("should not be blocking when online and reverb connected", () => {
        const store = useConnectionStore()
        expect(store.blocking).toBe(false)
    })

    it("should transition to reconnecting after debounce when offline", async () => {
        const store = useConnectionStore()
        store.setOnline(false)

        // Immediately blocking should be false (debounce)
        expect(store.blocking).toBe(false)
        expect(store.phase).toBe("ok")

        // Run all timers to completion
        await vi.runAllTimersAsync()

        // After debounce, phase should be set to reconnecting (indicates callback fired)
        expect(store.phase).toBe("reconnecting")
    })

    it("should block immediately when reverb disconnects", () => {
        const store = useConnectionStore()
        store.setReverbState("disconnected")

        // After debounce time
        vi.advanceTimersByTime(1500)
        expect(store.blocking).toBe(true)
    })

    it("should track reconnection attempts and escalate at attempt 10", () => {
        const store = useConnectionStore()
        expect(store.phase).toBe("ok")

        for (let i = 1; i <= 9; i++) {
            store.setReconnectAttempt(i)
            expect(store.phase).not.toBe("escalated")
        }

        store.setReconnectAttempt(10)
        expect(store.phase).toBe("escalated")
    })

    it("should clear blocking when reconnecting and online status recovers", () => {
        const store = useConnectionStore()
        store.setOnline(false)
        vi.advanceTimersByTime(1500)
        expect(store.blocking).toBe(true)

        store.setOnline(true)
        expect(store.blocking).toBe(false)
        expect(store.phase).toBe("ok")
    })

    it("should clear blocking when reverb reconnects", () => {
        const store = useConnectionStore()
        store.setReverbState("disconnected")
        vi.advanceTimersByTime(1500)
        expect(store.blocking).toBe(true)

        store.setReverbState("connected")
        expect(store.blocking).toBe(false)
        expect(store.phase).toBe("ok")
    })

    it("should handle all reverb states", () => {
        const store = useConnectionStore()

        const states: Array<"connected" | "disconnected" | "unavailable" | "failed"> = [
            "connected",
            "disconnected",
            "unavailable",
            "failed",
        ]

        states.forEach((state) => {
            store.setReverbState(state)
            expect(store.reverbState).toBe(state)
        })
    })

    it("should reset to fully connected state", () => {
        const store = useConnectionStore()
        store.setOnline(false)
        store.setReverbState("disconnected")
        store.setReconnectAttempt(5)
        vi.advanceTimersByTime(1500)

        expect(store.blocking).toBe(true)

        store.reset()
        expect(store.online).toBe(true)
        expect(store.reverbState).toBe("connected")
        expect(store.reconnectAttempt).toBe(0)
        expect(store.phase).toBe("ok")
        expect(store.blocking).toBe(false)
    })

    it("should maintain debounce state across multiple state changes", () => {
        const store = useConnectionStore()
        store.setOnline(false)

        // First debounce
        vi.advanceTimersByTime(700)
        expect(store.blocking).toBe(false)

        // Change state during debounce
        store.setOnline(true)
        vi.advanceTimersByTime(800)
        expect(store.blocking).toBe(false) // Should clear blocking

        // Go offline again
        store.setOnline(false)
        vi.advanceTimersByTime(1500)
        expect(store.blocking).toBe(true)
    })
})
