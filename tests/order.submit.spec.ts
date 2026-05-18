// Minimal localStorage shim for Node/jsdom test env (Pinia persist may access localStorage)
import { vi, describe, it, expect, beforeEach } from "vitest"

import { setActivePinia, createPinia } from "pinia"
import { useDeviceStore } from "../stores/Device"
import { useSessionStore } from "../stores/Session"
import { useOrderStore } from "../stores/Order"
import type { CartItem, Package } from "../types"
import { ERROR_MENU_ITEM_UNAVAILABLE } from "../utils/errorCodes"

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

// Mock the composable that the store uses for API calls. Must be declared before importing the store.
const mockPost = vi.fn()
const mockGet = vi.fn()
vi.mock("../composables/useApi", () => ({ useApi: () => ({ post: mockPost, get: mockGet }) }))
const mockLoadAllMenus = vi.fn()
let mockPackages: any[] = []
let mockMeats: any[] = []
let mockSides: any[] = []
let mockDesserts: any[] = []
let mockDrinks: any[] = []
let mockAlacartes: any[] = []
let mockModifiers: any[] = []
vi.mock("../stores/Menu", () => ({
    useMenuStore: () => ({
        loadAllMenus: mockLoadAllMenus,
        get packages () { return mockPackages },
        get meats () { return mockMeats },
        get sides () { return mockSides },
        get desserts () { return mockDesserts },
        get drinks () { return mockDrinks },
        get alacartes () { return mockAlacartes },
        get modifiers () { return mockModifiers },
    })
}))

describe("stores/order - submitOrder", () => {
    beforeEach(() => {
        const pinia = createPinia()
        setActivePinia(pinia)
        mockPost.mockReset()
        mockGet.mockReset()
        mockLoadAllMenus.mockReset()
        mockLoadAllMenus.mockResolvedValue(undefined)
        mockPackages = []
        mockMeats = []
        mockSides = []
        mockDesserts = []
        mockDrinks = []
        mockAlacartes = []
        mockModifiers = []
        // Provide a fake authenticated device to satisfy store validation
        const dsInstance = useDeviceStore()
        dsInstance.setToken("test-token")
        dsInstance.setTable({ id: 1, name: "Test Table", status: "active", is_available: true, is_locked: false } as any)
        // Initialize session store to prevent null ref errors
        const session = useSessionStore()
        session.setIsActive(true)
    })

    it("submits order, appends round and clears draft (success path)", async () => {
        const order = useOrderStore()

        // Prepare store state
        order.setPackage({ id: 1, name: "Package", price: 100, is_taxable: false } as any)
        order.setGuestCount(2)
        ;(order as any).draft = [
            { id: 10, name: "Beef Brisket", price: 5, quantity: 2, category: "meats", isUnlimited: false },
            { id: 11, name: "Extra Side", price: 3, quantity: 1, category: "sides", isUnlimited: false },
        ]

        const apiOrder = { id: 999, total_amount: 110, order_number: "ORD-999" }
        const apiResp = { success: true, order: apiOrder }
        mockPost.mockResolvedValueOnce({ data: apiResp })

        const result = await order.submitOrder()

        // API call shape
        expect(mockPost).toHaveBeenCalledWith("/api/devices/create-order", expect.objectContaining({
            guest_count: expect.any(Number),
            package_id: 1,
            items: expect.any(Array)
        }), expect.any(Object))

        // Round appended
        expect((order as any).rounds).toHaveLength(1)
        expect((order as any).rounds[0].kind).toBe("initial")
        // draft cleared
        expect((order as any).draft).toEqual([])
        // hasPlacedOrder is now true
        expect(order.hasPlacedOrder).toBe(true)
        // function returns backend data
        expect(result).toEqual(apiResp)
    })

    it("stores server order id, marks order placed, and allows entering refill mode after initial submit", async () => {
        const order = useOrderStore()
        const session = useSessionStore()
        order.setPackage({ id: 7, name: "Package", price: 100, is_taxable: false } as any)
        order.setGuestCount(2)
        ;(order as any).draft = [
            { id: 10, name: "Beef Brisket", price: 5, quantity: 1, category: "meats", isUnlimited: false },
        ]

        const apiResp = {
            success: true,
            order: { id: 999, order_id: 19561, order_number: "ORD-19561", total_amount: 110 },
        }
        mockPost.mockResolvedValueOnce({ data: apiResp })

        await order.submitOrder()

        expect(order.hasPlacedOrder).toBe(true)
        expect(session.getOrderId()).toBe(19561)

        order.toggleRefillMode(true)
        expect(order.isRefillMode).toBe(true)
    })

    it("propagates API errors and does not clear draft on failure", async () => {
        const order = useOrderStore()

        order.setPackage({ id: 2, name: "Package", price: 50, is_taxable: false } as any)
        order.setGuestCount(2)
        ;(order as any).draft = [
            { id: 12, name: "Pork Belly", price: 4, quantity: 1, category: "meats", isUnlimited: false },
        ]

        mockPost.mockRejectedValueOnce(new Error("Network error"))

        // Plan D: Network errors are sanitized to customer-safe messages
        await expect(order.submitOrder()).rejects.toThrow("Something went wrong. Please ask a staff member for assistance.")

        // ensure draft remains unchanged on failure
        expect((order as any).draft.length).toBeGreaterThan(0)
    })

    it("fails cleanly when order creation response body is empty", async () => {
        const order = useOrderStore()

        order.setPackage({ id: 1, name: "Combo", price: 100, is_taxable: false } as Package)
        order.setGuestCount(2)
        ;(order as any).draft = [
            { id: 9, name: "Wagyu Beef", price: 0, quantity: 1, category: "meats", isUnlimited: false },
        ]

        mockPost.mockResolvedValueOnce(undefined as any)

        await expect(order.submitOrder()).rejects.toThrow("Order creation response missing body")
        expect((order as any).draft.length).toBe(1)
    })

    it("handles MENU_ITEM_UNAVAILABLE by refreshing menus and removing unavailable cart items", async () => {
        const order = useOrderStore()

        order.setPackage({ id: 2, name: "Package", price: 50, is_taxable: false } as any)
        order.setGuestCount(2)
        ;(order as any).draft = [
            { id: 12, name: "Pork Belly", price: 4, quantity: 1, category: "meats", isUnlimited: false },
            { id: 9999, name: "Stale Side", price: 1, quantity: 1, category: "sides", isUnlimited: false },
        ]

        mockPackages = [{ id: 2 }]
        mockSides = [{ id: 12 }]
        mockPost.mockRejectedValueOnce({
            response: {
                status: 422,
                data: {
                    code: ERROR_MENU_ITEM_UNAVAILABLE,
                    message: "One or more menu items are no longer available.",
                },
            },
        })

        await expect(order.submitOrder()).rejects.toMatchObject({
            code: ERROR_MENU_ITEM_UNAVAILABLE,
            message: "Some menu items are no longer available. We refreshed the menu. Please review your order again.",
        })

        expect(mockLoadAllMenus).toHaveBeenCalledWith(true)
        expect((order as any).draft.map((item: any) => item.id)).toEqual([12])
        expect((order.package as any)?.id).toBe(2)
    })
})

describe("stores/order - submitRefill", () => {
    beforeEach(() => {
        const pinia = createPinia()
        setActivePinia(pinia)
        mockPost.mockReset()
        mockGet.mockReset()
        mockLoadAllMenus.mockReset()
        mockLoadAllMenus.mockResolvedValue(undefined)
        mockPackages = []
        mockMeats = []
        mockSides = []
        mockDesserts = []
        mockDrinks = []
        mockAlacartes = []
        mockModifiers = []
        const dsInstance = useDeviceStore()
        dsInstance.setToken("test-token")
        dsInstance.setTable({ id: 1, name: "Test Table", status: "active", is_available: true, is_locked: false } as any)
        const session = useSessionStore()
        session.setIsActive(true)
        session.setOrderId(19561)
    })

    it("submits refill to /api/order/{orderId}/refill and payload excludes package_id", async () => {
        const order = useOrderStore()
        ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 19561, serverTotal: 0 }]
        ;(order as any).serverOrderId = 19561
        ;(order as any).serverStatus = "pending"
        ;(order as any).draft = [
            { id: 12, name: "Pork Belly", price: 4, quantity: 2, category: "meats", isUnlimited: false },
        ]
        ;(order as any).mode = "refill"

        mockGet.mockResolvedValueOnce({ data: { order: { id: 999, order_id: 19561, status: "pending" } } })
        mockPost.mockResolvedValueOnce({ data: { success: true, order: { id: 999, order_id: 19561, status: "pending" } } })

        await order.submitRefill()

        expect(mockPost).toHaveBeenCalledTimes(1)
        const [endpoint, payload] = mockPost.mock.calls[0]
        expect(endpoint).toBe("/api/order/19561/refill")
        expect(payload).not.toHaveProperty("package_id")
        expect(payload).toEqual(expect.objectContaining({
            order_id: 19561,
            items: expect.any(Array),
        }))
    })

    it("keeps refill mode true while refill request is in-flight", async () => {
        const order = useOrderStore()
        ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 19561, serverTotal: 0 }]
        ;(order as any).serverOrderId = 19561
        ;(order as any).serverStatus = "pending"
        ;(order as any).draft = [
            { id: 12, name: "Pork Belly", price: 4, quantity: 1, category: "meats", isUnlimited: false },
        ]
        ;(order as any).mode = "refill"

        let resolvePost: (value: any) => void = () => {}
        const postPromise = new Promise((resolve) => {
            resolvePost = resolve
        })

        mockGet.mockResolvedValueOnce({ data: { order: { id: 999, order_id: 19561, status: "pending" } } })
        mockPost.mockReturnValueOnce(postPromise as any)

        const submitPromise = order.submitRefill()
        await Promise.resolve()

        expect(order.isRefillMode).toBe(true)

        resolvePost({ data: { success: true, order: { id: 999, order_id: 19561, status: "pending" } } })
        await submitPromise
    })

    it("on successful refill clears draft, appends round, and does not recreate initial order", async () => {
        const order = useOrderStore()
        ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 19561, serverTotal: 0 }]
        ;(order as any).serverOrderId = 19561
        ;(order as any).serverStatus = "pending"
        ;(order as any).draft = [
            { id: 12, name: "Pork Belly", price: 4, quantity: 1, category: "meats", isUnlimited: false },
        ]
        ;(order as any).mode = "refill"

        mockGet.mockResolvedValueOnce({ data: { order: { id: 999, order_id: 19561, status: "pending" } } })
        mockPost.mockResolvedValueOnce({ data: { success: true, order: { id: 999, order_id: 19561, status: "pending" } } })

        const roundsBefore = (order as any).rounds.length
        await order.submitRefill()

        expect(order.hasPlacedOrder).toBe(true)
        expect((order as any).draft).toEqual([])
        // appendRound keeps mode as "refill" (ready for another refill)
        expect(order.isRefillMode).toBe(true)
        expect((order as any).rounds.length).toBe(roundsBefore + 1)
        expect((order as any).rounds[(order as any).rounds.length - 1].kind).toBe("refill")
        expect(mockPost).not.toHaveBeenCalledWith("/api/devices/create-order", expect.anything(), expect.anything())
    })
})
