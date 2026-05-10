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
vi.mock("../composables/useApi", () => ({ useApi: () => ({ post: mockPost }) }))
const mockLoadAllMenus = vi.fn()
let mockPackages: any[] = []
let mockSides: any[] = []
let mockDesserts: any[] = []
let mockBeverages: any[] = []
let mockAlacartes: any[] = []
let mockModifiers: any[] = []
vi.mock("../stores/Menu", () => ({
    useMenuStore: () => ({
        loadAllMenus: mockLoadAllMenus,
        get packages () { return mockPackages },
        get sides () { return mockSides },
        get desserts () { return mockDesserts },
        get beverages () { return mockBeverages },
        get alacartes () { return mockAlacartes },
        get modifiers () { return mockModifiers },
    })
}))

describe("stores/order - submitOrder", () => {
    beforeEach(() => {
        const pinia = createPinia()
        setActivePinia(pinia)
        mockPost.mockReset()
        mockLoadAllMenus.mockReset()
        mockLoadAllMenus.mockResolvedValue(undefined)
        mockPackages = []
        mockSides = []
        mockDesserts = []
        mockBeverages = []
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

    it("submits order, sets currentOrder and clears cartItems (success path)", async () => {
        const order = useOrderStore()

        // Prepare store state
        order.setPackage({ id: 1, name: "Package", price: 100, is_taxable: false } as any)
        order.setGuestCount(2)
        order.setCartItems([
            { id: 10, name: "Beef Brisket", price: 5, quantity: 2, category: "meats", isUnlimited: false } as any,
            { id: 11, name: "Extra Side", price: 3, quantity: 1, category: "sides", isUnlimited: false } as any,
        ])

        const apiOrder = { id: 999, total_amount: 110, order_number: "ORD-999" }
        const apiResp = { success: true, order: apiOrder }
        mockPost.mockResolvedValueOnce({ data: apiResp })

        const result = await order.submitOrder()

        // API call shape
        expect(mockPost).toHaveBeenCalledWith("/api/devices/create-order", expect.objectContaining({
            guest_count: expect.any(Number),
            items: expect.any(Array)
        }), expect.any(Object))

        // Store updated: currentOrder should be the full response data
        expect(order.currentOrder).toEqual(apiResp)
        expect(order.cartItems).toEqual([])
        // history appended
        expect(order.getHistory().length).toBeGreaterThanOrEqual(1)
        expect(order.getHistory()[order.getHistory().length - 1]).toEqual(apiResp)
        // function returns backend data
        expect(result).toEqual(apiResp)
    })

    it("propagates API errors and does not clear cartItems on failure", async () => {
        const order = useOrderStore()

        order.setPackage({ id: 2, name: "Package", price: 50, is_taxable: false } as any)
        order.setGuestCount(2)
        order.setCartItems([
            { id: 12, name: "Pork Belly", price: 4, quantity: 1, category: "meats", isUnlimited: false } as any,
        ])

        mockPost.mockRejectedValueOnce(new Error("Network error"))

        await expect(order.submitOrder()).rejects.toThrow("Network error")

        // ensure cartItems remain unchanged on failure
        expect(order.getCartItems().length).toBeGreaterThan(0)
    })

    it("fails cleanly when order creation response body is empty", async () => {
        const order = useOrderStore()

        order.setPackage({ id: 1, name: "Combo", price: 100, is_taxable: false } as Package)
        order.setGuestCount(2)
        order.setCartItems([
      { id: 9, name: "Wagyu Beef", price: 0, quantity: 1, category: "meats", isUnlimited: false } as CartItem,
        ])

        mockPost.mockResolvedValueOnce(undefined as any)

        await expect(order.submitOrder()).rejects.toThrow("Order creation response missing body")
        expect(order.getCartItems().length).toBe(1)
    })

    it("handles MENU_ITEM_UNAVAILABLE by refreshing menus and removing unavailable cart items", async () => {
        const order = useOrderStore()

        order.setPackage({ id: 2, name: "Package", price: 50, is_taxable: false } as any)
        order.setGuestCount(2)
        order.setCartItems([
            { id: 12, name: "Pork Belly", price: 4, quantity: 1, category: "meats", isUnlimited: false } as any,
            { id: 9999, name: "Stale Side", price: 1, quantity: 1, category: "sides", isUnlimited: false } as any,
        ])

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
        expect(order.getCartItems().map(item => item.id)).toEqual([12])
        expect((order.package as any)?.id).toBe(2)
    })
})
