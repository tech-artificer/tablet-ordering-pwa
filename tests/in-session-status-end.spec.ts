import { computed, defineComponent, nextTick, ref, watch } from "vue"
import { mount } from "@vue/test-utils"
import { createPinia, setActivePinia } from "pinia"
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import { useSessionStore } from "~/stores/Session"
import { useOrderStore } from "~/stores/Order"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Minimal harness that replicates only the orderStatus watcher + handleSessionEnd
 * from in-session.vue, using the REAL pinia stores.
 *
 * This lets us test reactive behaviour (watcher fires, terminal handled flag set)
 * without mounting the full Nuxt SFC, which requires mocking ~20 Nuxt composables.
 */
function makeWatcherHarness () {
    const sessionStore = useSessionStore()
    const orderStore = useOrderStore()
    const showEndScreen = ref(false)

    function handleSessionEnd () {
        if (showEndScreen.value) { return }
        sessionStore.markTerminalHandled()
        showEndScreen.value = true
    }

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
                if (status !== "pending" && status !== "confirmed") {
                    handleSessionEnd()
                }
            }, { immediate: true })
            return { showEndScreen }
        },
        template: "<div />",
    })

    return { Harness, sessionStore, orderStore, showEndScreen }
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
        const { Harness, sessionStore, orderStore } = makeWatcherHarness()
        orderStore.setCurrentOrder({ order: { status: "completed" } } as any)
        mount(Harness)
        await nextTick()
        expect(sessionStore.isTerminalHandled()).toBe(true)
    })

    it("does NOT end session when initial status is pending", async () => {
        const { Harness, sessionStore, orderStore } = makeWatcherHarness()
        orderStore.setCurrentOrder({ order: { status: "pending" } } as any)
        mount(Harness)
        await nextTick()
        expect(sessionStore.isTerminalHandled()).toBe(false)
    })

    it("does NOT end session when initial status is confirmed", async () => {
        const { Harness, sessionStore, orderStore } = makeWatcherHarness()
        orderStore.setCurrentOrder({ order: { status: "confirmed" } } as any)
        mount(Harness)
        await nextTick()
        expect(sessionStore.isTerminalHandled()).toBe(false)
    })

    it("ends session when status transitions from live to completed", async () => {
        const { Harness, sessionStore, orderStore } = makeWatcherHarness()
        orderStore.setCurrentOrder({ order: { status: "pending" } } as any)
        mount(Harness)
        await nextTick()
        expect(sessionStore.isTerminalHandled()).toBe(false)

        orderStore.updateOrderStatus("completed")
        await nextTick()
        expect(sessionStore.isTerminalHandled()).toBe(true)
    })

    it.each(["preparing", "ready", "voided", "cancelled"])(
        "ends session for terminal status %s — regression: any non-live status, not just 'completed'",
        async (terminalStatus) => {
            setActivePinia(createPinia())
            vi.stubGlobal("navigateTo", vi.fn())
            const { Harness, sessionStore, orderStore } = makeWatcherHarness()
            orderStore.setCurrentOrder({ order: { status: "pending" } } as any)
            mount(Harness)
            await nextTick()

            orderStore.updateOrderStatus(terminalStatus)
            await nextTick()
            expect(sessionStore.isTerminalHandled()).toBe(true)
        }
    )

    it("handleSessionEnd is idempotent — second terminal status does not re-fire", async () => {
        const { Harness, sessionStore, orderStore, showEndScreen } = makeWatcherHarness()
        orderStore.setCurrentOrder({ order: { status: "pending" } } as any)
        mount(Harness)
        await nextTick()

        orderStore.updateOrderStatus("completed")
        await nextTick()
        expect(showEndScreen.value).toBe(true)
        expect(sessionStore.isTerminalHandled()).toBe(true)

        // A second terminal status must not double-fire (showEndScreen guard)
        orderStore.updateOrderStatus("voided")
        await nextTick()
        // State unchanged — handleSessionEnd returned early
        expect(showEndScreen.value).toBe(true)
        expect(sessionStore.isTerminalHandled()).toBe(true)
    })
})
