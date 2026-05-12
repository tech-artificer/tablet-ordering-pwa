import { describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

import { useOrderStore } from "../stores/Order"
import { useSessionStore } from "../stores/Session"

describe("session end behavior", () => {
    beforeEach(() => {
        const pinia = createPinia()
        setActivePinia(pinia)
        try { globalThis.localStorage.clear() } catch (e) {}
    })

    it("end() clears order store and removes session_active flag", async () => {
        const order = useOrderStore()
        const session = useSessionStore()

        // Simulate active session + order state using new API
        session.setIsActive(true)
        session.setOrderId(123)
        try { localStorage.setItem("session_active", "1") } catch (e) {}

        ;(order as any).draft = [{ id: 1, name: "Taco", price: 10, quantity: 1 }]
        ;(order as any).rounds = [{ kind: "initial", number: 1, submittedAt: new Date().toISOString(), items: [], serverOrderId: 123, serverTotal: 0 }]
        ;(order as any).serverOrderId = 123

        // Act: end session
        await session.end()

        // Assert: session cleared
        expect(session.getIsActive()).toBe(false)
        expect(session.getOrderId()).toBeNull()
        // localStorage flag removed
        expect(localStorage.getItem("session_active")).toBeNull()

        // Assert: order cleared
        expect((order as any).draft).toHaveLength(0)
        expect(order.serverOrderId).toBeNull()
        expect(order.hasPlacedOrder).toBe(false)
    })
})
