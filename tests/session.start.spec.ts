import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { unref } from "vue"

import { useSessionStore } from "../stores/Session"
import { useOrderStore } from "../stores/Order"
import { useDeviceStore } from "../stores/Device"

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockLoadAllMenus = vi.fn()
let mockPackages: any[] = []

vi.mock("../composables/useApi", () => ({
    useApi: () => ({
        get: mockGet,
        post: mockPost,
    }),
}))

vi.mock("../stores/Menu", () => ({
    useMenuStore: () => ({
        loadAllMenus: mockLoadAllMenus,
        get packages () { return mockPackages },
    }),
}))

describe("session start flow", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockGet.mockReset()
        mockPost.mockReset()
        mockLoadAllMenus.mockReset()
        mockPackages = []

        mockGet.mockResolvedValue({ data: null })
        mockPost.mockResolvedValue({ data: {} })
        mockLoadAllMenus.mockResolvedValue(undefined)
    })

    it("preserves selected guestCount and package when starting session from package selection", async () => {
        const session = useSessionStore()
        const order = useOrderStore()
        const device = useDeviceStore()

        device.setToken("test-device-token")
        ;(device as any).expiration = Date.now() + 60 * 60 * 1000

        const pkg = {
            id: 101,
            name: "Premium Grill",
            price: 799,
            modifiers: [],
            is_taxable: false,
            tax: { percentage: 0 },
        } as any

        // Ensure the package is present in the refreshed menu store data
        mockPackages.push(pkg)

        order.setGuestCount(6)
        order.setPackage(pkg)

        const started = await session.start({ preserveSelection: true })

        expect(started).toBe(true)
        expect(order.guestCount).toBe(6)
        expect(unref(order.package)?.id).toBe(101)
    })

    it("resets guestCount and package by default when starting a fresh session", async () => {
        const session = useSessionStore()
        const order = useOrderStore()
        const device = useDeviceStore()

        device.setToken("test-device-token")
        ;(device as any).expiration = Date.now() + 60 * 60 * 1000

        order.setGuestCount(9)
        order.setPackage({
            id: 202,
            name: "Reset Check Package",
            price: 999,
            modifiers: [],
            is_taxable: false,
            tax: { percentage: 0 },
        } as any)

        const started = await session.start()

        expect(started).toBe(true)
        expect(order.guestCount).toBe(2)
        expect(order.package).toBeNull()
    })

    it("clears transactional state (cart items) even when preserveSelection is true", async () => {
        const session = useSessionStore()
        const order = useOrderStore()
        const device = useDeviceStore()

        device.setToken("test-device-token")
        ;(device as any).expiration = Date.now() + 60 * 60 * 1000

        // Seed transactional cart state that must be cleared on session start
        order.setCartItems([{ id: 1, name: "Pre-existing Item", quantity: 2 } as any])
        order.setGuestCount(4)

        const started = await session.start({ preserveSelection: true })

        expect(started).toBe(true)
        // Guest count is preserved by preserveSelection
        expect(order.guestCount).toBe(4)
        // Cart items are transactional state and must be cleared regardless of preserveSelection
        expect(order.getCartItems()).toHaveLength(0)
    })

    it("preserves submitted order state during post-submit handoff", async () => {
        const session = useSessionStore()
        const order = useOrderStore()
        const device = useDeviceStore()

        device.setToken("test-device-token")
        ;(device as any).expiration = Date.now() + 60 * 60 * 1000

        session.setOrderId(19561)
        order.setHasPlacedOrder(true)
        order.setCurrentOrder({
            success: true,
            order: {
                id: 1,
                order_id: 19561,
                order_number: "ORD-19561",
                status: "confirmed",
            },
        } as any)
        order.setSubmittedItems([
            { id: 10, menu_id: 10, name: "Wagyu Beef", quantity: 1, price: 0, category: "meats" } as any,
        ])

        const started = await session.start({ preserveSubmittedOrder: true })

        expect(started).toBe(true)
        expect(order.hasPlacedOrder).toBe(true)
        expect(order.getCurrentOrder()?.order?.order_id).toBe(19561)
        expect(order.submittedItems).toHaveLength(1)
        expect(session.orderId).toBe(19561)
    })
})
