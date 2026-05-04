<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useOrderStore } from "~/stores/Order"
import { logger } from "~/utils/logger"

const emit = defineEmits<{
  "order-submitted": [];
}>()

const orderStore = useOrderStore()
const submitError = ref<string | null>(null)

const activeCart = computed(() => orderStore.activeCart || [])

// When the order is already placed (Continue to Session), activeCart is empty
// because setOrderCreated() clears cartItems. Use submittedItems for display
// so the breakdown reflects what was actually ordered.
const displayItems = computed<any[]>(() =>
    orderStore.hasPlacedOrder && !orderStore.isRefillMode
        ? (orderStore.submittedItems as any[])
        : activeCart.value
)

const orderedMeats = computed(() =>
    displayItems.value.filter((item: any) => {
        const cat = String(item?.category || "").toLowerCase()
        return cat === "meats" || cat === "meat" || cat.includes("meat")
    })
)
const orderedAddOns = computed(() =>
    displayItems.value.filter((item: any) => {
        const cat = String(item?.category || "").toLowerCase()
        return !(cat === "meats" || cat === "meat" || cat.includes("meat"))
    })
)

function itemEmoji (item: any): string {
    const cat = String(item?.category ?? "").toLowerCase()
    if (cat.includes("meat")) { return "🔥" }
    if (cat.includes("side")) { return "🌿" }
    if (cat.includes("drink") || cat.includes("bev") || cat.includes("soju") || cat.includes("beer") || cat.includes("wine") || cat.includes("juice") || cat.includes("tea") || cat.includes("coffee")) { return "🥤" }
    if (cat.includes("dessert")) { return "🍮" }
    return "🍽️"
}

const hasPackage = computed(() => Boolean((orderStore.package as any)?.id))
const hasMeatSelection = computed(() => activeCart.value.some((item: any) => {
    const category = String(item?.category || "").toLowerCase()
    return (category === "meats" || category === "meat" || category.includes("meat")) && Number(item?.quantity) > 0
}))
const hasGuestCount = computed(() => Number(orderStore.guestCount) >= 2)
const hasItems = computed(() => activeCart.value.some((item: any) => Number(item?.quantity) > 0))

const submitBlockers = computed(() => {
    const blockers: string[] = []

    if (orderStore.isSubmitting) {
        blockers.push("Order submission already in progress")
        return blockers
    }

    if (orderStore.hasPlacedOrder && !orderStore.isRefillMode) {
        return blockers
    }

    if (orderStore.isRefillMode) {
        if (!hasItems.value) {
            blockers.push("Add at least one refill item")
        }
        return blockers
    }

    if (!hasGuestCount.value) {
        blockers.push("Guest count must be at least 2")
    }

    if (!hasPackage.value) {
        blockers.push("Select a package")
    }

    if (!hasMeatSelection.value) {
        blockers.push("Select at least one meat")
    }

    return blockers
})

watch(submitBlockers, () => {
    if (!submitError.value) { return }
    submitError.value = null
})

const canSubmit = computed(() => submitBlockers.value.length === 0)
const isButtonDisabled = computed(() =>
    !canSubmit.value && !(orderStore.hasPlacedOrder && !orderStore.isRefillMode)
)

const buttonLabel = computed(() => {
    if (orderStore.hasPlacedOrder && !orderStore.isRefillMode) {
        return "Continue to Session"
    }
    if (orderStore.isRefillMode) {
        return "Submit Refill"
    }
    return "Place Order"
})

async function submit (): Promise<void> {
    if (orderStore.hasPlacedOrder && !orderStore.isRefillMode) {
        emit("order-submitted")
        return
    }

    if (!canSubmit.value) {
        submitError.value = submitBlockers.value[0] || "Cannot submit order yet"
        return
    }

    submitError.value = null
    try {
        if (orderStore.isRefillMode) {
            await orderStore.submitRefill()
        } else {
            const payload = orderStore.buildPayload()
            await orderStore.submitOrder(payload)
        }
        emit("order-submitted")
    } catch (error: any) {
        submitError.value = error?.message || "Order submission failed"
        logger.error("[OrderingStep3ReviewSubmit] Submission failed", {
            error: error?.message || error,
        })
    }
}
</script>

<template>
    <div class="rounded-2xl border border-white/10 bg-black/40 p-6 space-y-5">
        <div class="space-y-1">
            <h2 class="text-lg font-bold text-white">
                Final Confirmation
            </h2>
            <p class="text-sm text-white/60">
                Review your order and submit when ready.
            </p>
        </div>

        <!-- Order summary meta -->
        <div class="rounded-xl bg-white/5 border border-white/10 p-4 space-y-2 text-sm">
            <div class="flex items-center justify-between">
                <span class="text-white/60">Guests</span>
                <span class="text-white font-semibold">{{ orderStore.guestCount }}</span>
            </div>
            <div v-if="orderStore.package" class="flex items-center justify-between">
                <span class="text-white/60">Package</span>
                <span class="text-white font-semibold truncate max-w-[180px] text-right">{{ (orderStore.package as any).name }}</span>
            </div>
            <div class="flex items-center justify-between">
                <span class="text-white/60">{{ orderStore.isRefillMode ? 'Refill items' : 'Items selected' }}</span>
                <span class="text-white font-semibold">{{ displayItems.reduce((s: number, i: any) => s + Number(i?.quantity ?? 0), 0) }}</span>
            </div>
        </div>

        <!-- Meats breakdown -->
        <div v-if="orderedMeats.length > 0" class="space-y-1.5">
            <p class="text-xs font-semibold uppercase tracking-widest text-white/40">
                🔥 Meats
            </p>
            <div class="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5 overflow-hidden">
                <div
                    v-for="item in orderedMeats"
                    :key="item.id"
                    class="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                    <span class="text-white/85 truncate">{{ item.name }}</span>
                    <span class="text-white font-semibold ml-4 flex-shrink-0">×{{ item.quantity }}</span>
                </div>
            </div>
        </div>

        <!-- Add-ons breakdown -->
        <div v-if="orderedAddOns.length > 0" class="space-y-1.5">
            <p class="text-xs font-semibold uppercase tracking-widest text-white/40">
                🍽️ Add-ons
            </p>
            <div class="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5 overflow-hidden">
                <div
                    v-for="item in orderedAddOns"
                    :key="item.id"
                    class="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                    <span class="flex items-center gap-2 text-white/85 truncate">
                        <span>{{ itemEmoji(item) }}</span>
                        {{ item.name }}
                    </span>
                    <span class="text-white font-semibold ml-4 flex-shrink-0">×{{ item.quantity }}</span>
                </div>
            </div>
        </div>

        <!-- Empty cart message: only when building first order (not after placing, not in refill) -->
        <p v-if="!orderStore.hasPlacedOrder && !orderStore.isRefillMode && activeCart.length === 0" class="text-xs text-white/40 text-center py-2">
            No items in cart yet. Go back to add items.
        </p>

        <p v-if="submitError" class="text-sm text-red-400">
            {{ submitError }}
        </p>

        <p v-else-if="!canSubmit && submitBlockers.length > 0" class="text-sm text-yellow-300">
            {{ submitBlockers[0] }}
        </p>

        <button
            type="button"
            class="w-full py-3 rounded-xl font-bold transition disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-primary to-primary-dark text-secondary"
            :disabled="isButtonDisabled"
            @click="submit"
        >
            {{ orderStore.isSubmitting ? 'Submitting…' : buttonLabel }}
        </button>
    </div>
</template>
