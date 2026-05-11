import { describe, it, expect, beforeEach } from "vitest"
import { defineComponent } from "vue"
import { mount } from "@vue/test-utils"
import { useNetworkStatus } from "~/composables/useNetworkStatus"

function setNavigatorOnline (online: boolean) {
    Object.defineProperty(window.navigator, "onLine", {
        configurable: true,
        value: online,
    })
}

const ProbeComponent = defineComponent({
    setup () {
        const { isOnline } = useNetworkStatus()
        return { isOnline }
    },
    template: "<div />",
})

describe("useNetworkStatus lifecycle", () => {
    beforeEach(() => {
        setNavigatorOnline(true)
    })

    it("refreshes network state when a new consumer mounts after previous unmount", async () => {
        const first = mount(ProbeComponent)
        expect((first.vm as any).isOnline).toBe(true)

        setNavigatorOnline(false)
        window.dispatchEvent(new Event("offline"))
        await first.vm.$nextTick()
        expect((first.vm as any).isOnline).toBe(false)

        first.unmount()

        setNavigatorOnline(true)
        const second = mount(ProbeComponent)
        expect((second.vm as any).isOnline).toBe(true)
        second.unmount()
    })

    it("keeps listeners active across multiple concurrent consumers", async () => {
        const first = mount(ProbeComponent)
        const second = mount(ProbeComponent)
        expect((first.vm as any).isOnline).toBe(true)
        expect((second.vm as any).isOnline).toBe(true)

        setNavigatorOnline(false)
        window.dispatchEvent(new Event("offline"))
        await first.vm.$nextTick()
        await second.vm.$nextTick()
        expect((first.vm as any).isOnline).toBe(false)
        expect((second.vm as any).isOnline).toBe(false)

        first.unmount()

        setNavigatorOnline(true)
        window.dispatchEvent(new Event("online"))
        await second.vm.$nextTick()
        expect((second.vm as any).isOnline).toBe(true)

        second.unmount()

        setNavigatorOnline(false)
        const third = mount(ProbeComponent)
        expect((third.vm as any).isOnline).toBe(false)
        third.unmount()
    })
})
