// Minimal localStorage shim for Node/jsdom test env
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

import type { CartItem, Package } from "../types"
import { useDeviceStore } from "../stores/Device"
import { useOrderStore } from "../stores/Order"
import { useSessionStore } from "../stores/Session"

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

/**
 * Composite mock that works for BOTH usage patterns found in this codebase:
 *   - api.get(url)      → used by Order polling
 *   - api.post(url, b)  → used by Order submit / refill
 *   - api(url, config)  → used by Session.fetchLatestSession (axios callable form)
 */
const mockApiInvoke = vi.fn()
const mockGet = vi.fn()
const mockPost = vi.fn()
;(mockApiInvoke as any).get = mockGet
;(mockApiInvoke as any).post = mockPost

vi.mock("../composables/useApi", () => ({ useApi: () => mockApiInvoke }))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PACKAGE = { id: 50, name: "Yakiniku Combo", price: 250, is_taxable: false }
const MEAT_ITEM = { id: 10, name: "Wagyu Beef", price: 0, quantity: 1, category: "meats" }
const SIDE_ITEM = { id: 20, name: "Caesar Salad", price: 30, quantity: 2, category: "sides" }
const REFILL_ITEM_1 = { id: 30, name: "Sliced Beef", price: 0, quantity: 2, category: "meats" }
const REFILL_ITEM_2 = { id: 31, name: "Garlic Rice", price: 0, quantity: 1, category: "sides" }

const API_ORDER_RESP = {
    success: true,
    order: {
        id: 1,
        order_id: 19561,
        order_number: "ORD-19561",
        status: "preparing",
        total_amount: 560,
    },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seedDevice () {
    const ds = useDeviceStore()
    ds.setToken("test-token")
    ds.setTable({ id: 1, name: "T1", status: "active", is_available: true, is_locked: false })
    return ds
}

function seedOrderState (order: ReturnType<typeof useOrderStore>) {
    order.setPackage({ ...PACKAGE } as Package)
    order.setGuestCount(2)
    order.setCartItems([{ ...MEAT_ITEM }, { ...SIDE_ITEM }] as CartItem[])
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("E2E Transaction: Tablet Ordering PWA", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.useFakeTimers()
        mockGet.mockReset()
        mockPost.mockReset()
        mockApiInvoke.mockReset()
        ;(mockApiInvoke as any).get = mockGet
        ;(mockApiInvoke as any).post = mockPost

        // Ensure navigator.onLine = true so polling can start
        if (typeof global.navigator === "undefined") {
            // @ts-ignore
            global.navigator = { onLine: true }
        } else {
            try {
                Object.defineProperty(global.navigator, "onLine", { value: true, configurable: true })
            } catch (_) { /* ignore if non-configurable */ }
        }
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // =========================================================================
    // 1. buildPayload — structure verification
    // =========================================================================
    describe("buildPayload — payload structure", () => {
        it("produces is_package=true, modifiers[] for meats, and adds-on as separate flat items", () => {
            const order = useOrderStore()
            seedDevice()
            seedOrderState(order)

            const payload = order.buildPayload()

            expect(payload.guest_count).toBe(2)
            expect(payload.items).toHaveLength(2)

            // Package item
            const pkg = payload.items[0]
            expect(pkg.menu_id).toBe(50)
            expect(pkg.name).toBe("Yakiniku Combo")
            expect(pkg.is_package).toBe(true)
            expect(Array.isArray(pkg.modifiers)).toBe(true)
            expect(pkg.modifiers).toHaveLength(1)
            expect(pkg.modifiers[0].menu_id).toBe(10)
            expect(pkg.modifiers[0].quantity).toBe(1)

            // AddOn item
            const addon = payload.items[1]
            expect(addon.menu_id).toBe(20)
            expect(addon.name).toBe("Caesar Salad")
            expect(addon.is_package).toBe(false)
            expect(addon.modifiers).toEqual([])
            expect(addon.quantity).toBe(2)
        })

        it("throws \"Invalid items\" when cart is empty and no package id", () => {
            const order = useOrderStore()
            order.setGuestCount(2)
            order.clearCart()
            expect(() => order.buildPayload()).toThrow("Invalid items")
        })

        it("clamps guestCount to minimum of 2 when set to 0", () => {
            const order = useOrderStore()
            order.setPackage({ ...PACKAGE } as Package)
            order.setGuestCount(0)
            order.setCartItems([{ ...MEAT_ITEM }] as CartItem[])
            const payload = order.buildPayload()
            expect(payload.guest_count).toBe(2)
        })

        it("throws \"must have at least one modifier\" when package has no meat items", () => {
            const order = useOrderStore()
            order.setPackage({ ...PACKAGE } as Package)
            order.setGuestCount(2)
            // Only a side — no meat category item → modifiers will be []
            order.setCartItems([{ ...SIDE_ITEM }] as CartItem[])
            expect(() => order.buildPayload()).toThrow("must have at least one modifier")
        })
    })

    // =========================================================================
    // 2. submitOrder — happy path
    // =========================================================================
    describe("submitOrder — happy path", () => {
        it("calls POST /api/devices/create-order with idempotency key, sets state, starts polling", async () => {
            const order = useOrderStore()
            const session = useSessionStore()
            seedDevice()
            seedOrderState(order)

            // Polling tick (immediate) returns preparing so isPolling stays true
            mockGet.mockResolvedValue({ data: { order: { id: 1, order_id: 19561, status: "preparing" } } })
            mockPost.mockResolvedValueOnce({ data: API_ORDER_RESP })

            const result = await order.submitOrder()

            // Correct endpoint called
            expect(mockPost).toHaveBeenCalledWith(
                "/api/devices/create-order",
                expect.objectContaining({
                    guest_count: 2,
                    items: expect.arrayContaining([
                        expect.objectContaining({ is_package: true, modifiers: expect.any(Array) }),
                    ]),
                }),
                expect.objectContaining({ headers: expect.objectContaining({ "X-Idempotency-Key": expect.any(String) }) })
            )

            // table_id injected from deviceStore
            const callBody = mockPost.mock.calls[0][1]
            expect(callBody.table_id).toBe(1)

            // Store state — polling tick runs before this line and normalises currentOrder to { order: {...} }
            expect(order.hasPlacedOrder).toBe(true)
            expect(order.currentOrder).toMatchObject({ order: expect.objectContaining({ order_id: 19561 }) })
            expect(order.cartItems).toEqual([])
            expect(order.getHistory().length).toBeGreaterThanOrEqual(1)

            // Session order id set to business order_id from response
            expect(session.orderId).toBe(19561)

            // Return value matches API response
            expect(result).toEqual(API_ORDER_RESP)

            order.stopOrderPolling()
        })

        it("blocks a second order submission if hasPlacedOrder is true", async () => {
            const order = useOrderStore()
            seedDevice()
            order.setHasPlacedOrder(true)

            await expect(order.submitOrder()).rejects.toThrow("initial order has already been placed")
        })
    })

    // =========================================================================
    // 3. submitRefill — payload correctness (name field fix verification)
    // =========================================================================
    describe("submitRefill — payload correctness", () => {
        it("sends items with menu_id, name, quantity, note to /api/order/{orderId}/refill", async () => {
            const order = useOrderStore()
            seedDevice()

            // Post-order state
            order.setHasPlacedOrder(true)
            order.setCurrentOrder(API_ORDER_RESP as any)
            order.setIsRefillMode(true)
            order.setRefillItems([{ ...REFILL_ITEM_1 }, { ...REFILL_ITEM_2 }] as CartItem[])

            mockGet.mockResolvedValueOnce({ data: { order: { ...API_ORDER_RESP.order, status: "preparing" } } })
            mockPost.mockResolvedValueOnce({ data: { success: true } })

            await order.submitRefill()

            // URL uses order_id (business key)
            expect(mockPost).toHaveBeenCalledWith(
                `/api/order/${API_ORDER_RESP.order.order_id}/refill`,
                {
                    items: [
                        { menu_id: 30, name: "Sliced Beef", quantity: 2, note: "Refill" },
                        { menu_id: 31, name: "Garlic Rice", quantity: 1, note: "Refill" },
                    ],
                },
                expect.objectContaining({ headers: expect.objectContaining({ "X-Idempotency-Key": expect.any(String) }) })
            )

            // Refill state cleared
            expect(order.refillItems).toEqual([])
            expect(order.isRefillMode).toBe(false)
            expect(order.getHistory().length).toBeGreaterThan(0)
        })

        it("includes custom note when refill item has a note property", async () => {
            const order = useOrderStore()
            seedDevice()
            order.setHasPlacedOrder(true)
            order.setCurrentOrder(API_ORDER_RESP as any)
            order.setIsRefillMode(true)
            order.setRefillItems([{ id: 30, name: "Sliced Beef", price: 0, quantity: 1, category: "meats", note: "No sauce" }] as CartItem[])

            mockGet.mockResolvedValueOnce({ data: { order: { ...API_ORDER_RESP.order, status: "preparing" } } })
            mockPost.mockResolvedValueOnce({ data: { success: true } })

            await order.submitRefill()

            const sentItems = mockPost.mock.calls[0][1].items
            expect(sentItems[0].note).toBe("No sauce")
        })

        it("throws if no existing order (guard against stale state)", async () => {
            const order = useOrderStore()
            order.setHasPlacedOrder(false)
            order.clearCurrentOrder()

            await expect(order.submitRefill()).rejects.toThrow("No existing order found")
        })

        it("blocks refill when local order is already terminal and ends session", async () => {
            const order = useOrderStore()
            const session = useSessionStore()
            seedDevice()

            session.setIsActive(true)
            session.setOrderId(19561)
            order.setHasPlacedOrder(true)
            order.setCurrentOrder({ order: { ...API_ORDER_RESP.order, status: "completed" } } as any)
            order.setIsRefillMode(true)
            order.setRefillItems([{ ...REFILL_ITEM_1 }] as CartItem[])

            await expect(order.submitRefill()).rejects.toThrow("already completed/cancelled")

            expect(mockGet).not.toHaveBeenCalled()
            expect(mockPost).not.toHaveBeenCalled()
            expect(session.isActive).toBe(false)
            expect(order.hasPlacedOrder).toBe(false)
        })

        it("blocks refill when live order status is terminal and ends session", async () => {
            const order = useOrderStore()
            const session = useSessionStore()
            seedDevice()

            session.setIsActive(true)
            session.setOrderId(19561)
            order.setHasPlacedOrder(true)
            order.setCurrentOrder({ order: { ...API_ORDER_RESP.order, status: "preparing" } } as any)
            order.setIsRefillMode(true)
            order.setRefillItems([{ ...REFILL_ITEM_1 }] as CartItem[])

            mockGet.mockResolvedValueOnce({
                data: { order: { ...API_ORDER_RESP.order, status: "completed" } },
            })

            await expect(order.submitRefill()).rejects.toThrow("already completed/cancelled")

            expect(mockGet).toHaveBeenCalledWith(`/api/device-order/by-order-id/${API_ORDER_RESP.order.order_id}`)
            expect(mockPost).not.toHaveBeenCalled()
            expect(session.isActive).toBe(false)
            expect(order.hasPlacedOrder).toBe(false)
        })
    })

    // =========================================================================
    // 4. submitOrder — 409 conflict recovery
    // =========================================================================
    describe("submitOrder — 409 conflict recovery", () => {
        it("recovers existing order on 409 and marks resumed=true without re-throwing", async () => {
            const order = useOrderStore()
            seedDevice()
            seedOrderState(order)

            const conflictErr = {
                response: {
                    status: 409,
                    data: {
                        message: "Active order exists",
                        order: { id: 1, order_id: 19561, order_number: "ORD-19561", status: "preparing" },
                    },
                },
            }
            mockPost.mockRejectedValueOnce(conflictErr)
            // polling tick after recovery
            mockGet.mockResolvedValue({ data: { order: { id: 1, order_id: 19561, status: "preparing" } } })

            const result = await order.submitOrder()

            expect(result.resumed).toBe(true)
            expect(result.success).toBe(true)
            expect(order.hasPlacedOrder).toBe(true)
            expect(order.currentOrder).toBeTruthy()

            order.stopOrderPolling()
        })
    })

    // =========================================================================
    // 5. submitOrder — 503 SESSION_NOT_FOUND
    // =========================================================================
    describe("submitOrder — 503 SESSION_NOT_FOUND", () => {
        it("throws user-friendly error when POS session is absent", async () => {
            const order = useOrderStore()
            seedDevice()
            seedOrderState(order)

            const sessionErr = {
                response: { status: 503, data: { code: "SESSION_NOT_FOUND" } },
            }
            mockPost.mockRejectedValueOnce(sessionErr)

            await expect(order.submitOrder()).rejects.toThrow("No active POS terminal session")
            expect(order.hasPlacedOrder).toBe(false)
        })
    })

    // =========================================================================
    // 6. submitOrder — 401 authentication error
    // =========================================================================
    describe("submitOrder — 401 authentication error", () => {
        it("throws token-expired message on 401", async () => {
            const order = useOrderStore()
            seedDevice()
            seedOrderState(order)

            const authErr = {
                response: { status: 401, data: { exception: "authentication" } },
            }
            mockPost.mockRejectedValueOnce(authErr)

            await expect(order.submitOrder()).rejects.toThrow("session has expired")
        })
    })

    // =========================================================================
    // 7. submitOrder — pre-flight validation guards
    // =========================================================================
    describe("submitOrder — pre-flight validation guards", () => {
        it("throws if device token is missing", async () => {
            const order = useOrderStore()
            const ds = useDeviceStore()
            ds.setToken(null)
            ds.setTable({ id: 1, name: "T1", status: "unknown", is_available: false, is_locked: false })
            seedOrderState(order)

            await expect(order.submitOrder()).rejects.toThrow("Device not authenticated")
        })

        it("resets isSubmitting after pre-flight validation failure", async () => {
            const order = useOrderStore()
            const ds = useDeviceStore()

            // Missing token forces a pre-flight throw path.
            ds.setToken(null)
            ds.setTable({ id: 1, name: "T1", status: "unknown", is_available: false, is_locked: false })
            seedOrderState(order)

            await expect(order.submitOrder()).rejects.toThrow("Device not authenticated")
            expect(order.isSubmitting).toBe(false)
        })

        it("throws if table is not assigned", async () => {
            const order = useOrderStore()
            const ds = useDeviceStore()
            ds.setToken("test-token")
            ds.setTable(null)
            seedOrderState(order)

            await expect(order.submitOrder()).rejects.toThrow("No table assigned")
        })

        it("throws if no package is selected", async () => {
            const order = useOrderStore()
            seedDevice()
            order.setPackage({} as Package)
            order.setGuestCount(2)
            order.setCartItems([{ ...MEAT_ITEM }] as CartItem[])

            await expect(order.submitOrder()).rejects.toThrow("No package selected")
        })
    })

    // =========================================================================
    // 8. Session teardown
    // =========================================================================
    describe("session teardown", () => {
        it("end() clears all order state and removes session_active from localStorage", async () => {
            const order = useOrderStore()
            const session = useSessionStore()
            seedDevice()

            // Simulate a fully placed order
            order.setHasPlacedOrder(true)
            order.setCurrentOrder(API_ORDER_RESP as any)
            order.setSubmittedItems([{ id: 10, menu_id: 10, name: "Wagyu Beef", quantity: 1, price: 0, isUnlimited: false }])
            session.setIsActive(true)
            session.setOrderId(19561)
            try { localStorage.setItem("session_active", "1") } catch (_) {}

            await session.end()

            expect(session.isActive).toBe(false)
            expect(session.orderId).toBeNull()
            expect(order.hasPlacedOrder).toBe(false)
            expect(order.currentOrder).toBeNull()
            expect(order.cartItems).toEqual([])
            expect(localStorage.getItem("session_active")).toBeNull()
        })
    })

    // =========================================================================
    // 9. Full sequential flow (menu select → submit → refill → teardown)
    // =========================================================================
    describe("full sequential flow", () => {
        it("submits order → refills → session ends cleanly", async () => {
            const order = useOrderStore()
            const session = useSessionStore()
            seedDevice()
            seedOrderState(order)

            // Step 1: submit initial order
            mockGet.mockResolvedValue({ data: { order: { id: 1, order_id: 19561, status: "preparing" } } })
            mockPost.mockResolvedValueOnce({ data: API_ORDER_RESP })

            await order.submitOrder()

            expect(order.hasPlacedOrder).toBe(true)
            expect(session.orderId).toBe(19561)
            expect(order.cartItems).toEqual([])

            order.stopOrderPolling()

            // Step 2: enter refill mode and submit refill
            order.setIsRefillMode(true)
            order.setRefillItems([{ ...REFILL_ITEM_1 }] as CartItem[])

            mockPost.mockResolvedValueOnce({ data: { success: true } })

            await order.submitRefill()

            expect(order.refillItems).toEqual([])
            expect(order.isRefillMode).toBe(false)

            // Verify refill called correct URL with name field present
            const refillCall = mockPost.mock.calls[1]
            expect(refillCall[0]).toBe("/api/order/19561/refill")
            expect(refillCall[1].items[0].name).toBe("Sliced Beef")

            // Step 3: session teardown
            try { localStorage.setItem("session_active", "1") } catch (_) {}
            session.setIsActive(true)

            await session.end()

            expect(session.isActive).toBe(false)
            expect(order.hasPlacedOrder).toBe(false)
            expect(order.currentOrder).toBeNull()
            expect(localStorage.getItem("session_active")).toBeNull()
        })
    })
})
