import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ref } from "vue"
import {
    useSafeReload,
    isSafeToReload,
    recordReloadTimestamp,
    incrementPendingRequests,
    decrementPendingRequests
} from "../composables/useSafeReload"

// Mock the Order store
const mockIsSubmitting = ref(false)

vi.mock("~/stores/Order", () => ({
    useOrderStore: () => ({
        isSubmitting: mockIsSubmitting.value,
    }),
}))

describe("useSafeReload", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
        mockIsSubmitting.value = false

        // Clear sessionStorage
        if (typeof sessionStorage !== "undefined") {
            sessionStorage.clear()
        }
    })

    afterEach(() => {
        // Reset pending requests
        while (isSafeToReload().reason === "pending_requests") {
            decrementPendingRequests()
        }
    })

    describe("isSafeToReload", () => {
        it("returns safe=true when no blocking conditions exist", () => {
            const result = isSafeToReload()
            expect(result.safe).toBe(true)
            expect(result.reason).toBeNull()
        })

        it("returns safe=false when order submission is in progress", () => {
            mockIsSubmitting.value = true

            const result = isSafeToReload()
            expect(result.safe).toBe(false)
            expect(result.reason).toBe("order_submitting")

            mockIsSubmitting.value = false
        })

        it("returns safe=false when pending API requests exist", () => {
            incrementPendingRequests()

            const result = isSafeToReload()
            expect(result.safe).toBe(false)
            expect(result.reason).toBe("pending_requests")

            decrementPendingRequests()
        })

        it("returns safe=false when reload cooldown has not passed", () => {
            // Record a recent reload
            recordReloadTimestamp()

            const result = isSafeToReload()
            expect(result.safe).toBe(false)
            expect(result.reason).toBe("reload_cooldown")
        })

        it("returns safe=true after reload cooldown has passed", async () => {
            // Record an old reload timestamp (31 seconds ago)
            const oldTimestamp = Date.now() - 31 * 1000
            sessionStorage.setItem("pwa-last-reload-ts", oldTimestamp.toString())

            const result = isSafeToReload()
            expect(result.safe).toBe(true)
            expect(result.reason).toBeNull()
        })
    })

    describe("pending requests tracking", () => {
        it("tracks multiple concurrent requests", () => {
            const { pendingCount } = useSafeReload()

            expect(pendingCount.value).toBe(0)

            incrementPendingRequests()
            incrementPendingRequests()
            expect(pendingCount.value).toBe(2)

            decrementPendingRequests()
            expect(pendingCount.value).toBe(1)

            decrementPendingRequests()
            expect(pendingCount.value).toBe(0)
        })

        it("never goes below zero when decrementing", () => {
            const { pendingCount } = useSafeReload()

            decrementPendingRequests()
            expect(pendingCount.value).toBe(0)
        })
    })

    describe("guardedReload", () => {
        it("returns false and does not reload when unsafe", () => {
            const reloadSpy = vi.fn()
            Object.defineProperty(window, "location", {
                configurable: true,
                value: { reload: reloadSpy },
                writable: true,
            })

            // Make it unsafe
            incrementPendingRequests()

            const { guardedReload } = useSafeReload()
            const onUnsafe = vi.fn()

            const result = guardedReload({ onUnsafe })

            expect(result).toBe(false)
            expect(reloadSpy).not.toHaveBeenCalled()
            expect(onUnsafe).toHaveBeenCalledWith("pending_requests")

            decrementPendingRequests()
        })

        it("returns true and reloads when safe", () => {
            const reloadSpy = vi.fn()
            Object.defineProperty(window, "location", {
                configurable: true,
                value: { reload: reloadSpy },
                writable: true,
            })

            // Ensure cooldown has passed
            const oldTimestamp = Date.now() - 31 * 1000
            sessionStorage.setItem("pwa-last-reload-ts", oldTimestamp.toString())

            const { guardedReload } = useSafeReload()
            const result = guardedReload()

            expect(result).toBe(true)
            expect(reloadSpy).toHaveBeenCalledTimes(1)
        })

        it("forces reload when force option is true even if unsafe", () => {
            const reloadSpy = vi.fn()
            Object.defineProperty(window, "location", {
                configurable: true,
                value: { reload: reloadSpy },
                writable: true,
            })

            // Make it unsafe
            incrementPendingRequests()

            const { guardedReload } = useSafeReload()
            const result = guardedReload({ force: true })

            expect(result).toBe(true)
            expect(reloadSpy).toHaveBeenCalledTimes(1)

            decrementPendingRequests()
        })
    })

    describe("checkSafe", () => {
        it("returns safety status without side effects", () => {
            const { checkSafe } = useSafeReload()

            // First check should be safe
            const result1 = checkSafe()
            expect(result1.safe).toBe(true)

            // Make it unsafe
            incrementPendingRequests()

            const result2 = checkSafe()
            expect(result2.safe).toBe(false)
            expect(result2.reason).toBe("pending_requests")

            // Clean up
            decrementPendingRequests()
        })
    })

    describe("recordReloadTimestamp", () => {
        it("records timestamp in sessionStorage", () => {
            const before = Date.now()
            recordReloadTimestamp()
            const after = Date.now()

            const stored = sessionStorage.getItem("pwa-last-reload-ts")
            expect(stored).not.toBeNull()

            const timestamp = parseInt(stored!, 10)
            expect(timestamp).toBeGreaterThanOrEqual(before)
            expect(timestamp).toBeLessThanOrEqual(after)
        })
    })
})
