import { defineStore } from "pinia"
import { reactive, computed, toRefs } from "vue"
import type { AppliedDiscount } from "~/types"

export const useDiscountStore = defineStore("discount", () => {
    const state = reactive({
        discountTotal: 0 as number,
        lastSyncAt: null as string | null,
    })

    function apply (discountTotal: number, at?: string): void {
        state.discountTotal = discountTotal
        state.lastSyncAt = at ?? new Date().toISOString()
    }

    function hydrate (discounts: AppliedDiscount[]): void {
        state.discountTotal = discounts.reduce((sum, d) => sum + d.discount_total, 0)
        state.lastSyncAt = discounts[0]?.applied_at ?? null
    }

    function reset (): void {
        state.discountTotal = 0
        state.lastSyncAt = null
    }

    const hasDiscount = computed(() => state.discountTotal > 0)

    return { ...toRefs(state), apply, hydrate, reset, hasDiscount }
})
