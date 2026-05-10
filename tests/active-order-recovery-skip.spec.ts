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

    it("returns true when orderStore.hasPlacedOrder is true", () => {
        const order = useOrderStore()
        order.setHasPlacedOrder(true)

        expect(shouldAttemptActiveOrderRecovery()).toBe(true)
    })

    it("returns true when isRefillMode is true", () => {
        const order = useOrderStore()
        order.setIsRefillMode(true)

        expect(shouldAttemptActiveOrderRecovery()).toBe(true)
    })

    it("returns true when currentOrder carries an order_id (nested shape)", () => {
        const order = useOrderStore()
        order.setCurrentOrder({ order: { order_id: 99 } } as any)

        expect(shouldAttemptActiveOrderRecovery()).toBe(true)
    })

    it("returns true when currentOrder carries an id (flat shape)", () => {
        const order = useOrderStore()
        order.setCurrentOrder({ id: 77 } as any)

        expect(shouldAttemptActiveOrderRecovery()).toBe(true)
    })
})
