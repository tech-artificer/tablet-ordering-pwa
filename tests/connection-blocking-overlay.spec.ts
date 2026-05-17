import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { mount } from "@vue/test-utils"
import { useConnectionStore } from "~/stores/Connection"
import ConnectionBlockingOverlay from "~/components/ui/ConnectionBlockingOverlay.vue"

describe("ConnectionBlockingOverlay.vue", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("should not render when connection is healthy", () => {
        const store = useConnectionStore()
        expect(store.blocking).toBe(false)

        const wrapper = mount(ConnectionBlockingOverlay, {
            global: {
                stubs: {
                    Teleport: true,
                },
            },
        })

        expect(wrapper.find(".fixed").exists()).toBe(false)
    })

    it("should render when blocking", async () => {
        const store = useConnectionStore()
        store.setOnline(false)

        // Simulate debounce completion
        vi.advanceTimersByTime(1500)

        const wrapper = mount(ConnectionBlockingOverlay, {
            global: {
                stubs: {
                    Teleport: true,
                },
            },
        })

        // After blocking is true, overlay should render
        expect(wrapper.find(".fixed").exists()).toBe(true)
    })

    it("should show offline message when no internet", async () => {
        const store = useConnectionStore()
        store.setOnline(false)
        vi.advanceTimersByTime(1500)

        const wrapper = mount(ConnectionBlockingOverlay, {
            global: {
                stubs: {
                    Teleport: true,
                },
            },
        })

        const text = wrapper.text()
        expect(text).toContain("No Internet Connection")
    })

    it("should show reconnecting message when reverb is down", async () => {
        const store = useConnectionStore()
        store.setReverbState("disconnected")
        vi.advanceTimersByTime(1500)

        const wrapper = mount(ConnectionBlockingOverlay, {
            global: {
                stubs: {
                    Teleport: true,
                },
            },
        })

        const text = wrapper.text()
        expect(text).toContain("Reconnecting")
    })

    it("should show escalated message at max attempts", async () => {
        const store = useConnectionStore()
        store.setOnline(false)
        store.setReconnectAttempt(10)
        vi.advanceTimersByTime(1500)

        const wrapper = mount(ConnectionBlockingOverlay, {
            global: {
                stubs: {
                    Teleport: true,
                },
            },
        })

        const text = wrapper.text()
        expect(text).toContain("Unable to Connect")
        expect(text).toContain("staff member")
    })

    it("should have no dismiss button", () => {
        const store = useConnectionStore()
        store.setOnline(false)
        vi.advanceTimersByTime(1500)

        const wrapper = mount(ConnectionBlockingOverlay, {
            global: {
                stubs: {
                    Teleport: true,
                },
            },
        })

        // Should have no close/dismiss button
        expect(wrapper.find("button").exists()).toBe(false)
        expect(wrapper.find("[data-testid='close']").exists()).toBe(false)
    })

    it("should auto-clear on recovery", async () => {
        const store = useConnectionStore()
        store.setOnline(false)
        vi.advanceTimersByTime(1500)

        const wrapper = mount(ConnectionBlockingOverlay, {
            global: {
                stubs: {
                    Teleport: true,
                },
            },
        })

        expect(wrapper.find(".fixed").exists()).toBe(true)

        // Recover
        store.setOnline(true)

        await wrapper.vm.$nextTick()
        expect(store.blocking).toBe(false)
    })

    it("should use proper z-index for stacking", () => {
        const store = useConnectionStore()
        store.setOnline(false)
        vi.advanceTimersByTime(1500)

        const wrapper = mount(ConnectionBlockingOverlay, {
            global: {
                stubs: {
                    Teleport: true,
                },
            },
        })

        const overlay = wrapper.find(".fixed")
        expect(overlay.classes()).toContain("z-[9998]")
    })
})
