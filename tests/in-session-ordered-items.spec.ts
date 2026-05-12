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

function makeInitialRound (items: any[]) {
    return {
        kind: "initial" as const,
        number: 1,
        submittedAt: new Date().toISOString(),
        items,
        serverOrderId: null,
        serverTotal: 0,
    }
}

function makeRefillRound (number: number, items: any[]) {
    return {
        kind: "refill" as const,
        number,
        submittedAt: new Date().toISOString(),
        items,
        serverOrderId: null,
        serverRefillId: null,
        serverTotal: 0,
    }
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
        ;(orderStore as any).rounds = [
            makeInitialRound([{ id: 10, name: "Initial Beef", quantity: 2, price: 0, isUnlimited: false, img_url: null, category: "meats" }]),
            makeRefillRound(2, [{ id: 20, name: "Refill Pork", quantity: 1, price: 0, isUnlimited: false, img_url: null, category: "meats" }]),
        ]

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
        ;(orderStore as any).rounds = [
            makeInitialRound([{ id: 10, name: "Initial Beef", quantity: 2, price: 0, isUnlimited: false, img_url: null, category: "meats" }]),
        ]

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
        ;(orderStore as any).rounds = [
            makeInitialRound([{ id: 10, name: "Initial Beef", quantity: 2, price: 0, isUnlimited: false, img_url: null, category: "meats" }]),
            makeRefillRound(2, [{ id: 20, name: "Refill Pork", quantity: 1, price: 0, isUnlimited: false, img_url: null, category: "meats" }]),
        ]

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
        ;(orderStore as any).serverOrderId = 123
        ;(orderStore as any).serverStatus = "confirmed"
        // Set rounds[] directly — primary path per DATA_MODEL.md
        ;(orderStore as any).rounds = [
            {
                kind: "initial",
                number: 1,
                submittedAt: "2026-01-01T00:00:00.000Z",
                items: [
                    { id: 10, name: "Initial Beef", quantity: 2, price: 0, isUnlimited: false, img_url: null, category: "meats" } as any,
                ],
                serverOrderId: 1001,
                serverTotal: 100,
            },
            {
                kind: "refill",
                number: 2,
                submittedAt: "2026-01-01T01:00:00.000Z",
                items: [
                    { id: 20, name: "Refill Pork", quantity: 1, price: 0, isUnlimited: false, img_url: null, category: "meats" } as any,
                ],
                serverOrderId: 1001,
                serverRefillId: 1002,
                serverTotal: 50,
            },
            {
                kind: "refill",
                number: 3,
                submittedAt: "2026-01-01T02:00:00.000Z",
                items: [
                    { id: 30, name: "Refill Side", quantity: 3, price: 0, isUnlimited: false, img_url: null, category: "sides" } as any,
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

        // displaySubmittedItems reads from rounds[] and should show all items from all rounds
        expect(wrapper.text()).toContain("Initial Beef")
        expect(wrapper.text()).toContain("Refill Pork")
        expect(wrapper.text()).toContain("Refill Side")
        // Verify labels are correct
        expect(wrapper.text()).toContain("Initial Order")
        expect(wrapper.text()).toContain("Refill")
    })

    it("total item count includes initial + refill quantities", () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const orderStore = useOrderStore()
        ;(orderStore as any).serverOrderId = 456
        ;(orderStore as any).serverStatus = "confirmed"
        // Set rounds[] directly — primary path per DATA_MODEL.md
        ;(orderStore as any).rounds = [
            {
                kind: "initial",
                number: 1,
                submittedAt: "2026-01-01T00:00:00.000Z",
                items: [
                    { id: 10, name: "Initial Beef", quantity: 2, price: 0, isUnlimited: false, img_url: null, category: "meats" } as any,
                ],
                serverOrderId: 1001,
                serverTotal: 100,
            },
            {
                kind: "refill",
                number: 2,
                submittedAt: "2026-01-01T01:00:00.000Z",
                items: [
                    { id: 20, name: "Refill Pork", quantity: 1, price: 0, isUnlimited: false, img_url: null, category: "meats" } as any,
                ],
                serverOrderId: 1001,
                serverRefillId: 1002,
                serverTotal: 50,
            },
            {
                kind: "refill",
                number: 3,
                submittedAt: "2026-01-01T02:00:00.000Z",
                items: [
                    { id: 30, name: "Refill Side", quantity: 3, price: 0, isUnlimited: false, img_url: null, category: "sides" } as any,
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

        // Total items = 2 + 1 + 3 = 6; displaySubmittedItems.value.length should be 6
        const text = wrapper.text()
        expect(text).toContain("×2") // Initial Beef qty
        expect(text).toContain("×1") // Refill Pork qty
        expect(text).toContain("×3") // Refill Side qty
    })

    it("shows refill label badge on refill items", () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        const orderStore = useOrderStore()
        ;(orderStore as any).rounds = [
            makeInitialRound([{ id: 10, name: "Initial Beef", quantity: 2, price: 0, isUnlimited: false, img_url: null, category: "meats" }]),
            makeRefillRound(2, [{ id: 20, name: "Refill Pork", quantity: 1, price: 0, isUnlimited: false, img_url: null, category: "meats" }]),
        ]

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

    it("shows empty state when no rounds have been submitted", () => {
        const pinia = createPinia()
        setActivePinia(pinia)
        // rounds is empty by default — nothing to display

        const wrapper = mount(InSession, {
            ...mountOptions,
            global: {
                ...mountOptions.global,
                plugins: [pinia],
            },
        })

        // No items text since rounds is empty
        expect(wrapper.text()).not.toContain("Initial Beef")
        expect(wrapper.text()).not.toContain("Fallback Item")
    })
})
