import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"

import type { CartItem, Package } from "../types"
import { useDeviceStore } from "../stores/Device"
import { useOrderStore } from "../stores/Order"
import { useSessionStore } from "../stores/Session"

const mocks = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    triggerSessionEnd: vi.fn(),
    confetti: vi.fn(),
    routerReplace: vi.fn(),
    routerPush: vi.fn(),
}))

vi.mock("../composables/useApi", () => ({
    useApi: () => ({
        get: mocks.get,
        post: mocks.post,
    }),
}))

vi.mock("../composables/useSessionEndFlow", () => ({
    useSessionEndFlow: () => ({
        triggerSessionEnd: mocks.triggerSessionEnd,
        finalizeAndReturnHome: vi.fn(),
    }),
}))

vi.mock("canvas-confetti", () => ({
    default: mocks.confetti,
}))

async function flushPromises () {
    for (let i = 0; i < 10; i += 1) {
        await Promise.resolve()
    }
}

function seedNavigatorOnline () {
    if (typeof global.navigator === "undefined") {
        // @ts-expect-error test runtime shim
        global.navigator = { onLine: true }
    } else {
        Object.defineProperty(global.navigator, "onLine", { value: true, configurable: true })
    }
}

function seedDevice () {
    const device = useDeviceStore()
    device.setToken("test-token")
    device.setTable({ id: 1, name: "T1", status: "active", is_available: true, is_locked: false } as any)
}

function seedOrderSelection (order: ReturnType<typeof useOrderStore>) {
    order.setPackage({ id: 50, name: "Yakiniku Combo", price: 250, is_taxable: false } as Package)
    order.setGuestCount(2)
    ;(order as any).draft = [
        { id: 10, name: "Wagyu Beef", price: 0, quantity: 1, category: "meats", isUnlimited: false } as CartItem,
    ]
}

function seedSubmittedOrderState () {
    const session = useSessionStore()
    const order = useOrderStore()

    session.setOrderId(19561)
    ;(order as any).rounds = [{
        kind: "initial",
        number: 1,
        submittedAt: new Date().toISOString(),
        items: [{ id: 10, menu_id: 10, name: "Wagyu Beef", quantity: 1, price: 0, img_url: null, category: "meats", isUnlimited: false }],
        serverOrderId: 19561,
        serverTotal: 0,
    }]
    ;(order as any).serverOrderId = 19561
    ;(order as any).serverStatus = "confirmed"
}

async function mountReviewPage () {
    vi.stubGlobal("definePageMeta", vi.fn())
    vi.stubGlobal("useRouter", () => ({
        push: mocks.routerPush,
        replace: mocks.routerReplace,
    }))

    const { default: ReviewPage } = await import("../pages/order/review.vue")

    return mount(ReviewPage, {
        global: {
            stubs: {
                NuxtErrorBoundary: {
                    name: "NuxtErrorBoundary",
                    template: "<div><slot /></div>",
                },
                OrderingStep3ReviewSubmit: {
                    name: "OrderingStep3ReviewSubmit",
                    emits: ["order-submitted"],
                    template: "<button data-testid=\"submit-child\" @click=\"$emit('order-submitted')\">submit</button>",
                },
            },
        },
    })
}

async function emitReviewSubmitted (wrapper: Awaited<ReturnType<typeof mountReviewPage>>) {
    await wrapper.get("[data-testid='submit-child']").trigger("click")
    await flushPromises()
    await wrapper.vm.$nextTick()
    await flushPromises()
}

describe("review page handoff", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.useRealTimers()
        vi.unstubAllGlobals()
        mocks.get.mockReset()
        mocks.post.mockReset()
        mocks.triggerSessionEnd.mockReset().mockResolvedValue(undefined)
        mocks.confetti.mockReset()
        mocks.routerReplace.mockReset()
        mocks.routerPush.mockReset()
        seedNavigatorOnline()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.useRealTimers()
    })

    it("does not navigate when the real review handler sees sessionStore.start resolve false", async () => {
        const session = useSessionStore()
        const order = useOrderStore()
        session.setIsActive(false)
        seedSubmittedOrderState()
        vi.spyOn(session, "start").mockResolvedValueOnce(false)

        const wrapper = await mountReviewPage()

        await emitReviewSubmitted(wrapper)

        expect(mocks.routerReplace).not.toHaveBeenCalled()
        expect(wrapper.get("[role='alert']").text()).toContain("Your order was sent")
        expect(session.start).toHaveBeenCalledWith({ preserveSubmittedOrder: true })
        expect(order.hasPlacedOrder).toBe(true)
        expect(order.serverOrderId).toBe(19561)
        expect((order as any).rounds[0].items).toHaveLength(1)
    }, 15000)

    it("navigates when the real review handler sees sessionStore.start resolve true", async () => {
        const session = useSessionStore()
        session.setIsActive(false)
        seedSubmittedOrderState()
        vi.spyOn(session, "start").mockResolvedValueOnce(true)

        const wrapper = await mountReviewPage()

        await emitReviewSubmitted(wrapper)

        expect(mocks.routerReplace).toHaveBeenCalledWith("/order/in-session")
        expect(session.start).toHaveBeenCalledWith({ preserveSubmittedOrder: true })
        expect(wrapper.find("[role='alert']").exists()).toBe(false)
    }, 15000)

    it("does not navigate when the real review handler catches a sessionStore.start error", async () => {
        const session = useSessionStore()
        session.setIsActive(false)
        seedSubmittedOrderState()

        vi.spyOn(session, "start").mockRejectedValueOnce(new Error("Network failure"))
        const wrapper = await mountReviewPage()

        await emitReviewSubmitted(wrapper)

        expect(mocks.routerReplace).not.toHaveBeenCalled()
        expect(wrapper.get("[role='alert']").text()).toContain("Order sent, but navigation failed")
    }, 15000)
})
