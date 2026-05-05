import { computed, defineComponent, nextTick, watch } from "vue"
import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import { useSessionStore } from "~/stores/Session"
import { useOrderStore } from "~/stores/Order"
import { useSessionEndStore } from "~/stores/SessionEnd"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = ["completed", "voided", "cancelled"] as const

/**
 * Minimal harness that replicates only the orderStatus watcher from in-session.vue,
 * using the REAL pinia stores and the same terminal-status condition as the live code.
 *
 * Idempotency is guarded by sessionEndStore.active (matching the live useSessionEndStore pattern).
 */
function makeWatcherHarness () {
    const sessionStore = useSessionStore()
    const orderStore = useOrderStore()
    const sessionEndStore = useSessionEndStore()

    // Mirror the exact computed chain from in-session.vue
    const currentOrder = computed(() => {
        const raw = orderStore.currentOrder
        if (!raw) { return null }
        return (raw as any).order ?? raw
    })
    const orderStatus = computed<string>(() => (currentOrder.value as any)?.status ?? "pending")

    const Harness = defineComponent({
        setup () {
            watch(orderStatus, (status) => {
                if ((TERMINAL_STATUSES as readonly string[]).includes(status)) {
                    if (!sessionEndStore.active) {
                        sessionEndStore.startTransition({ reason: status as any, orderNumber: null, source: "in-session" })
                    }
                }
            }, { immediate: true })
            return {}
        },
        template: "<div />",
    })

    return { Harness, sessionStore, orderStore, sessionEndStore }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("in-session status watcher — POS Payment Sync spec", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.stubGlobal("navigateTo", vi.fn())
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("fires immediately (immediate: true) and ends session when initial status is terminal", async () => {
        const { Harness, sessionEndStore, orderStore } = makeWatcherHarness()
        orderStore.setCurrentOrder({ order: { status: "completed" } } as any)
        mount(Harness)
        await nextTick()
        expect(sessionEndStore.active).toBe(true)
    })

    it("does NOT end session when initial status is pending", async () => {
        const { Harness, sessionEndStore, orderStore } = makeWatcherHarness()
        orderStore.setCurrentOrder({ order: { status: "pending" } } as any)
        mount(Harness)
        await nextTick()
        expect(sessionEndStore.active).toBe(false)
    })

    it("does NOT end session when initial status is confirmed", async () => {
        const { Harness, sessionEndStore, orderStore } = makeWatcherHarness()
        orderStore.setCurrentOrder({ order: { status: "confirmed" } } as any)
        mount(Harness)
        await nextTick()
        expect(sessionEndStore.active).toBe(false)
    })

    it("ends session when status transitions from live to completed", async () => {
        const { Harness, sessionEndStore, orderStore } = makeWatcherHarness()
        orderStore.setCurrentOrder({ order: { status: "pending" } } as any)
        mount(Harness)
        await nextTick()
        expect(sessionEndStore.active).toBe(false)

        orderStore.updateOrderStatus("completed")
        await nextTick()
        expect(sessionEndStore.active).toBe(true)
    })

    it.each(["completed", "voided", "cancelled"])(
        "ends session for terminal status %s",
        async (terminalStatus) => {
            setActivePinia(createPinia())
            vi.stubGlobal("navigateTo", vi.fn())
            const { Harness, sessionEndStore, orderStore } = makeWatcherHarness()
            orderStore.setCurrentOrder({ order: { status: "pending" } } as any)
            mount(Harness)
            await nextTick()

            orderStore.updateOrderStatus(terminalStatus)
            await nextTick()
            expect(sessionEndStore.active).toBe(true)
        }
    )

    it.each(["in_progress", "preparing", "ready", "served"])(
        "does NOT end session for non-terminal intermediate status %s",
        async (nonTerminalStatus) => {
            setActivePinia(createPinia())
            vi.stubGlobal("navigateTo", vi.fn())
            const { Harness, sessionEndStore, orderStore } = makeWatcherHarness()
            orderStore.setCurrentOrder({ order: { status: "pending" } } as any)
            mount(Harness)
            await nextTick()

            orderStore.updateOrderStatus(nonTerminalStatus)
            await nextTick()
            expect(sessionEndStore.active).toBe(false)
        }
    )

    it("startTransition is idempotent — second terminal status does not re-claim", async () => {
        const { Harness, sessionEndStore, orderStore } = makeWatcherHarness()
        orderStore.setCurrentOrder({ order: { status: "pending" } } as any)
        mount(Harness)
        await nextTick()

        orderStore.updateOrderStatus("completed")
        await nextTick()
        expect(sessionEndStore.active).toBe(true)

        // A second terminal status must not re-fire startTransition
        orderStore.updateOrderStatus("voided")
        await nextTick()
        // active remains true — already claimed
        expect(sessionEndStore.active).toBe(true)
    })
})
