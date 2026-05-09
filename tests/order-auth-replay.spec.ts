// tests/order-auth-replay.spec.ts
// Tests that the offline outbox captures correct auth context for SW replay.
// Offline is simulated as a network error from orderStore.submitOrder.

import { vi, describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

// ---------------------------------------------------------------------------

import { useOrderSubmit } from "../composables/useOrderSubmit"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockDeviceStore = { token: "replay-test-token-abc" }
vi.mock("~/stores/Device", () => ({
    useDeviceStore: () => mockDeviceStore,
}))

const mockSubmitOrder = vi.fn()
vi.mock("~/stores/Order", () => ({
    useOrderStore: () => ({ submitOrder: mockSubmitOrder }),
}))

const mockRefreshPendingCount = vi.fn().mockResolvedValue(undefined)
vi.mock("~/stores/OfflineSync", () => ({
    useOfflineSyncStore: () => ({ refreshPendingCount: mockRefreshPendingCount }),
}))

const mockEnqueuedRecords: any[] = []
const mockEnqueue = vi.fn().mockImplementation((rec: any) => {
    mockEnqueuedRecords.push(rec)
})
const mockMarkStatus = vi.fn().mockResolvedValue(undefined)

vi.mock("#app", () => ({
    useNuxtApp: () => ({
        $offlineOutbox: { enqueue: mockEnqueue, markStatus: mockMarkStatus },
    }),
}))

vi.mock("~/utils/logger", () => ({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const samplePayload = { guest_count: 2, package_id: 50, items: [{ menu_id: 10, quantity: 1 }] }

describe("order auth replay context", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockEnqueuedRecords.length = 0
        mockEnqueue.mockClear()
        mockMarkStatus.mockClear()
        mockSubmitOrder.mockReset()
    })

    it("Authorization header is captured in outbox headersSnapshot", async () => {
        mockSubmitOrder.mockRejectedValueOnce(new Error("Network Error"))
        const { submitOrder } = useOrderSubmit()
        await submitOrder(samplePayload)
        expect(mockEnqueue).toHaveBeenCalled()
        const record = mockEnqueuedRecords[0]
        expect(record.headersSnapshot.Authorization).toBe("Bearer replay-test-token-abc")
    })

    it("X-XSRF-TOKEN is NOT captured (Bearer-only auth on device routes)", async () => {
        mockSubmitOrder.mockRejectedValueOnce(new Error("Network Error"))
        const { submitOrder } = useOrderSubmit()
        await submitOrder(samplePayload)
        const record = mockEnqueuedRecords[0]
        expect(record.headersSnapshot["X-XSRF-TOKEN"]).toBeUndefined()
        expect(record.headersSnapshot["X-CSRF-TOKEN"]).toBeUndefined()
    })

    it("401 online failure marks record with auth_error status", async () => {
        const err: any = new Error("Unauthorized")
        err.response = { status: 401 }
        mockSubmitOrder.mockRejectedValueOnce(err)
        const { submitOrder } = useOrderSubmit()
        await submitOrder(samplePayload).catch(() => {})
        const record = mockEnqueuedRecords[0]
        expect(record?.status).toBe("auth_error")
    })

    it("outbox record idempotencyKey matches record id", async () => {
        mockSubmitOrder.mockRejectedValueOnce(new Error("Network Error"))
        const { submitOrder } = useOrderSubmit()
        await submitOrder(samplePayload)
        const record = mockEnqueuedRecords[0]
        expect(record.id).toBe(record.idempotencyKey)
    })
})
