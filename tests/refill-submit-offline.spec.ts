// tests/refill-submit-offline.spec.ts
// Tests for composables/useRefillSubmit.ts — live-only refill submission wrapper.
//
// Contract: No offline queueing. Network failure (no .response) must throw
// immediately with "Ordering is unavailable. Please call staff."
// Refills never get queued for later replay.

import { vi, describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

import { useRefillSubmit } from "../composables/useRefillSubmit"

const mockSubmitRefill = vi.fn()

vi.mock("~/stores/Order", () => ({
    useOrderStore: () => ({
        submitRefill: mockSubmitRefill,
    }),
}))

vi.mock("~/utils/logger", () => ({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const samplePayload = {
    order_id: 19561,
    items: [{ menu_id: 30, quantity: 2 }],
}

describe("composables/useRefillSubmit", () => {
    beforeEach(() => {
        const pinia = createPinia()
        setActivePinia(pinia)
        mockSubmitRefill.mockReset()
    })

    it("network error throws with blocking message — does NOT queue", async () => {
        mockSubmitRefill.mockRejectedValueOnce(new Error("Network Error"))
        const { submitRefill } = useRefillSubmit()
        await expect(submitRefill(samplePayload)).rejects.toThrow(
            "Ordering is unavailable. Please call staff."
        )
    })

    it("network error passes idempotency key to orderStore.submitRefill", async () => {
        mockSubmitRefill.mockRejectedValueOnce(new Error("Network Error"))
        const { submitRefill } = useRefillSubmit()
        await submitRefill(samplePayload).catch(() => {})
        expect(mockSubmitRefill).toHaveBeenCalledWith(
            samplePayload,
            {
                idempotencyKey: expect.any(String),
            }
        )
    })
})
