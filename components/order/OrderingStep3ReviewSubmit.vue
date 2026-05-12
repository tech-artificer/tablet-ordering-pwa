<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, unref, watch } from "vue"
import { useOrderStore } from "~/stores/Order"
import { useDeviceStore } from "~/stores/Device"
import { useOrderSubmit } from "~/composables/useOrderSubmit"
import { useRefillSubmit } from "~/composables/useRefillSubmit"
import { useSubmitState } from "~/composables/useSubmitState"
import { useNetworkStatus } from "~/composables/useNetworkStatus"
import SubmitStatusBanner from "~/components/ui/SubmitStatusBanner.vue"
import { logger } from "~/utils/logger"

const emit = defineEmits<{
  "order-submitted": [];
}>()

const orderStore = useOrderStore()
const deviceStore = useDeviceStore()
const { submitOrder: submitInitialOrder } = useOrderSubmit()
const { submitRefill: submitRefillOrder } = useRefillSubmit()
const submitState = useSubmitState()
const { isOnline } = useNetworkStatus()
const submitError = ref<string | null>(null)

onMounted(() => {
    submitState.setIdle()
})

onUnmounted(() => {
    submitState.setIdle()
})

type ReviewItem = {
    id: number
    name: string
    quantity: number
    category: string | null
    price?: number
    img_url?: string | null
    description?: string | null
}

const activeCart = computed<any[]>(() => (unref(orderStore.activeCart) as any[]) || [])

const currentOrderSnapshot = computed<any>(() => null)

const hasConfirmedInitialOrder = computed(() =>
    orderStore.hasPlacedOrder && unref(orderStore.serverOrderId) !== null
)

const fallbackServerItems = computed<ReviewItem[]>(() => {
    const rawItems = currentOrderSnapshot.value?.items ?? currentOrderSnapshot.value?.order_items
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
        logger.debug("[OrderingStep3ReviewSubmit] fallbackServerItems: No items available", {
            hasItems: !!rawItems,
            isArray: Array.isArray(rawItems),
            length: rawItems?.length || 0,
        })
        return []
    }

    logger.debug("[OrderingStep3ReviewSubmit] fallbackServerItems: Processing " + rawItems.length + " items")

    const normalized: ReviewItem[] = []

    rawItems.forEach((item: any, index: number) => {
        const packageModifiers = Array.isArray(item?.modifiers) ? item.modifiers : []
        const isPackage = Boolean(item?.is_package)

        if (isPackage && packageModifiers.length > 0) {
            packageModifiers.forEach((modifier: any, modifierIndex: number) => {
                normalized.push({
                    id: Number(modifier?.menu_id ?? modifier?.id ?? -(index * 1000 + modifierIndex + 1)),
                    name: String(modifier?.name || modifier?.receipt_name || `Inclusion ${modifierIndex + 1}`),
                    quantity: Number(modifier?.quantity || 1),
                    category: String(modifier?.category || "meats"),
                    price: Number(modifier?.price || 0),
                    img_url: modifier?.img_url || null,
                    description: modifier?.description || null,
                })
            })
            return
        }

        normalized.push({
            id: Number(item?.menu_id ?? item?.id ?? -(index + 1)),
            name: String(item?.name || item?.receipt_name || `Item ${index + 1}`),
            quantity: Number(item?.quantity || 1),
            category: String(item?.category || (isPackage ? "meats" : "side")),
            price: Number(item?.price || 0),
            img_url: item?.img_url || null,
            description: item?.description || null,
        })
    })

    logger.debug("[OrderingStep3ReviewSubmit] fallbackServerItems: Normalized " + normalized.length + " items")
    return normalized
})

const displayItems = computed<any[]>(() => {
    // Always show only the items currently being submitted (activeCart)
    // Do NOT show previously submitted items when reviewing a new refill
    logger.debug("[OrderingStep3ReviewSubmit] displayItems: Using activeCart (" + activeCart.value.length + " items)")
    return activeCart.value
})

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

    const orderItems = currentOrderSnapshot.value?.items ?? currentOrderSnapshot.value?.order_items
    const packageLineItem = (Array.isArray(orderItems)
        ? orderItems.find((item: any) => item?.is_package)
        : null) as any

    return String(packageLineItem?.name || "")
})

const packageDurationMinutes = computed(() => {
    const pkg = orderStore.package as any
    const candidate = pkg?.duration_minutes ?? pkg?.dining_minutes ?? pkg?.time_limit_minutes ?? null
    return candidate ? Number(candidate) : null
})

const itemCountDisplay = computed(() =>
    displayItems.value.reduce((sum: number, item: any) => sum + Number(item?.quantity ?? 0), 0)
)

const tableLabel = computed(() => {
    const tbl = (deviceStore.table as any) || {}
    const name = tbl?.name ? String(tbl.name) : ""
    const id = tbl?.id ? "Table:" : ""
    if (name && id) { return `${id} · ${name}` }
    return name || id || "Table"
})

const subtotalDisplay = computed(() => Number((orderStore as any).addOnsTotal ?? unref((orderStore as any).addOnsTotal) ?? 0))
const packagePriceDisplay = computed(() => Number((orderStore as any).packageTotal ?? unref((orderStore as any).packageTotal) ?? 0))
const taxDisplay = computed(() => Number((orderStore as any).taxAmount ?? unref((orderStore as any).taxAmount) ?? 0))
const totalDisplay = computed(() => Number((orderStore as any).grandTotal ?? unref((orderStore as any).grandTotal) ?? 0))
const taxRateDisplay = computed(() => {
    const rate = Number((orderStore.package as any)?.tax?.percentage || 0)
    return rate > 0 ? `${rate}%` : ""
})

function formatPeso (value: number): string {
    if (!Number.isFinite(value) || value === 0) { return "₱0" }
    return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function itemPriceLabel (item: any): { text: string; isFree: boolean } {
    const price = Number(item?.price ?? 0) * Number(item?.quantity ?? 1)
    if (!Number.isFinite(price) || price <= 0) {
        return { text: "FREE", isFree: true }
    }
    return { text: formatPeso(price), isFree: false }
}

const submitBlockers = computed(() => {
    const blockers: string[] = []

    if (orderStore.isSubmitting) {
        blockers.push("Order submission already in progress")
        return blockers
    }

    if (hasConfirmedInitialOrder.value && !orderStore.isRefillMode) {
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
    (!canSubmit.value && !(hasConfirmedInitialOrder.value && !orderStore.isRefillMode)) || submitState.shouldDisableSubmit.value
)

const buttonLabel = computed(() => {
    if (hasConfirmedInitialOrder.value && !orderStore.isRefillMode) {
        return "Continue to Session"
    }
    if (orderStore.isRefillMode) {
        return "Submit Refill"
    }
    return "Confirm & Send to Kitchen"
})

async function submit (): Promise<void> {
    if (hasConfirmedInitialOrder.value && !orderStore.isRefillMode) {
        submitState.resetForNextTransaction() // Ready for refill
        emit("order-submitted")
        return
    }

    if (!canSubmit.value) {
        submitError.value = submitBlockers.value[0] || "Cannot submit order yet"
        return
    }

    if (!isOnline.value) {
        submitError.value = "Ordering is unavailable. Please call staff."
        return
    }

    submitError.value = null
    try {
        if (orderStore.isRefillMode) {
            const refillPayload = orderStore.buildRefillPayload()
            await submitRefillOrder(refillPayload as unknown as Record<string, unknown>)
            submitState.resetForNextTransaction() // Ready for next refill
        } else {
            const payload = orderStore.buildPayload()
            await submitInitialOrder(payload as unknown as Record<string, unknown>)
        }
        emit("order-submitted")
    } catch (error: any) {
        submitError.value = error?.message || "Order submission failed"
        submitState.resetForNextTransaction() // Allow retry on error
        logger.error("[OrderingStep3ReviewSubmit] Submission failed", {
            error: error?.message || error,
        })
    }
}
</script>

<template>
    <div class="space-y-5 md:space-y-6">
        <!-- Submit Status Banner -->
        <SubmitStatusBanner />

        <!-- Order Review Grid -->
        <div class="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)] gap-5 md:gap-6 min-h-0">
            <!-- LEFT: Your Order -->
            <section class="rounded-2xl border border-white/10 bg-secondary/70 backdrop-blur-sm p-5 md:p-6 flex flex-col min-h-0 overflow-hidden md:h-[calc(100dvh-220px)] md:max-h-[calc(100dvh-220px)]">
                <div class="flex items-baseline gap-2 mb-4 flex-shrink-0">
                    <h2 class="text-lg md:text-xl font-extrabold font-raleway text-white tracking-tight">
                        Your Order
                    </h2>
                    <span class="text-sm text-text-muted">({{ itemCountDisplay }} {{ itemCountDisplay === 1 ? 'item' : 'items' }})</span>
                </div>

                <div
                    v-if="displayItems.length > 0"
                    class="scrollbar-warm min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1"
                >
                    <div
                        v-for="(item, index) in displayItems"
                        :key="`item-${item?.id ?? index}`"
                        class="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3"
                    >
                        <div class="w-12 h-12 rounded-lg bg-accent-warm/60 border border-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img
                                v-if="item?.img_url"
                                :src="item.img_url"
                                :alt="item?.name || 'Item'"
                                class="w-full h-full object-cover"
                            >
                            <span v-else class="text-xl">{{ itemEmoji(item) }}</span>
                        </div>

                        <div class="min-w-0 flex-1">
                            <p class="text-sm md:text-base font-bold text-white truncate">
                                {{ item?.name }}
                            </p>
                            <p v-if="item?.description" class="text-xs text-text-muted truncate">
                                {{ item.description }}
                            </p>
                        </div>

                        <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-black/40 border border-white/10 text-xs font-bold text-white/85 flex-shrink-0">
                            ×{{ item?.quantity }}
                        </span>

                        <span
                            :class="[
                                'text-sm font-bold flex-shrink-0 ml-1',
                                itemPriceLabel(item).isFree ? 'text-success' : 'text-white'
                            ]"
                        >
                            {{ itemPriceLabel(item).text }}
                        </span>
                    </div>
                </div>

                <div v-else class="rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center">
                    <p class="text-white/75 font-semibold mb-1">
                        No item details available yet
                    </p>
                    <p class="text-xs text-text-hint">
                        {{ hasConfirmedInitialOrder
                            ? 'Your order is on the way to the kitchen.'
                            : 'Go back and add items to begin.' }}
                    </p>
                </div>
            </section>

            <!-- RIGHT: Summary rail -->
            <aside class="space-y-4">
                <!-- Package card -->
                <div class="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-accent-warm/40 to-secondary p-5">
                    <p class="text-[10px] uppercase tracking-[0.18em] font-bold text-primary mb-1.5">
                        Package
                    </p>
                    <h3 class="text-xl md:text-2xl font-extrabold font-raleway text-white tracking-tight leading-tight">
                        {{ packageNameDisplay || 'No package selected' }}
                    </h3>
                    <p class="mt-1.5 text-xs text-text-muted">
                        {{ guestCountDisplay }} {{ guestCountDisplay === 1 ? 'guest' : 'guests' }}<span v-if="packageDurationMinutes"> · {{ packageDurationMinutes }} min dining</span>
                    </p>
                </div>

                <!-- Pricing card -->
                <div class="rounded-2xl border border-white/10 bg-secondary/70 backdrop-blur-sm p-5 space-y-2.5">
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-text-muted">Subtotal</span>
                        <span class="text-white/90 font-semibold">{{ formatPeso(subtotalDisplay) }}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-text-muted">Package</span>
                        <span class="text-white/90 font-semibold">{{ formatPeso(packagePriceDisplay) }}</span>
                    </div>
                    <div class="flex items-center justify-between text-sm">
                        <span class="text-text-muted">Tax<span v-if="taxRateDisplay"> ({{ taxRateDisplay }})</span></span>
                        <span class="text-white/90 font-semibold">{{ formatPeso(taxDisplay) }}</span>
                    </div>
                    <div class="border-t border-white/10 pt-2.5 mt-1 flex items-center justify-between">
                        <span class="text-base font-bold text-white">Total</span>
                        <span class="text-2xl font-extrabold font-raleway text-primary">
                            {{ formatPeso(totalDisplay) }}
                        </span>
                    </div>
                </div>

                <!-- CTA -->
                <button
                    type="button"
                    class="w-full py-4 rounded-2xl font-extrabold font-raleway text-base tracking-tight transition disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-primary to-primary-dark text-secondary shadow-glow hover:shadow-glow active:scale-[0.99]"
                    :disabled="isButtonDisabled"
                    @click="submit"
                >
                    <span v-if="orderStore.isSubmitting">Submitting…</span>
                    <span v-else>{{ buttonLabel }} →</span>
                </button>

                <!-- Errors / blockers -->
                <p v-if="submitError" class="text-sm text-error font-semibold">
                    {{ submitError }}
                </p>
                <p v-else-if="!canSubmit && submitBlockers.length > 0" class="text-sm text-warning font-semibold">
                    {{ submitBlockers[0] }}
                </p>
            </aside>
        </div>
    </div>
</template>
