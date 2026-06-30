/**
 * Tests for POS-originated order hydration:
 *   - orderStore.hydrateFromSnapshot()
 *   - orderStore.appendPosRound()
 *   - sessionStore.hydrateFromSnapshot()
 */
import { beforeEach, describe, expect, it, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useOrderStore } from "../stores/Order"
import { useSessionStore } from "../stores/Session"
import type { ActiveOrderSnapshot } from "../types"
import type { OrderRound } from "../stores/Order"

vi.mock("../utils/logger", () => ({
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("../composables/useApi", () => ({
    useApi: () => ({ get: vi.fn(), post: vi.fn() }),
}))

function makeSnapshot (overrides: Partial<ActiveOrderSnapshot> = {}): ActiveOrderSnapshot {
    return {
        order_id: 42,
        order_number: "ORD-042",
        table_id: 5,
        session_id: 3,
        guest_count: 4,
        status: "in_progress",
        rounds: [
            {
                kind: "initial",
                number: 1,
                submittedAt: "2026-06-30T10:00:00.000Z",
                items: [{ id: 1, name: "Beef", quantity: 2, price: 0, isUnlimited: true, category: "meats", img_url: "" }],
                serverOrderId: 42,
                serverRefillId: null,
                serverTotal: 1200,
                pos_originated: true,
            } as OrderRound,
        ],
        discounts: [],
        subtotal: 1200,
        discount_total: 0,
        total: 1200,
        started_at: "2026-06-30T10:00:00.000Z",
        ...overrides,
    }
}

describe("orderStore.hydrateFromSnapshot()", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it("sets mode to refill so guests can only add refills", () => {
        const order = useOrderStore()
        order.hydrateFromSnapshot(makeSnapshot())
        expect((order as any).mode).toBe("refill")
    })

    it("stores order id, status, and totals from snapshot", () => {
        const order = useOrderStore()
        order.hydrateFromSnapshot(makeSnapshot({ order_id: 99, status: "confirmed", total: 800, subtotal: 800, discount_total: 0 }))
        expect(order.serverOrderId).toBe(99)
        expect(String(order.serverStatus)).toBe("confirmed")
        expect((order as any).serverTotal).toBe(800)
    })

    it("forces pos_originated = true on all hydrated rounds", () => {
        const order = useOrderStore()
        const snap = makeSnapshot()
        snap.rounds[0].pos_originated = false // should be coerced
        order.hydrateFromSnapshot(snap)
        expect((order as any).rounds[0].pos_originated).toBe(true)
    })

    it("clears draft so guests start refill from scratch", () => {
        const order = useOrderStore()
        ;(order as any).draft = [{ id: 1, name: "Ghost", quantity: 1, price: 0, category: "misc", img_url: "" }]
        order.hydrateFromSnapshot(makeSnapshot())
        expect((order as any).draft).toHaveLength(0)
    })

    it("stores guest_count from snapshot", () => {
        const order = useOrderStore()
        order.hydrateFromSnapshot(makeSnapshot({ guest_count: 6 }))
        expect(Number((order as any).guestCount)).toBe(6)
    })
})

describe("orderStore.appendPosRound()", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it("appends a round and forces pos_originated = true", () => {
        const order = useOrderStore()
        order.hydrateFromSnapshot(makeSnapshot())
        const refillRound: OrderRound = {
            kind: "refill",
            number: 2,
            submittedAt: "2026-06-30T11:00:00.000Z",
            items: [],
            serverOrderId: 42,
            serverRefillId: 7,
            serverTotal: 0,
            pos_originated: false,
        }
        order.appendPosRound(refillRound)
        const rounds = (order as any).rounds as OrderRound[]
        expect(rounds).toHaveLength(2)
        expect(rounds[1].pos_originated).toBe(true)
        expect(rounds[1].kind).toBe("refill")
    })

    it("preserves immutability — returns a new array reference", () => {
        const order = useOrderStore()
        order.hydrateFromSnapshot(makeSnapshot())
        const before = (order as any).rounds
        order.appendPosRound({ ...makeSnapshot().rounds[0], kind: "refill", number: 2 })
        expect((order as any).rounds).not.toBe(before)
    })
})

describe("sessionStore.hydrateFromSnapshot()", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it("marks session as active with the correct order and session IDs", () => {
        const session = useSessionStore()
        session.hydrateFromSnapshot(makeSnapshot())
        expect(session.getIsActive()).toBe(true)
        expect(session.getOrderId()).toBe(42)
        expect(session.getSessionId()).toBe(3)
    })

    it("does not mark terminalHandled on hydration", () => {
        const session = useSessionStore()
        session.hydrateFromSnapshot(makeSnapshot())
        expect(session.isTerminalHandled()).toBe(false)
    })

    it("sets sessionStartedAt from snapshot started_at", () => {
        const session = useSessionStore()
        session.hydrateFromSnapshot(makeSnapshot({ started_at: "2026-06-30T08:00:00.000Z" }))
        const expected = new Date("2026-06-30T08:00:00.000Z").getTime()
        expect((session as any).sessionStartedAt).toBe(expected)
    })
})
