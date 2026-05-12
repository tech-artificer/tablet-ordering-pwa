// Ensure localStorage shim for Node/jsdom
import { vi, describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

import { useOrderStore } from "../stores/Order"
import { useSessionStore } from "../stores/Session"
import { useDeviceStore } from "../stores/Device"
import type { CartItem, Package } from "../types"

if (typeof globalThis.localStorage === "undefined") {
    const storage: Record<string, string> = {}
    // @ts-ignore
    globalThis.localStorage = {
        getItem: (k: string) => (Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null),
        setItem: (k: string, v: string) => { storage[k] = String(v) },
        removeItem: (k: string) => { delete storage[k] },
        clear: () => { Object.keys(storage).forEach(k => delete storage[k]) }
    }
}

// Mock useApi before importing stores
const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock("../composables/useApi", () => ({ useApi: () => ({ get: mockGet, post: mockPost }) }))

describe("order store — setOrderCreated and round ledger", () => {
    beforeEach(() => {
        const pinia = createPinia()
        setActivePinia(pinia)
        mockGet.mockReset()
        mockPost.mockReset()
        // Initialize session store to prevent null ref errors
        const session = useSessionStore()
        session.setIsActive(true)
    })

    it("setOrderCreated appends initial round and marks hasPlacedOrder", async () => {
        const order = useOrderStore()

        // Seed draft items before submit
        ;(order as any).draft = [
            { id: 10, name: "Beef Brisket", quantity: 2, price: 5, category: "meats", isUnlimited: false, img_url: null },
        ]

        await order.setOrderCreated({ order: { id: 19561, order_number: "ORD-19561", order_id: 19561 } } as any)

        expect(order.hasPlacedOrder).toBe(true)
        expect((order as any).rounds).toHaveLength(1)
        expect((order as any).rounds[0].kind).toBe("initial")
        expect((order as any).rounds[0].serverOrderId).toBe(19561)
        // draft is cleared after round appended
        expect((order as any).draft).toEqual([])
    })

    it("updateOrderStatus updates serverStatus without affecting rounds", async () => {
        const order = useOrderStore()
        ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 19561, serverTotal: 0 }]
        ;(order as any).serverOrderId = 19561
        ;(order as any).serverStatus = "pending"

        order.updateOrderStatus("completed")

        expect(order.serverStatus).toBe("completed")
        expect((order as any).rounds).toHaveLength(1)
    })

    it("initializeFromSession fetches canonical order and prevents new order submission", async () => {
        const order = useOrderStore()
        const session = useSessionStore()
        const device = useDeviceStore()

        // Mock API to return a full order for the session order id
        mockGet.mockResolvedValueOnce({ data: { order: { id: 19561, status: "preparing", total_amount: 200 } } })

        // Simulate persisted session order id
        session.setOrderId(19561)
        device.setToken("test-token")

        await order.initializeFromSession()

        expect(order.hasPlacedOrder).toBe(true)
        expect(order.serverOrderId).toBe(19561)

        // Attempt to submit a new order should throw due to serverOrderId guard
        order.setPackage({ id: 1, price: 100 } as Package)
        ;(order as any).draft = [{ id: 10, name: "Extra", price: 5, quantity: 1 } as CartItem]
        order.setGuestCount(1)

        await expect(order.submitOrder()).rejects.toThrow("An initial order has already been placed")
    })

    it("initializeFromSession defers server active-order lookup when token is unavailable", async () => {
        const order = useOrderStore()
        const session = useSessionStore()

        // Simulate cold boot: no token yet and no active session id restored.
        session.setOrderId(null)
        order.setGuestCount(6)
        order.setPackage({ id: 99, name: "Stale Package", price: 100 } as Package)
        ;(order as any).draft = [{ id: 88, name: "Stale Item", price: 12, quantity: 2 } as CartItem]
        ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 1234, serverTotal: 0 }]
        ;(order as any).serverOrderId = 1234

        await order.initializeFromSession()

        expect(mockGet).not.toHaveBeenCalled()
        expect(order.hasPlacedOrder).toBe(false)
        expect(order.serverOrderId).toBeNull()
        expect((order as any).draft).toEqual([])
        expect(order.guestCount).toBe(2)
        expect(order.package).toBeNull()
    })
})
