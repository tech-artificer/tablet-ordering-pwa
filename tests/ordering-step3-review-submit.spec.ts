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
        order.setGuestCount(2)
        order.setPackage({ id: 1, name: "A-La-Carte", price: 199 } as any)
        ;(order as any).draft = [
            { id: 10, name: "Beef", quantity: 1, category: "meats", price: 0 },
        ]

        const submitOrderSpy = vi.spyOn(order, "submitOrder").mockResolvedValue({ success: true } as any)
        const submitRefillSpy = vi.spyOn(order, "submitRefill")

        const wrapper = mount(OrderingStep3ReviewSubmit)
        const button = wrapper.find("button")

        expect(button.text()).toContain("Confirm & Send to Kitchen")
        expect((button.element as HTMLButtonElement).disabled).toBe(false)

        await button.trigger("click")

        expect(submitOrderSpy).toHaveBeenCalledTimes(1)
        expect(submitRefillSpy).not.toHaveBeenCalled()
        expect(wrapper.emitted("order-submitted")).toBeTruthy()
    })

    it("allows continue-to-session when initial order already exists", async () => {
        const order = useOrderStore()
        ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 9001, serverTotal: 0 }]
        ;(order as any).serverOrderId = 9001
        ;(order as any).serverStatus = "pending"

        const submitOrderSpy = vi.spyOn(order, "submitOrder")

        const wrapper = mount(OrderingStep3ReviewSubmit)
        const button = wrapper.find("button")

        expect(button.text()).toContain("Continue to Session")
        expect((button.element as HTMLButtonElement).disabled).toBe(false)
        await button.trigger("click")

        expect(submitOrderSpy).not.toHaveBeenCalled()
        expect(wrapper.emitted("order-submitted")).toBeTruthy()
    })

    it("shows blocker message and keeps submit disabled when meat selection is missing", async () => {
        const order = useOrderStore()
        order.setGuestCount(2)
        order.setPackage({ id: 7, name: "Premium", price: 299 } as any)
        ;(order as any).draft = []

        const wrapper = mount(OrderingStep3ReviewSubmit)
        const button = wrapper.find("button")

        expect((button.element as HTMLButtonElement).disabled).toBe(true)
        expect(wrapper.text()).toContain("Select at least one meat")

        await button.trigger("click")
        expect(wrapper.text()).toContain("Select at least one meat")
    })

    it("renders items from activeCart for initial order review", () => {
        const order = useOrderStore()
        ;(order as any).draft = [
            { id: 201, name: "Korean Chili Samgyupsal", quantity: 2, category: "meats", price: 0 },
        ]

        const wrapper = mount(OrderingStep3ReviewSubmit)

        expect(wrapper.text()).toContain("Korean Chili Samgyupsal")
        expect(wrapper.text()).toContain("×2")
    })

    it("renders items from activeCart for refill review", () => {
        const order = useOrderStore()
        ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 1, serverTotal: 0 }]
        ;(order as any).mode = "refill"
        ;(order as any).draft = [
            { id: 301, name: "Cheese Corn", quantity: 1, category: "side", price: 0 },
        ]

        const wrapper = mount(OrderingStep3ReviewSubmit)

        expect(wrapper.text()).toContain("Cheese Corn")
        expect(wrapper.text()).toContain("×1")
    })

    it("submits refill and emits order-submitted when in refill mode", async () => {
        const order = useOrderStore()
        ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 5001, serverTotal: 0 }]
        ;(order as any).serverOrderId = 5001
        ;(order as any).serverStatus = "pending"
        ;(order as any).mode = "refill"
        ;(order as any).draft = [
            { id: 20, name: "Pork Belly", quantity: 2, category: "meats", price: 0 },
        ]

        const submitRefillSpy = vi.spyOn(order, "submitRefill").mockResolvedValue({ success: true } as any)
        const submitOrderSpy = vi.spyOn(order, "submitOrder")

        const wrapper = mount(OrderingStep3ReviewSubmit)
        const button = wrapper.find("button")

        expect(button.text()).toContain("Submit Refill")
        expect((button.element as HTMLButtonElement).disabled).toBe(false)

        await button.trigger("click")

        expect(submitRefillSpy).toHaveBeenCalledTimes(1)
        expect(submitOrderSpy).not.toHaveBeenCalled()
        expect(wrapper.emitted("order-submitted")).toBeTruthy()
    })

    it("shows blocker message and keeps submit disabled when refill cart is empty", async () => {
        const order = useOrderStore()
        ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 1, serverTotal: 0 }]
        ;(order as any).mode = "refill"
        ;(order as any).draft = []

        const wrapper = mount(OrderingStep3ReviewSubmit)
        const button = wrapper.find("button")

        expect((button.element as HTMLButtonElement).disabled).toBe(true)
        expect(wrapper.text()).toContain("Add at least one refill item")

        await button.trigger("click")
        expect(wrapper.text()).toContain("Add at least one refill item")
    })
})
