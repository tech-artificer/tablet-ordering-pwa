import { vi, describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

import { useSessionEndStore } from "../stores/SessionEnd"
import { useSessionStore } from "../stores/Session"
import { useSessionEndFlow } from "../composables/useSessionEndFlow"

// Mock vue-router
const mockReplace = vi.fn()
vi.mock("vue-router", () => ({ useRouter: () => ({ replace: mockReplace }) }))

// Mock useApi
vi.mock("../composables/useApi", () => ({ useApi: () => ({ get: vi.fn(), post: vi.fn() }) }))

describe("terminal status — single redirect regardless of source", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockReplace.mockReset().mockResolvedValue(undefined)
    })

    it("concurrent triggers from all 4 sources only navigate once", async () => {
        const { triggerSessionEnd } = useSessionEndFlow()

        // Simulate all 4 sources firing concurrently (broadcast x2, watcher, polling)
        await Promise.all([
            triggerSessionEnd("completed", { source: "broadcast" }),
            triggerSessionEnd("completed", { source: "broadcast" }),
            triggerSessionEnd("completed", { source: "watcher" }),
            triggerSessionEnd("completed", { source: "polling" }),
        ])

        expect(mockReplace).toHaveBeenCalledTimes(1)
        expect(mockReplace).toHaveBeenCalledWith({
            path: "/order/session-ended",
            query: { reason: "completed" },
        })
    })

    it("SessionEnd store active flag prevents re-entry", async () => {
        const sessionEndStore = useSessionEndStore()
        const { triggerSessionEnd } = useSessionEndFlow()

        await triggerSessionEnd("voided", { source: "watcher" })
        expect(sessionEndStore.active).toBe(true)

        // Additional trigger from a different source
        await triggerSessionEnd("completed", { source: "polling" })

        // State must not have changed (first caller wins)
        expect(sessionEndStore.reason).toBe("voided")
        expect(sessionEndStore.source).toBe("watcher")
        expect(mockReplace).toHaveBeenCalledTimes(1)
    })

    it("sessionStore.end() is called exactly once across concurrent triggers", async () => {
        const sessionStore = useSessionStore()
        const endSpy = vi.spyOn(sessionStore, "end")
        const { triggerSessionEnd } = useSessionEndFlow()

        await Promise.all([
            triggerSessionEnd("completed", { source: "broadcast" }),
            triggerSessionEnd("completed", { source: "watcher" }),
            triggerSessionEnd("completed", { source: "polling" }),
        ])

        expect(endSpy).toHaveBeenCalledTimes(1)
    })

    it("voided status routes to session-ended with reason=voided", async () => {
        const { triggerSessionEnd } = useSessionEndFlow()

        await triggerSessionEnd("voided", { source: "broadcast", orderNumber: "ORD-500" })

        expect(mockReplace).toHaveBeenCalledWith({
            path: "/order/session-ended",
            query: { reason: "voided", order: "ORD-500" },
        })
    })

    it("cancelled status routes to session-ended with reason=cancelled", async () => {
        const { triggerSessionEnd } = useSessionEndFlow()

        await triggerSessionEnd("cancelled", { source: "broadcast" })

        expect(mockReplace).toHaveBeenCalledWith({
            path: "/order/session-ended",
            query: { reason: "cancelled" },
        })
    })
})
