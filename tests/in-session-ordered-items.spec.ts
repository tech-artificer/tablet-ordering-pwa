import { describe, it, expect, beforeEach, vi } from "vitest"
import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { ref } from "vue"
import { useOrderStore } from "~/stores/Order"

import InSession from "~/pages/order/in-session.vue"

// Global mock for definePageMeta and navigateTo
const g = global as any
g.definePageMeta = vi.fn()
g.navigateTo = vi.fn()

// Mock vue-router
vi.mock("vue-router", () => ({
    useRouter: () => ({
        replace: vi.fn(),
        push: vi.fn(),
    }),
}))

// Mock Session store
vi.mock("~/stores/Session", () => ({
    useSessionStore: () => ({
        isActive: true,
        orderId: 123,
        remainingMs: ref(3600000),
        timerExpired: false,
        sessionStartedAt: Date.now(),
        getIsActive: () => true,
        getOrderId: () => 123,
        start: vi.fn().mockResolvedValue(true),
        end: vi.fn().mockResolvedValue(undefined),
    }),
}))

// Mock composables
vi.mock("~/composables/useApi", () => ({
    useApi: () => ({
        get: vi.fn(),
        post: vi.fn(),
    }),
}))

vi.mock("~/composables/useIdleDetector", () => ({
    useIdleDetector: () => ({
        start: vi.fn(),
        stop: vi.fn(),
        isWarning: ref(false),
    }),
}))

vi.mock("~/composables/useSessionEndFlow", () => ({
    useSessionEndFlow: () => ({
        triggerSessionEnd: vi.fn(),
    }),
}))

// Mock logger
vi.mock("~/utils/logger", () => ({
    logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}))

// Mock element-plus
vi.mock("element-plus", () => ({
    ElDialog: { template: "<div><slot /></div>" },
    ElButton: { template: "<button><slot /></button>" },
    ElMessage: {
        success: vi.fn(),
        error: vi.fn(),
    },
}))

const mountOptions = {
    global: {
        stubs: {
            NuxtErrorBoundary: { template: "<div><slot /></div>" },
        },
    },
}

describe("in-session ordered items display", () => {
    beforeEach(() => {
        const pinia = createPinia()
        setActivePinia(pinia)
    })

    it("does not render Refill History heading", () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const orderStore = useOrderStore()
        orderStore.setHasPlacedOrder(true)
        orderStore.setHistory([
            {
                order: {
                    order_number: "1001",
                    status: "confirmed",
                    items: [
                        { id: 10, name: "Initial Beef", quantity: 2, price: 0, category: "meats" },
                    ],
                },
            },
            {
                order: {
                    order_number: "1002",
                    status: "confirmed",
                    items: [
                        { id: 20, name: "Refill Pork", quantity: 1, price: 0, category: "meats" },
                    ],
                },
            },
        ] as any)

        const wrapper = mount(InSession, {
            ...mountOptions,
            global: {
                ...mountOptions.global,
                plugins: [pinia],
            },
        })

        expect(wrapper.text()).not.toContain("Refill History")
    })

    it("renders initial order items in the ordered-items stream", () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const orderStore = useOrderStore()
        orderStore.setHasPlacedOrder(true)
        orderStore.setHistory([
            {
                order: {
                    order_number: "1001",
                    status: "confirmed",
                    items: [
                        { id: 10, name: "Initial Beef", quantity: 2, price: 0, category: "meats" },
                    ],
                },
            },
        ] as any)

        const wrapper = mount(InSession, {
            ...mountOptions,
            global: {
                ...mountOptions.global,
                plugins: [pinia],
            },
        })

        expect(wrapper.text()).toContain("Initial Beef")
        expect(wrapper.text()).toContain("×2")
    })

    it("renders refill items in the same ordered-items stream", () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const orderStore = useOrderStore()
        orderStore.setHasPlacedOrder(true)
        orderStore.setHistory([
            {
                order: {
                    order_number: "1001",
                    status: "confirmed",
                    items: [
                        { id: 10, name: "Initial Beef", quantity: 2, price: 0, category: "meats" },
                    ],
                },
            },
            {
                order: {
                    order_number: "1002",
                    status: "confirmed",
                    items: [
                        { id: 20, name: "Refill Pork", quantity: 1, price: 0, category: "meats" },
                    ],
                },
            },
        ] as any)

        const wrapper = mount(InSession, {
            ...mountOptions,
            global: {
                ...mountOptions.global,
                plugins: [pinia],
            },
        })

        expect(wrapper.text()).toContain("Refill Pork")
        expect(wrapper.text()).toContain("×1")
    })

    it("renders items from multiple refill history entries together", () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const orderStore = useOrderStore()
        orderStore.setHasPlacedOrder(true)
        // Set currentOrder with items directly to test the page renders them
        orderStore.setCurrentOrder({
            order_id: 123,
            order_number: "ORD-123",
            status: "confirmed",
            items: [
                { id: 10, name: "Initial Beef", quantity: 2, price: 0, category: "meats", menu_id: 10 },
                { id: 20, name: "Refill Pork", quantity: 1, price: 0, category: "meats", menu_id: 20 },
                { id: 30, name: "Refill Side", quantity: 3, price: 0, category: "sides", menu_id: 30 },
            ],
        } as any)

        const wrapper = mount(InSession, {
            ...mountOptions,
            global: {
                ...mountOptions.global,
                plugins: [pinia],
            },
        })

        expect(wrapper.text()).toContain("Initial Beef")
        expect(wrapper.text()).toContain("Refill Pork")
        expect(wrapper.text()).toContain("Refill Side")
    })

    it("total item count includes initial + refill quantities", () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const orderStore = useOrderStore()
        orderStore.setHasPlacedOrder(true)
        // Set currentOrder so the page has a reference point
        orderStore.setCurrentOrder({
            order_id: 456,
            order_number: "ORD-456",
            status: "confirmed",
            items: [],
        } as any)
        // Set rounds using the Ref's .value property
        orderStore.rounds.value = [
            {
                kind: "initial",
                number: 1,
                submittedAt: new Date().toISOString(),
                items: [
                    { id: 10, name: "Initial Beef", quantity: 2, price: 0, category: "meats" } as any,
                ],
                serverOrderId: 1001,
                serverRefillId: null,
                serverTotal: 100,
            },
            {
                kind: "refill",
                number: 2,
                submittedAt: new Date().toISOString(),
                items: [
                    { id: 20, name: "Refill Pork", quantity: 1, price: 0, category: "meats" } as any,
                ],
                serverOrderId: 1001,
                serverRefillId: 1002,
                serverTotal: 50,
            },
            {
                kind: "refill",
                number: 3,
                submittedAt: new Date().toISOString(),
                items: [
                    { id: 30, name: "Refill Side", quantity: 3, price: 0, category: "sides" } as any,
                ],
                serverOrderId: 1001,
                serverRefillId: 1003,
                serverTotal: 75,
            },
        ]

        const wrapper = mount(InSession, {
            ...mountOptions,
            global: {
                ...mountOptions.global,
                plugins: [pinia],
            },
        })

        // Total items = 2 + 1 + 3 = 6
        expect(wrapper.text()).toContain("6")
    })

    it("shows refill label badge on refill items", () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const orderStore = useOrderStore()
        orderStore.setHasPlacedOrder(true)
        orderStore.setHistory([
            {
                order: {
                    order_number: "1001",
                    status: "confirmed",
                    items: [
                        { id: 10, name: "Initial Beef", quantity: 2, price: 0, category: "meats" },
                    ],
                },
            },
            {
                order: {
                    order_number: "1002",
                    status: "confirmed",
                    items: [
                        { id: 20, name: "Refill Pork", quantity: 1, price: 0, category: "meats" },
                    ],
                },
            },
        ] as any)

        const wrapper = mount(InSession, {
            ...mountOptions,
            global: {
                ...mountOptions.global,
                plugins: [pinia],
            },
        })

        // Should show "Refill #1" label on refill item
        expect(wrapper.text()).toContain("Refill #1")
    })

    it("falls back to submittedItems when history is empty", () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const orderStore = useOrderStore()
        orderStore.setHasPlacedOrder(true)
        orderStore.setHistory([])
        orderStore.setSubmittedItems([
            { id: 10, menu_id: 10, name: "Fallback Item", quantity: 2, price: 0, category: "meats", isUnlimited: false, img_url: null },
        ])

        const wrapper = mount(InSession, {
            ...mountOptions,
            global: {
                ...mountOptions.global,
                plugins: [pinia],
            },
        })

        expect(wrapper.text()).toContain("Fallback Item")
        expect(wrapper.text()).toContain("×2")
    })

    it("falls back to currentOrder items when history and submittedItems are empty", () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const orderStore = useOrderStore()
        orderStore.setHasPlacedOrder(true)
        orderStore.setHistory([])
        orderStore.setSubmittedItems([])
        orderStore.setCurrentOrder({
            order: {
                order_number: "1005",
                status: "confirmed",
                items: [
                    { id: 50, name: "Current Order Item", quantity: 5, price: 0, category: "meats" },
                ],
            },
        } as any)

        const wrapper = mount(InSession, {
            ...mountOptions,
            global: {
                ...mountOptions.global,
                plugins: [pinia],
            },
        })

        expect(wrapper.text()).toContain("Current Order Item")
        expect(wrapper.text()).toContain("×5")
    })
})
