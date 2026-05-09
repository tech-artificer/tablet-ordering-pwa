import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

import { useSessionEndStore } from "../stores/SessionEnd"
import { useSessionStore } from "../stores/Session"
import { useSessionEndFlow } from "../composables/useSessionEndFlow"

// Mock vue-router
const routerMock = vi.hoisted(() => ({
    replace: vi.fn(),
    shouldThrow: false,
}))
vi.mock("vue-router", () => ({
    useRouter: () => {
        if (routerMock.shouldThrow) {
            throw new Error("router unavailable")
        }
        return { replace: routerMock.replace }
    },
}))

// Mock useApi (required by stores)
vi.mock("../composables/useApi", () => ({ useApi: () => ({ get: vi.fn(), post: vi.fn() }) }))

describe("useSessionEndFlow", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        routerMock.replace.mockReset()
        routerMock.replace.mockResolvedValue(undefined)
        routerMock.shouldThrow = false
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it("triggerSessionEnd sets SessionEnd store and navigates to transition page", async () => {
        const { triggerSessionEnd } = useSessionEndFlow()
        const sessionEndStore = useSessionEndStore()

        await triggerSessionEnd("completed", { source: "broadcast", orderNumber: "ORD-042" })

        expect(sessionEndStore.active).toBe(true)
        expect(sessionEndStore.reason).toBe("completed")
        expect(sessionEndStore.orderNumber).toBe("ORD-042")
        expect(sessionEndStore.source).toBe("broadcast")

        expect(routerMock.replace).toHaveBeenCalledWith({
            path: "/order/session-ended",
            query: { reason: "completed", order: "ORD-042" },
        })
    })

    it("multiple concurrent triggers call router.replace only once", async () => {
        const { triggerSessionEnd } = useSessionEndFlow()

        await Promise.all([
            triggerSessionEnd("completed", { source: "broadcast" }),
            triggerSessionEnd("completed", { source: "watcher" }),
            triggerSessionEnd("completed", { source: "polling" }),
        ])

        expect(routerMock.replace).toHaveBeenCalledTimes(1)
    })

    it("sessionStore.end() is called exactly once", async () => {
        const { triggerSessionEnd } = useSessionEndFlow()
        const session = useSessionStore()
        const endSpy = vi.spyOn(session, "end")

        await triggerSessionEnd("voided", { source: "watcher" })

        expect(endSpy).toHaveBeenCalledTimes(1)
    })

    it("does not include order query param when orderNumber is absent", async () => {
        const { triggerSessionEnd } = useSessionEndFlow()

        await triggerSessionEnd("cancelled", { source: "polling" })

        expect(routerMock.replace).toHaveBeenCalledWith({
            path: "/order/session-ended",
            query: { reason: "cancelled" },
        })
    })

    it("second trigger is a no-op when already active", async () => {
        const { triggerSessionEnd } = useSessionEndFlow()
        const session = useSessionStore()
        const endSpy = vi.spyOn(session, "end")

        await triggerSessionEnd("completed", { source: "broadcast" })
        await triggerSessionEnd("voided", { source: "watcher" })

        expect(endSpy).toHaveBeenCalledTimes(1)
        expect(routerMock.replace).toHaveBeenCalledTimes(1)
    })

    it("finalizeAndReturnHome clears store and navigates home", () => {
        const { finalizeAndReturnHome } = useSessionEndFlow()
        const sessionEndStore = useSessionEndStore()

        // Set active state manually
        sessionEndStore.startTransition({ reason: "completed", source: "broadcast" })
        expect(sessionEndStore.active).toBe(true)

        finalizeAndReturnHome()

        expect(sessionEndStore.active).toBe(false)
        expect(routerMock.replace).toHaveBeenCalledWith("/")
    })

    it("hard-navigates with query when no router is available", async () => {
        const assign = vi.fn()
        routerMock.shouldThrow = true
        vi.stubGlobal("window", {
            location: { assign },
        })

        const { triggerSessionEnd } = useSessionEndFlow()

        await triggerSessionEnd("completed", { source: "polling", orderNumber: "ORD-042" })

        expect(assign).toHaveBeenCalledWith("/order/session-ended?reason=completed&order=ORD-042")
    })
})
