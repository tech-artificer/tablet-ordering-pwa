import { describe, it, expect, beforeEach, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import OrderingStep3ReviewSubmit from "../components/order/OrderingStep3ReviewSubmit.vue"
import { useOrderStore } from "../stores/Order"

describe("OrderingStep3ReviewSubmit", () => {
    beforeEach(() => {
        const pinia = createPinia()
        setActivePinia(pinia)
    })

    it("submits initial order and emits order-submitted", async () => {
        const order = useOrderStore()
        order.setHasPlacedOrder(false)
        order.setIsRefillMode(false)
        order.setGuestCount(2)
        order.setPackage({ id: 1, name: "A-La-Carte", price: 199 } as any)
        order.setCartItems([
            { id: 10, name: "Beef", quantity: 1, category: "meats", price: 0 } as any,
        ])

        const submitOrderSpy = vi.spyOn(order, "submitOrder").mockResolvedValue({ success: true } as any)

        const wrapper = mount(OrderingStep3ReviewSubmit)
        const button = wrapper.find("button")

        expect(button.text()).toContain("Place Order")
        expect(button.attributes("disabled")).toBeUndefined()

        await button.trigger("click")

        expect(submitOrderSpy).toHaveBeenCalledTimes(1)
        expect(wrapper.emitted("order-submitted")).toBeTruthy()
    })

    it("allows continue-to-session when initial order already exists", async () => {
        const order = useOrderStore()
        order.setHasPlacedOrder(true)
        order.setIsRefillMode(false)

        const submitOrderSpy = vi.spyOn(order, "submitOrder")

        const wrapper = mount(OrderingStep3ReviewSubmit)
        const button = wrapper.find("button")

        expect(button.text()).toContain("Continue to Session")
        await button.trigger("click")

        expect(submitOrderSpy).not.toHaveBeenCalled()
        expect(wrapper.emitted("order-submitted")).toBeTruthy()
    })

    it("shows blocker message and keeps submit disabled when meat selection is missing", async () => {
        const order = useOrderStore()
        order.setHasPlacedOrder(false)
        order.setIsRefillMode(false)
        order.setGuestCount(2)
        order.setPackage({ id: 7, name: "Premium", price: 299 } as any)
        order.setCartItems([])

        const wrapper = mount(OrderingStep3ReviewSubmit)
        const button = wrapper.find("button")

        expect(button.attributes("disabled")).toBeDefined()
        expect(wrapper.text()).toContain("Select at least one meat")

        await button.trigger("click")
        expect(wrapper.text()).toContain("Select at least one meat")
    })
})
