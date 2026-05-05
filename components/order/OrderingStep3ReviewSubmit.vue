<script setup lang="ts">
import { computed, ref, unref, watch } from "vue"
import { useOrderStore } from "~/stores/Order"
import { logger } from "~/utils/logger"

const emit = defineEmits<{
  "order-submitted": [];
}>()

const orderStore = useOrderStore()
const submitError = ref<string | null>(null)

type ReviewItem = {
    id: number
    name: string
    quantity: number
    category: string | null
}

const activeCart = computed<any[]>(() => (unref(orderStore.activeCart) as any[]) || [])

const currentOrderSnapshot = computed<any>(() => {
    return (unref(orderStore.currentOrder) as any)?.order || unref(orderStore.currentOrder) || null
})

const fallbackServerItems = computed<ReviewItem[]>(() => {
    const rawItems = currentOrderSnapshot.value?.items
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        return []
    }

    const normalized: ReviewItem[] = []

    rawItems.forEach((item: any, index: number) => {
        const packageModifiers = Array.isArray(item?.modifiers) ? item.modifiers : []
        const isPackage = Boolean(item?.is_package)

        if (isPackage && packageModifiers.length > 0) {
            packageModifiers.forEach((modifier: any, modifierIndex: number) => {
                normalized.push({
                    id: Number(modifier?.menu_id || modifier?.id || `${index}${modifierIndex}`),
                    name: String(modifier?.name || modifier?.receipt_name || `Inclusion ${modifierIndex + 1}`),
                    quantity: Number(modifier?.quantity || 1),
                    category: String(modifier?.category || "meats"),
                })
            })
            return
        }

        normalized.push({
            id: Number(item?.menu_id || item?.id || index + 1),
            name: String(item?.name || item?.receipt_name || `Item ${index + 1}`),
            quantity: Number(item?.quantity || 1),
            category: String(item?.category || (isPackage ? "meats" : "side")),
        })
    })

    return normalized
})

// When the order is already placed (Continue to Session), activeCart is empty
// because setOrderCreated() clears cartItems. Use submittedItems for display
// so the breakdown reflects what was actually ordered.
const displayItems = computed<any[]>(() => {
    if (orderStore.hasPlacedOrder && !orderStore.isRefillMode) {
        const submitted = (unref(orderStore.submittedItems) as any[]) || []
        if (submitted.length > 0) {
            return submitted
        }

        return fallbackServerItems.value
    }

    return activeCart.value
})

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

const guestCountDisplay = computed(() => {
    if (Number(orderStore.guestCount) >= 2) {
        return Number(orderStore.guestCount)
    }
    return Number(currentOrderSnapshot.value?.guest_count || 0)
})

const packageNameDisplay = computed(() => {
    const selectedPackageName = (orderStore.package as any)?.name
    if (selectedPackageName) {
        return String(selectedPackageName)
    }

    const packageFromOrder = String(currentOrderSnapshot.value?.package_name || "")
    if (packageFromOrder) {
        return packageFromOrder
    }

    const packageLineItem = (Array.isArray(currentOrderSnapshot.value?.items)
        ? currentOrderSnapshot.value.items.find((item: any) => item?.is_package)
        : null) as any

    return String(packageLineItem?.name || "")
})

const orderStatusDisplay = computed(() => {
    const status = String(currentOrderSnapshot.value?.status || "")
    if (!status) {
        return "Pending"
    }
    return status.replace(/_/g, " ")
})

const itemCountDisplay = computed(() =>
    displayItems.value.reduce((sum: number, item: any) => sum + Number(item?.quantity ?? 0), 0)
)

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
    <div class="rounded-3xl border border-white/10 bg-black/35 backdrop-blur-sm p-5 md:p-6 space-y-5">
        <div class="flex items-end justify-between gap-4">
            <div class="space-y-1">
                <h2 class="text-xl font-extrabold text-white tracking-tight">
                    Review &amp; Send to Kitchen
                </h2>
                <p class="text-sm text-white/60">
                    Confirm your selections before final submission.
                </p>
            </div>
            <span class="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.14em] font-bold text-primary">
                Step 04
            </span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="lg:col-span-2 space-y-4">
                <div v-if="orderedMeats.length > 0" class="space-y-2">
                    <p class="text-xs font-semibold uppercase tracking-widest text-white/40">
                        🔥 Meats
                    </p>
                    <div class="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5 overflow-hidden">
                        <div
                            v-for="item in orderedMeats"
                            :key="`meat-${item.id}`"
                            class="flex items-center justify-between px-4 py-3 text-sm"
                        >
                            <span class="text-white/85 truncate">{{ item.name }}</span>
                            <span class="text-white font-semibold ml-4 flex-shrink-0">×{{ item.quantity }}</span>
                        </div>
                    </div>
                </div>

                <div v-if="orderedAddOns.length > 0" class="space-y-2">
                    <p class="text-xs font-semibold uppercase tracking-widest text-white/40">
                        🍽️ Add-ons
                    </p>
                    <div class="rounded-2xl border border-white/10 bg-white/5 divide-y divide-white/5 overflow-hidden">
                        <div
                            v-for="item in orderedAddOns"
                            :key="`addon-${item.id}`"
                            class="flex items-center justify-between px-4 py-3 text-sm"
                        >
                            <span class="flex items-center gap-2 text-white/85 truncate">
                                <span>{{ itemEmoji(item) }}</span>
                                {{ item.name }}
                            </span>
                            <span class="text-white font-semibold ml-4 flex-shrink-0">×{{ item.quantity }}</span>
                        </div>
                    </div>
                </div>

                <div
                    v-if="displayItems.length === 0"
                    class="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center"
                >
                    <p class="text-white/75 font-semibold mb-1">
                        No item details available yet
                    </p>
                    <p class="text-xs text-white/50">
                        Your order is still safe. If this is your first order, go back and add items.
                    </p>
                </div>

                <p v-if="!orderStore.hasPlacedOrder && !orderStore.isRefillMode && activeCart.length === 0" class="text-xs text-white/40 text-center py-1">
                    No items in cart yet. Go back to add items.
                </p>
            </div>

            <div class="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 h-fit">
                <div class="flex items-center justify-between text-sm">
                    <span class="text-white/60">Guests</span>
                    <span class="text-white font-semibold">{{ guestCountDisplay }}</span>
                </div>

                <div v-if="packageNameDisplay" class="flex items-center justify-between text-sm gap-3">
                    <span class="text-white/60">Package</span>
                    <span class="text-white font-semibold text-right truncate max-w-[170px]">{{ packageNameDisplay }}</span>
                </div>

                <div class="flex items-center justify-between text-sm">
                    <span class="text-white/60">{{ orderStore.isRefillMode ? 'Refill items' : 'Items selected' }}</span>
                    <span class="text-white font-semibold">{{ itemCountDisplay }}</span>
                </div>

                <div class="flex items-center justify-between text-sm">
                    <span class="text-white/60">Status</span>
                    <span class="text-success font-semibold capitalize">{{ orderStatusDisplay }}</span>
                </div>

                <div class="pt-1">
                    <p v-if="submitError" class="text-sm text-red-400 mb-3">
                        {{ submitError }}
                    </p>

                    <p v-else-if="!canSubmit && submitBlockers.length > 0" class="text-sm text-yellow-300 mb-3">
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
            </div>
        </div>
    </div>
</template>
