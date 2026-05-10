// tests/order-auth-replay.spec.ts
// Tests that hard-fail contract is upheld: no outbox, no SW replay.
// Network failures must throw immediately — "Ordering is unavailable. Please call staff."
// 401 must also throw — device must re-register, not replay stale tokens.

import { vi, describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

import { useOrderSubmit } from "../composables/useOrderSubmit"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSubmitOrder = vi.fn()
vi.mock("~/stores/Order", () => ({
    useOrderStore: () => ({ submitOrder: mockSubmitOrder }),
}))

vi.mock("~/utils/logger", () => ({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const samplePayload = { guest_count: 2, package_id: 50, items: [{ menu_id: 10, quantity: 1 }] }

describe("order hard-fail contract (no SW replay)", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockSubmitOrder.mockReset()
    })

    it("network error throws blocking message — no outbox enqueue", async () => {
        mockSubmitOrder.mockRejectedValueOnce(new Error("Network Error"))
        const { submitOrder } = useOrderSubmit()
        await expect(submitOrder(samplePayload)).rejects.toThrow(
            "Ordering is unavailable. Please call staff."
        )
    })

    it("network error does not silently return — caller must handle the throw", async () => {
        mockSubmitOrder.mockRejectedValueOnce(new Error("Network Error"))
        const { submitOrder } = useOrderSubmit()
        let returned = false
        await submitOrder(samplePayload).then(() => { returned = true }).catch(() => {})
        expect(returned).toBe(false)
    })

    it("401 throws — stale token must not be replayed via SW", async () => {
        const err: any = new Error("Unauthorized")
        err.response = { status: 401 }
        mockSubmitOrder.mockRejectedValueOnce(err)
        const { submitOrder } = useOrderSubmit()
        await expect(submitOrder(samplePayload)).rejects.toThrow()
    })

    it("idempotency key is still sent to orderStore on every attempt", async () => {
        mockSubmitOrder.mockRejectedValueOnce(new Error("Network Error"))
        const { submitOrder } = useOrderSubmit()
        await submitOrder(samplePayload).catch(() => {})
        expect(mockSubmitOrder).toHaveBeenCalledWith(
            samplePayload,
            { headers: { "X-Idempotency-Key": expect.any(String) } }
        )
    })
})
