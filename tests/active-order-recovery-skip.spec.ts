import { describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { shouldAttemptActiveOrderRecovery } from "../composables/useActiveOrderRecovery"
import { useOrderStore } from "../stores/Order"
import { useSessionStore } from "../stores/Session"

describe("shouldAttemptActiveOrderRecovery", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it("returns false on cold-start state (no signals at all)", () => {
        // Default Pinia state — nothing placed, no refill, no session orderId.
        expect(shouldAttemptActiveOrderRecovery()).toBe(false)
    })

    it("returns true when sessionStore has an orderId", () => {
        const session = useSessionStore()
        session.setOrderId(42)

        expect(shouldAttemptActiveOrderRecovery()).toBe(true)
    })

    it("returns true when orderStore has placed rounds (hasPlacedOrder)", () => {
        const order = useOrderStore()
        ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 1, serverTotal: 0 }]

        expect(shouldAttemptActiveOrderRecovery()).toBe(true)
    })

    it("returns true when mode is refill", () => {
        const order = useOrderStore()
        ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 1, serverTotal: 0 }]
        ;(order as any).mode = "refill"

        expect(shouldAttemptActiveOrderRecovery()).toBe(true)
    })

    it("returns true when serverOrderId is set (nested order_id)", () => {
        const order = useOrderStore()
        ;(order as any).serverOrderId = 99

        expect(shouldAttemptActiveOrderRecovery()).toBe(true)
    })

    it("returns true when serverOrderId is set (flat id)", () => {
        const order = useOrderStore()
        ;(order as any).serverOrderId = 77

        expect(shouldAttemptActiveOrderRecovery()).toBe(true)
    })
})
