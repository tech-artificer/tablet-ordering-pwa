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
 *   - api.get(url)      → used by Order store
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
    ;(order as any).draft = [{ ...MEAT_ITEM }, { ...SIDE_ITEM }] as CartItem[]
}

function seedSubmittedOrderState () {
    const session = useSessionStore()
    const order = useOrderStore()

    session.setOrderId(19561)
    ;(order as any).rounds = [{
        kind: "initial",
        number: 1,
        submittedAt: new Date().toISOString(),
        items: [{ id: 10, menu_id: 10, name: "Wagyu Beef", quantity: 1, price: 0, isUnlimited: false, img_url: null, category: "meats" }],
        serverOrderId: 19561,
        serverTotal: 0,
    }]
    ;(order as any).serverOrderId = 19561
    ;(order as any).serverStatus = "confirmed"
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
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    // =========================================================================
    // 1. buildPayload — structure verification
    // =========================================================================
    describe("buildPayload — payload structure", () => {
        it("produces package_id + normalized menu rows", () => {
            const order = useOrderStore()
            seedDevice()
            seedOrderState(order)

            const payload = order.buildPayload()

            expect(payload.guest_count).toBe(2)
            expect(payload.package_id).toBe(50)
            expect(payload.items).toHaveLength(2)

            const meat = payload.items.find(i => i.menu_id === 10)
            const side = payload.items.find(i => i.menu_id === 20)
            expect(meat?.quantity).toBe(1)
            expect(side?.quantity).toBe(2)
        })

        it("throws \"Invalid items\" when cart is empty and no package id", () => {
            const order = useOrderStore()
            order.setPackage({ ...PACKAGE } as Package)
            order.setGuestCount(2)
            ;(order as any).draft = []
            expect(() => order.buildPayload()).toThrow("Invalid items")
        })

        it("clamps guestCount to minimum of 2 when set to 0", () => {
            const order = useOrderStore()
            order.setPackage({ ...PACKAGE } as Package)
            order.setGuestCount(0)
            ;(order as any).draft = [{ ...MEAT_ITEM }] as CartItem[]
            const payload = order.buildPayload()
            expect(payload.guest_count).toBe(2)
        })

        it("allows non-meat menu rows and leaves inclusion/pricing to server", () => {
            const order = useOrderStore()
            order.setPackage({ ...PACKAGE } as Package)
            order.setGuestCount(2)
            ;(order as any).draft = [{ ...SIDE_ITEM }] as CartItem[]
            const payload = order.buildPayload()
            expect(payload.items).toEqual([{ menu_id: 20, quantity: 2 }])
        })
    })

    // =========================================================================
    // 2. submitOrder — happy path
    // =========================================================================
    describe("submitOrder — happy path", () => {
        it("calls POST /api/devices/create-order with idempotency key, sets state", async () => {
            const order = useOrderStore()
            const session = useSessionStore()
            seedDevice()
            seedOrderState(order)

            mockPost.mockResolvedValueOnce({ data: API_ORDER_RESP })

            const result = await order.submitOrder()

            // Correct endpoint called
            expect(mockPost).toHaveBeenCalledWith(
                "/api/devices/create-order",
                expect.objectContaining({
                    guest_count: 2,
                    package_id: 50,
                    items: expect.arrayContaining([
                        expect.objectContaining({ menu_id: 10, quantity: 1 }),
                    ]),
                }),
                expect.objectContaining({ headers: expect.objectContaining({ "X-Idempotency-Key": expect.any(String) }) })
            )

            // Store state
            expect(order.hasPlacedOrder).toBe(true)
            expect(order.serverOrderId).toBe(19561)
            expect((order as any).draft).toEqual([])
            expect((order as any).rounds).toHaveLength(1)

            // Session order id set to business order_id from response
            expect(session.orderId).toBe(19561)

            // Return value matches API response
            expect(result).toEqual(API_ORDER_RESP)
        })

        it("blocks a second order submission when initial order is server-confirmed", async () => {
            const order = useOrderStore()
            seedDevice()
            ;(order as any).serverOrderId = 19561

            await expect(order.submitOrder()).rejects.toThrow("initial order has already been placed")
        })
    })

    // =========================================================================
    // 3. submitRefill — payload correctness (name field fix verification)
    // =========================================================================
    describe("submitRefill — payload correctness", () => {
        it("sends order_id and normalized items to /api/order/{orderId}/refill", async () => {
            const order = useOrderStore()
            seedDevice()

            // Post-order state
            ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 19561, serverTotal: 0 }]
            ;(order as any).serverOrderId = 19561
            ;(order as any).serverStatus = "preparing"
            ;(order as any).mode = "refill"
            ;(order as any).draft = [{ ...REFILL_ITEM_1 }, { ...REFILL_ITEM_2 }] as CartItem[]

            mockGet.mockResolvedValueOnce({ data: { order: { ...API_ORDER_RESP.order, status: "preparing" } } })
            mockPost.mockResolvedValueOnce({ data: { success: true } })

            await order.submitRefill()

            // URL uses order_id (business key)
            expect(mockPost).toHaveBeenCalledWith(
                `/api/order/${API_ORDER_RESP.order.order_id}/refill`,
                {
                    order_id: API_ORDER_RESP.order.order_id,
                    items: [
                        { menu_id: 30, quantity: 2 },
                        { menu_id: 31, quantity: 1 },
                    ],
                },
                expect.objectContaining({ headers: expect.objectContaining({ "X-Idempotency-Key": expect.any(String) }) })
            )

            // Refill state cleared
            expect((order as any).draft).toEqual([])
            // mode stays "refill" — ready for next refill
            expect(order.isRefillMode).toBe(true)
            expect((order as any).rounds.length).toBeGreaterThan(0)
        })

        it("normalizes duplicate refill rows by menu_id", async () => {
            const order = useOrderStore()
            seedDevice()
            ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 19561, serverTotal: 0 }]
            ;(order as any).serverOrderId = 19561
            ;(order as any).serverStatus = "preparing"
            ;(order as any).mode = "refill"
            ;(order as any).draft = [
                { id: 30, name: "Sliced Beef", price: 0, quantity: 1, category: "meats", note: "No sauce" },
                { id: 30, name: "Sliced Beef", price: 0, quantity: 2, category: "meats", note: "No sauce" },
            ] as CartItem[]

            mockGet.mockResolvedValueOnce({ data: { order: { ...API_ORDER_RESP.order, status: "preparing" } } })
            mockPost.mockResolvedValueOnce({ data: { success: true } })

            await order.submitRefill()

            const sentItems = mockPost.mock.calls[0][1].items
            expect(sentItems).toEqual([{ menu_id: 30, quantity: 3 }])
        })

        it("throws if no existing order (guard against stale state)", async () => {
            const order = useOrderStore()
            ;(order as any).serverOrderId = null

            await expect(order.submitRefill()).rejects.toThrow("No existing order found")
        })

        it("blocks refill when local order is already terminal and ends session", async () => {
            const order = useOrderStore()
            const session = useSessionStore()
            seedDevice()

            session.setIsActive(true)
            session.setOrderId(19561)
            ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 19561, serverTotal: 0 }]
            ;(order as any).serverOrderId = 19561
            ;(order as any).serverStatus = "completed"
            ;(order as any).mode = "refill"
            ;(order as any).draft = [{ ...REFILL_ITEM_1 }] as CartItem[]

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
            ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 19561, serverTotal: 0 }]
            ;(order as any).serverOrderId = 19561
            ;(order as any).serverStatus = "preparing"
            ;(order as any).mode = "refill"
            ;(order as any).draft = [{ ...REFILL_ITEM_1 }] as CartItem[]

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

            const result = await order.submitOrder()

            expect(result.resumed).toBe(true)
            expect(result.success).toBe(true)
            expect(order.hasPlacedOrder).toBe(true)
            expect(order.serverOrderId).toBe(19561)
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
            ;(order as any).draft = [{ ...MEAT_ITEM }] as CartItem[]

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
            ;(order as any).rounds = [{
                kind: "initial",
                number: 1,
                submittedAt: new Date().toISOString(),
                items: [{ id: 10, menu_id: 10, name: "Wagyu Beef", quantity: 1, price: 0, isUnlimited: false, img_url: null, category: "meats" }],
                serverOrderId: 19561,
                serverTotal: 0,
            }]
            ;(order as any).serverOrderId = 19561
            ;(order as any).serverStatus = "confirmed"
            session.setIsActive(true)
            session.setOrderId(19561)
            try { localStorage.setItem("session_active", "1") } catch (_) {}

            await session.end()

            expect(session.isActive).toBe(false)
            expect(session.orderId).toBeNull()
            expect(order.hasPlacedOrder).toBe(false)
            expect(order.serverOrderId).toBeNull()
            expect((order as any).draft).toEqual([])
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
            mockPost.mockResolvedValueOnce({ data: API_ORDER_RESP })

            await order.submitOrder()

            expect(order.hasPlacedOrder).toBe(true)
            expect(session.orderId).toBe(19561)
            expect((order as any).draft).toEqual([])

            // Step 2: set up refill items and submit refill
            // After appendRound, mode is already "refill"
            ;(order as any).draft = [{ ...REFILL_ITEM_1 }] as CartItem[]
            ;(order as any).serverStatus = "preparing"

            mockGet.mockResolvedValueOnce({ data: { order: { ...API_ORDER_RESP.order, status: "preparing" } } })
            mockPost.mockResolvedValueOnce({ data: { success: true } })

            await order.submitRefill()

            expect((order as any).draft).toEqual([])
            expect(order.isRefillMode).toBe(true)

            // Verify refill called correct URL with name field present
            const refillCall = mockPost.mock.calls[1]
            expect(refillCall[0]).toBe("/api/order/19561/refill")
            expect(refillCall[1].order_id).toBe(19561)
            expect(refillCall[1].items[0]).toEqual({ menu_id: 30, quantity: 2 })

            // Step 3: session teardown
            try { localStorage.setItem("session_active", "1") } catch (_) {}
            session.setIsActive(true)

            await session.end()

            expect(session.isActive).toBe(false)
            expect(order.hasPlacedOrder).toBe(false)
            expect(order.serverOrderId).toBeNull()
            expect(localStorage.getItem("session_active")).toBeNull()
        })
    })
})
