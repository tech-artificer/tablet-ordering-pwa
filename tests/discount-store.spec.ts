import { beforeEach, describe, expect, it, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useDiscountStore } from "../stores/Discount"
import type { AppliedDiscount } from "../types"

vi.mock("../utils/logger", () => ({
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe("Discount store", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it("initializes with zero discount and no sync timestamp", () => {
        const store = useDiscountStore()
        expect(store.discountTotal).toBe(0)
        expect(store.lastSyncAt).toBeNull()
        expect(store.hasDiscount).toBe(false)
    })

    describe("apply()", () => {
        it("sets discountTotal and marks a sync timestamp", () => {
            const store = useDiscountStore()
            store.apply(600)
            expect(store.discountTotal).toBe(600)
            expect(store.lastSyncAt).not.toBeNull()
        })

        it("accepts an explicit timestamp", () => {
            const store = useDiscountStore()
            const at = "2026-06-30T10:00:00.000Z"
            store.apply(300, at)
            expect(store.lastSyncAt).toBe(at)
        })

        it("makes hasDiscount reactive to a positive value", () => {
            const store = useDiscountStore()
            expect(store.hasDiscount).toBe(false)
            store.apply(1)
            expect(store.hasDiscount).toBe(true)
        })
    })

    describe("hydrate()", () => {
        it("sums all applied discount totals", () => {
            const store = useDiscountStore()
            const discounts: AppliedDiscount[] = [
                { discount_total: 200, applied_at: "2026-06-30T09:00:00.000Z" },
                { discount_total: 100, applied_at: "2026-06-30T09:05:00.000Z" },
            ]
            store.hydrate(discounts)
            expect(store.discountTotal).toBe(300)
        })

        it("sets lastSyncAt from the first discount entry", () => {
            const store = useDiscountStore()
            const discounts: AppliedDiscount[] = [
                { discount_total: 500, applied_at: "2026-06-30T08:00:00.000Z" },
            ]
            store.hydrate(discounts)
            expect(store.lastSyncAt).toBe("2026-06-30T08:00:00.000Z")
        })

        it("resets to zero when given an empty array", () => {
            const store = useDiscountStore()
            store.apply(999)
            store.hydrate([])
            expect(store.discountTotal).toBe(0)
            expect(store.lastSyncAt).toBeNull()
        })
    })

    describe("reset()", () => {
        it("clears discountTotal, lastSyncAt, and hasDiscount", () => {
            const store = useDiscountStore()
            store.apply(500, "2026-06-30T10:00:00.000Z")
            store.reset()
            expect(store.discountTotal).toBe(0)
            expect(store.lastSyncAt).toBeNull()
            expect(store.hasDiscount).toBe(false)
        })
    })
})
