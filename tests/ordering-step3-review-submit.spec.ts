import { describe, it, expect, beforeEach, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import OrderingStep3ReviewSubmit from "../components/order/OrderingStep3ReviewSubmit.vue"
import { useOrderStore } from "../stores/Order"
import { useSubmitState } from "../composables/useSubmitState"

describe("OrderingStep3ReviewSubmit", () => {
    beforeEach(() => {
        const pinia = createPinia()
        setActivePinia(pinia)
        useSubmitState().reset()
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

        expect(button.text()).toContain("Confirm & Send to Kitchen")
        expect(button.attributes("disabled")).toBeUndefined()

        await button.trigger("click")

        expect(submitOrderSpy).toHaveBeenCalledTimes(1)
        expect(wrapper.emitted("order-submitted")).toBeTruthy()
    })

    it("allows continue-to-session when initial order already exists", async () => {
        const order = useOrderStore()
        order.setHasPlacedOrder(true)
        order.setIsRefillMode(false)
        order.setCurrentOrder({
            order: {
                id: 9001,
                order_id: 9001,
                status: "pending",
                items: [],
            },
        } as any)

        const submitOrderSpy = vi.spyOn(order, "submitOrder")

        const wrapper = mount(OrderingStep3ReviewSubmit)
        const button = wrapper.find("button")

        expect(button.text()).toContain("Continue to Session")
        expect(button.attributes("disabled")).toBeUndefined()
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

    it("renders fallback items from currentOrder when submittedItems are empty", () => {
        const order = useOrderStore()
        order.setHasPlacedOrder(true)
        order.setIsRefillMode(false)
        order.setSubmittedItems([])
        order.setCurrentOrder({
            order: {
                status: "pending",
                items: [
                    {
                        id: 100,
                        is_package: true,
                        modifiers: [
                            { menu_id: 201, name: "Korean Chili Samgyupsal", quantity: 2 },
                        ],
                    },
                ],
            },
        } as any)

        const wrapper = mount(OrderingStep3ReviewSubmit)

        expect(wrapper.text()).toContain("Korean Chili Samgyupsal")
        expect(wrapper.text()).toContain("×2")
    })

    it("renders fallback items from order_items even before hasPlacedOrder flips true", () => {
        const order = useOrderStore()
        order.setHasPlacedOrder(false)
        order.setIsRefillMode(false)
        order.setSubmittedItems([])
        order.setCartItems([])
        order.setCurrentOrder({
            order: {
                status: "pending",
                order_items: [
                    {
                        id: 301,
                        name: "Cheese Corn",
                        quantity: 1,
                        category: "side",
                        price: 0,
                    },
                ],
            },
        } as any)

        const wrapper = mount(OrderingStep3ReviewSubmit)

        expect(wrapper.text()).toContain("Cheese Corn")
        expect(wrapper.text()).toContain("×1")
    })

    it("submits refill and emits order-submitted when in refill mode", async () => {
        const order = useOrderStore()
        order.setHasPlacedOrder(true)
        order.setIsRefillMode(true)
        order.setCurrentOrder({
            order: {
                id: 5001,
                order_id: 5001,
                status: "pending",
            },
        } as any)
        order.setRefillItems([
            { id: 20, name: "Pork Belly", quantity: 2, category: "meats", price: 0 } as any,
        ])

        const submitRefillSpy = vi.spyOn(order, "submitRefill").mockResolvedValue({ success: true } as any)

        const wrapper = mount(OrderingStep3ReviewSubmit)
        const button = wrapper.find("button")

        expect(button.text()).toContain("Submit Refill")
        expect(button.attributes("disabled")).toBeUndefined()

        await button.trigger("click")

        expect(submitRefillSpy).toHaveBeenCalledTimes(1)
        expect(wrapper.emitted("order-submitted")).toBeTruthy()
    })

    it("shows blocker message and keeps submit disabled when refill cart is empty", async () => {
        const order = useOrderStore()
        order.setHasPlacedOrder(true)
        order.setIsRefillMode(true)
        order.setCartItems([])

        const wrapper = mount(OrderingStep3ReviewSubmit)
        const button = wrapper.find("button")

        expect(button.attributes("disabled")).toBeDefined()
        expect(wrapper.text()).toContain("Add at least one refill item")

        await button.trigger("click")
        expect(wrapper.text()).toContain("Add at least one refill item")
    })
})
