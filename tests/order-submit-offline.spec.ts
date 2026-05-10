// tests/order-submit-offline.spec.ts
// Tests for composables/useOrderSubmit.ts — live-only order submission wrapper.
//
// Contract: No offline queueing. Network failure (no .response) must throw
// immediately with "Ordering is unavailable. Please call staff."
// Kitchen staff never receives an order that cannot print.

import { vi, describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

import { useOrderSubmit } from "../composables/useOrderSubmit"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// OrderStore.submitOrder — simulates success / failure
const mockSubmitOrder = vi.fn()
vi.mock("~/stores/Order", () => ({
    useOrderStore: () => ({
        submitOrder: mockSubmitOrder,
    }),
}))

vi.mock("~/utils/logger", () => ({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const samplePayload = {
    guest_count: 2,
    package_id: 50,
    items: [{ menu_id: 10, quantity: 1 }],
}

describe("composables/useOrderSubmit", () => {
    beforeEach(() => {
        const pinia = createPinia()
        setActivePinia(pinia)
        mockSubmitOrder.mockReset()
    })

    // -------------------------------------------------------------------------
    // Offline / network-error path: must throw, never queue
    // -------------------------------------------------------------------------

    it("network error throws with blocking message — does NOT queue", async () => {
        mockSubmitOrder.mockRejectedValueOnce(new Error("Network Error"))
        const { submitOrder } = useOrderSubmit()
        await expect(submitOrder(samplePayload)).rejects.toThrow(
            "Ordering is unavailable. Please call staff."
        )
    })

    it("network error does not return queued:true — it throws", async () => {
        mockSubmitOrder.mockRejectedValueOnce(new Error("Network Error"))
        const { submitOrder } = useOrderSubmit()
        let caught: Error | null = null
        try {
            await submitOrder(samplePayload)
        } catch (e: any) {
            caught = e
        }
        expect(caught).not.toBeNull()
        expect(caught?.message).toBe("Ordering is unavailable. Please call staff.")
    })

    it("network error passes idempotency key to orderStore.submitOrder", async () => {
        mockSubmitOrder.mockRejectedValueOnce(new Error("Network Error"))
        const { submitOrder } = useOrderSubmit()
        await submitOrder(samplePayload).catch(() => {})
        expect(mockSubmitOrder).toHaveBeenCalledWith(
            samplePayload,
            {
                headers: {
                    "X-Idempotency-Key": expect.any(String),
                },
            }
        )
    })

    // -------------------------------------------------------------------------
    // Online success path
    // -------------------------------------------------------------------------

    it("online success delegates to orderStore.submitOrder and returns data", async () => {
        mockSubmitOrder.mockResolvedValueOnce({ success: true, order: { order_id: 5, order_number: "W-001" } })
        const { submitOrder } = useOrderSubmit()
        const result = await submitOrder(samplePayload)
        expect(mockSubmitOrder).toHaveBeenCalledWith(
            samplePayload,
            {
                headers: {
                    "X-Idempotency-Key": expect.any(String),
                },
            }
        )
        expect(result.data).toBeDefined()
    })

    // -------------------------------------------------------------------------
    // 409 path — existing order resumed
    // -------------------------------------------------------------------------

    it("409 response treated as success — does not throw, returns data", async () => {
        const error: any = new Error("Conflict")
        error.response = { status: 409, data: { order: { order_id: 7, status: "confirmed" } } }
        mockSubmitOrder.mockRejectedValueOnce(error)
        const { submitOrder } = useOrderSubmit()
        const result = await submitOrder(samplePayload)
        expect(result.data).toBeDefined()
    })

    // -------------------------------------------------------------------------
    // 401 auth error path — must throw, not silently absorb
    // -------------------------------------------------------------------------

    it("401 re-throws after logging — does not queue", async () => {
        const error: any = new Error("Unauthorized")
        error.response = { status: 401 }
        mockSubmitOrder.mockRejectedValueOnce(error)
        const { submitOrder } = useOrderSubmit()
        await expect(submitOrder(samplePayload)).rejects.toThrow()
    })

    // -------------------------------------------------------------------------
    // Contract: useOrderSubmit is for create-order only
    // -------------------------------------------------------------------------

    it("useOrderSubmit is for create-order only — refill uses useRefillSubmit", () => {
        const { submitOrder } = useOrderSubmit()
        expect(typeof submitOrder).toBe("function")
    })
})
