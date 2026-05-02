import { describe, it, expect, beforeEach } from "vitest"
import { mount } from "@vue/test-utils"
import { setActivePinia, createPinia } from "pinia"
import CartSidebar from "../components/order/CartSidebar.vue"
import { useOrderStore } from "../stores/Order"
// device store not required for this test; avoid importing to prevent helper type errors
import { useDeviceStore } from "../stores/Device"
import { useSessionStore } from "../stores/Session"

// Minimal stubs for child components used in CartSidebar
const globalStubs = {
    "cart-item-card": true,
    "el-badge": true,
    "el-empty": true,
    RefreshCw: true,
    Clock: true,
    ChefHat: true,
    CheckCircle: true,
    AlertCircle: true
}

describe("CartSidebar UI", () => {
    let pinia: ReturnType<typeof createPinia>
    beforeEach(() => {
        pinia = createPinia()
        setActivePinia(pinia)
        // Ensure session store minimally populated
        const ss = useSessionStore()
        ss.setOrderId(null)
    })

    it("hides Place Order button after initial order is placed", async () => {
        const order = useOrderStore()
        // Set up order state to simulate an already-placed order
        order.setHasPlacedOrder(true)
        order.setIsRefillMode(false)

        const wrapper = mount(CartSidebar, {
            global: {
                plugins: [pinia],
                stubs: globalStubs
            },
            props: {
                selectedPackage: { id: 1, name: "Test" } as any,
                guestCount: 2,
                cartItems: [],
                packageTotal: 100,
                addOnsTotal: 0,
                taxAmount: 0,
                grandTotal: 100,
                isRefillMode: false,
                hasPlacedOrder: true
            }
        })

        // Ensure no button contains the 'Place Order' label
        const buttons = wrapper.findAll("button")
        const hasPlaceOrder = buttons.some(b => b.text().toLowerCase().includes("place order"))
        expect(hasPlaceOrder).toBe(false)

        // Instead, an 'Order Refill' button (or similar) should be present when placed
        const hasRefill = buttons.some(b => b.text().toLowerCase().includes("refill"))
        expect(hasRefill).toBe(true)
    })

    it("keeps Place Order enabled when package exists in order store and at least one meat is selected", async () => {
        const order = useOrderStore()
        const device = useDeviceStore()

        order.setPackage({ id: 5, name: "Store Package", price: 249 } as any)
        order.setHasPlacedOrder(false)
        order.setIsRefillMode(false)
        device.setTable({ id: 1, name: "T1", status: "active", is_available: true, is_locked: false } as any)

        const wrapper = mount(CartSidebar, {
            global: {
                plugins: [pinia],
                stubs: globalStubs
            },
            props: {
                selectedPackage: null,
                guestCount: 2,
                cartItems: [{ id: 10, name: "Beef", price: 100, quantity: 1, category: "meats" } as any],
                packageTotal: 249,
                addOnsTotal: 0,
                taxAmount: 0,
                grandTotal: 249,
                isRefillMode: false,
                hasPlacedOrder: false
            }
        })

        const placeOrderButton = wrapper.findAll("button").find(b => b.text().toLowerCase().includes("place order"))
        expect(placeOrderButton).toBeTruthy()
        expect(placeOrderButton!.attributes("disabled")).toBeUndefined()
    })
})
