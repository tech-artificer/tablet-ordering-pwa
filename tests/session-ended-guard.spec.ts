import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

import { useSessionEndStore } from "../stores/SessionEnd"
import { useSessionStore } from "../stores/Session"
import { useOrderStore } from "../stores/Order"
import { recoverActiveOrderState } from "../composables/useActiveOrderRecovery"

// Mock useApi
vi.mock("../composables/useApi", () => ({ useApi: () => ({ get: vi.fn(), post: vi.fn() }) }))

describe("session-ended route — middleware guard", () => {
    it("/order/session-ended is in publicRoutes (no auth required)", () => {
        // Verify boot.global.ts includes /order/session-ended in PUBLIC_ROUTES
        const middlewarePath = resolve(__dirname, "../middleware/boot.global.ts")
        const src = readFileSync(middlewarePath, "utf8")
        expect(src).toContain("/order/session-ended")
        expect(src).toContain("PUBLIC_ROUTES")
    })
})

describe("useActiveOrderRecovery — skips cleanup when transition active", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it("returns early without calling sessionStore.end() when SessionEnd store is active", async () => {
        const sessionEndStore = useSessionEndStore()
        const sessionStore = useSessionStore()
        const orderStore = useOrderStore()

        // Simulate an active transition already in progress
        sessionEndStore.startTransition({ reason: "completed", source: "broadcast" })

        // Set up a terminal order in order store
        orderStore.setCurrentOrder({ order: { order_id: 99, status: "completed", order_number: "ORD-X" } } as any)

        const endSpy = vi.spyOn(sessionStore, "end")

        // Provide initializeFromSession as a no-op so recovery reads from current store state
        vi.spyOn(orderStore, "initializeFromSession").mockResolvedValue(undefined)

        const result = await recoverActiveOrderState("test")

        // Recovery should not have called end() — transition is already active
        expect(endSpy).not.toHaveBeenCalled()
        expect(result.isTerminal).toBe(true)
        expect(result.hasActiveOrder).toBe(false)
    })

    it("calls sessionStore.end() normally when no transition is active", async () => {
        const sessionStore = useSessionStore()
        const orderStore = useOrderStore()

        orderStore.setCurrentOrder({ order: { order_id: 99, status: "voided", order_number: "ORD-Y" } } as any)
        vi.spyOn(orderStore, "initializeFromSession").mockResolvedValue(undefined)

        const endSpy = vi.spyOn(sessionStore, "end")

        await recoverActiveOrderState("test")

        expect(endSpy).toHaveBeenCalledTimes(1)
    })
})
