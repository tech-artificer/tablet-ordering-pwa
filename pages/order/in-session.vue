<script setup lang="ts">
import { computed, onMounted, ref, unref, watch } from "vue"
import { ClipboardList, Receipt, RefreshCw, ShoppingBag, UtensilsCrossed } from "lucide-vue-next"
import { ElDialog, ElButton, ElMessage } from "element-plus"
import { useSessionStore } from "~/stores/Session"
import { useOrderStore } from "~/stores/Order"
import { useDeviceStore } from "~/stores/Device"
import { useApi } from "~/composables/useApi"
import { useNetworkStatus } from "~/composables/useNetworkStatus"
import { useSessionEndFlow } from "~/composables/useSessionEndFlow"
import { logger } from "~/utils/logger"

// ── Stores ───────────────────────────────────────────────────────────────────
const sessionStore = useSessionStore()
const orderStore = useOrderStore()
const deviceStore = useDeviceStore()
const { isOnline } = useNetworkStatus()

// ── Derived state ─────────────────────────────────────────────────────────────
const orderStatus = computed<string>(() => String(unref(orderStore.serverStatus) || "pending"))
const orderNumber = computed<string | null>(() => null)
const orderId = computed<number | null>(() => unref(orderStore.serverOrderId) ?? sessionStore.getOrderId() ?? null)

// ── Submitted items (restored from c2b3774 — append-only ledger from rounds[]) ─
type DisplayedItem = {
    id: number
    name: string
    quantity: number
    price: number
    isUnlimited: boolean
    sourceRound: "initial" | "refill"
    sourceRoundLabel: string
}

const displaySubmittedItems = computed<DisplayedItem[]>(() => {
    const rounds = (unref(orderStore.rounds) ?? []) as any[]
    if (!Array.isArray(rounds) || rounds.length === 0) { return [] }
    const out: DisplayedItem[] = []
    for (const round of rounds) {
        const isRefill = round?.kind === "refill"
        const label = isRefill
            ? `Refill #${Math.max(1, Number(round?.number ?? 1) - 1)}`
            : "Initial Order"
        const items = Array.isArray(round?.items) ? round.items : []
        for (const item of items) {
            out.push({
                id: Number(item?.id ?? item?.menu_id ?? 0),
                name: String(item?.name ?? "Item"),
                quantity: Number(item?.quantity ?? 0),
                price: Number(item?.price ?? 0),
                isUnlimited: Boolean(item?.isUnlimited),
                sourceRound: isRefill ? "refill" : "initial",
                sourceRoundLabel: label,
            })
        }
    }
    return out
})

const tableName = computed<string>(() => deviceStore.getTableName() ?? "—")
const tableShort = computed<string>(() => {
    const name = tableName.value
    const match = name.match(/(\d+)/)
    return match ? `T${match[1]}` : name.slice(0, 2).toUpperCase()
})

const packageName = computed(() => (orderStore.package as any)?.name ?? "Package")
const packageHeading = computed(() => {
    const name = packageName.value
    return name && name !== "Package" ? `${name} Selection`.toUpperCase() : "Korean BBQ Selection"
})

// ── Totals (gold figures in the Order Summary sidebar) ────────────────────────
const packageTotal = computed<number>(() => Number(unref(orderStore.packageTotal) ?? 0))
const addOnsTotal = computed<number>(() => Number(unref(orderStore.addOnsTotal) ?? 0))
const taxAmount = computed<number>(() => Number(unref(orderStore.taxAmount) ?? 0))
const grandTotalDisplay = computed<number>(() => {
    const serverTotal = Number(unref(orderStore.serverTotal) ?? 0)
    if (Number.isFinite(serverTotal) && serverTotal > 0) { return serverTotal }
    return Number(unref(orderStore.grandTotal) ?? 0)
})

const taxRatePercent = computed<number>(() => {
    const rate = Number((orderStore.package as any)?.tax?.percentage || 0)
    return Number.isFinite(rate) && rate > 0 ? rate : 12
})

function formatPeso (value: number): string {
    if (!Number.isFinite(value)) { return "₱0" }
    return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: value % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`
}

function formatPesoExact (value: number): string {
    if (!Number.isFinite(value)) { return "₱0.00" }
    return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ── Timer ─────────────────────────────────────────────────────────────────────
const remainingMinutes = computed<number>(() => {
    const ms = Number(unref(sessionStore.remainingMs) ?? 0)
    return Math.max(0, Math.round(ms / 60000))
})

const timerPillLabel = computed<string>(() => {
    const mins = remainingMinutes.value
    if (mins <= 0) { return "Active" }
    return `Active · ~${mins} min remaining`
})

// ── Session-end ──────────────────────────────────────────────────────────────
const { triggerSessionEnd } = useSessionEndFlow()

watch(
    () => sessionStore.timerExpired,
    (expired) => {
        if (expired) {
            logger.info("[in-session] Session timer expired — ending session")
            triggerSessionEnd("unknown", { source: "timer" })
        }
    },
    { immediate: true }
)

watch(orderStatus, (status) => {
    if (["completed", "voided", "cancelled"].includes(status)) {
        logger.info("[in-session] Terminal order status — ending session", { status })
        triggerSessionEnd(status as "completed" | "voided" | "cancelled", {
            source: "in-session",
            orderNumber: orderNumber.value ?? undefined,
        })
    }
}, { immediate: true })

// Sessions only end when the order is paid/voided/cancelled (orderStatus watcher).

// ── Navigation guards + lifecycle ─────────────────────────────────────────────
onMounted(() => {
    if (!sessionStore.isActive) {
        logger.warn("[in-session] No active session — redirecting to home")
        navigateTo("/")
        return
    }
    if (!orderStore.hasPlacedOrder) {
        logger.warn("[in-session] No placed order — redirecting to menu")
        navigateTo("/menu")
    }
    // sessionStore.remainingMs is reactive and updated by the store's own
    // timer — no page-level interval needed for the timer pill to stay fresh.
})

// ── Refill navigation ─────────────────────────────────────────────────────────
const goToRefill = () => {
    try {
        orderStore.toggleRefillMode(true)
    } catch (e) {
        logger.warn("[in-session] toggleRefillMode failed", e)
    }
    navigateTo("/menu")
}

const endSession = () => {
    // Customer-initiated exit — we have no signal the order was paid via
    // this kiosk, so "cancelled" is the honest SessionEndReason.
    // If the server later confirms payment, the orderStatus watcher above
    // will fire the correct terminal reason and override.
    triggerSessionEnd("cancelled", {
        source: "in-session",
        orderNumber: orderNumber.value ?? undefined,
    })
}

// ── Service request modal (kept for parity; not wired to header yet) ──────────
const showServiceModal = ref(false)
const isSubmittingService = ref(false)

const callForService = async (tableServiceId: number) => {
    const currentOrderId = orderId.value
    if (!currentOrderId) {
        ElMessage.error("Cannot send request: no active order found.")
        return
    }
    isSubmittingService.value = true
    try {
        const api = useApi()
        await api.post("/api/service/request", {
            order_id: currentOrderId,
            table_service_id: tableServiceId,
        })
        ElMessage.success("Staff has been notified!")
        showServiceModal.value = false
    } catch (e: any) {
        logger.error("[in-session] Service request failed", e?.message)
        ElMessage.error("Failed to send request. Please try again.")
    } finally {
        isSubmittingService.value = false
    }
}

definePageMeta({ layout: "kiosk" })
</script>

<template>
    <NuxtErrorBoundary
        @error="(err: unknown) => logger.error('[in-session] Page error boundary caught', err)"
    >
        <template #default>
            <!-- ── Main In-Session Layout ──────────────────────────────────────── -->
            <div class="flex h-dvh overflow-hidden bg-[#080706] text-white">
                <!-- ══ LEFT COLUMN — Status header + Order in Session band ═══════ -->
                <div class="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-white/5 p-6 gap-5">
                    <!-- Top header band -->
                    <header class="flex flex-shrink-0 items-center justify-between gap-4">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full border border-primary/45 bg-primary/15 text-primary font-bold text-xs tracking-wide tabular-nums">
                                {{ tableShort }}
                            </span>
                            <div class="min-w-0">
                                <h1 class="text-sm font-bold uppercase tracking-[0.18em] text-white/90 truncate">
                                    {{ packageHeading }}
                                </h1>
                                <p class="text-[10px] uppercase tracking-[0.2em] font-semibold text-white/30 truncate">
                                    {{ tableName }}
                                </p>
                            </div>
                        </div>

                        <span
                            class="flex-shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                            :class="isOnline
                                ? 'border-primary/30 bg-primary/10 text-primary'
                                : 'border-error/40 bg-error/15 text-error'"
                        >
                            <span
                                class="inline-block w-1.5 h-1.5 rounded-full"
                                :class="isOnline ? 'bg-primary animate-pulse' : 'bg-error'"
                            />
                            {{ isOnline ? 'Online' : 'Offline' }}
                        </span>
                    </header>

                    <!-- Order in Session band -->
                    <section class="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-6 py-5">
                        <div class="flex items-center justify-between gap-4 flex-wrap">
                            <div class="flex items-center gap-3 min-w-0">
                                <span class="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 text-primary">
                                    <ClipboardList class="w-5 h-5" />
                                </span>
                                <h2 class="text-xl md:text-2xl font-extrabold font-raleway text-primary tracking-tight">
                                    Order in Session
                                </h2>
                            </div>

                            <span class="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary">
                                <span class="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                {{ timerPillLabel }}
                            </span>
                        </div>
                    </section>

                    <!-- Submitted items stream — flattened from orderStore.rounds.
                         Restored from c2b3774 (the known-working tip); markup re-styled
                         to the gold palette of the redesigned in-session screen. -->
                    <section class="flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
                        <div
                            v-for="(item, index) in displaySubmittedItems"
                            :key="`ordered-${item.sourceRoundLabel}-${item.id}-${index}`"
                            class="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.05] px-3.5 py-3"
                        >
                            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                                <div class="flex items-center gap-2">
                                    <span class="truncate text-sm font-medium text-white/90">{{ item.name }}</span>
                                    <span
                                        v-if="item.isUnlimited"
                                        class="flex-shrink-0 rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary"
                                        aria-label="Unlimited"
                                    >∞</span>
                                    <span
                                        v-if="item.sourceRound === 'refill'"
                                        class="flex-shrink-0 rounded border border-white/15 bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white/55"
                                    >
                                        {{ item.sourceRoundLabel }}
                                    </span>
                                </div>
                                <span v-if="item.price > 0" class="text-xs text-white/40">
                                    {{ formatPesoExact(item.price) }} each
                                </span>
                            </div>

                            <span class="flex-shrink-0 rounded-lg bg-white/[0.05] px-2.5 py-1 text-sm font-semibold tabular-nums text-white/85">
                                ×{{ item.quantity }}
                            </span>

                            <span
                                v-if="item.price > 0"
                                class="w-20 flex-shrink-0 text-right text-sm font-semibold tabular-nums text-primary"
                            >
                                {{ formatPesoExact(item.price * item.quantity) }}
                            </span>
                        </div>

                        <p
                            v-if="!displaySubmittedItems.length"
                            class="py-8 text-center text-sm text-white/40"
                        >
                            No items submitted yet.
                        </p>
                    </section>
                </div>

                <!-- ══ RIGHT COLUMN — Order Summary ══════════════════════════════ -->
                <aside class="w-[340px] flex-shrink-0 flex flex-col bg-[#0c0b0a] border-l border-white/5">
                    <div class="flex-shrink-0 px-7 pt-7 pb-3">
                        <h3 class="text-lg font-bold font-raleway text-white">
                            Order Summary
                        </h3>
                    </div>

                    <!-- Line items: package / subtotal / tax -->
                    <div class="flex-shrink-0 px-7 py-2 space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-white/65">Package</span>
                            <span class="text-sm font-semibold text-white tabular-nums">{{ formatPeso(packageTotal) }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-white/65">Subtotal</span>
                            <span class="text-sm font-semibold text-white tabular-nums">{{ formatPeso(addOnsTotal) }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-sm text-white/65">Tax ({{ taxRatePercent }}%)</span>
                            <span class="text-sm font-semibold text-white tabular-nums">{{ formatPesoExact(taxAmount) }}</span>
                        </div>
                    </div>

                    <!-- Total -->
                    <div class="flex-shrink-0 mx-7 mt-4 pt-4 border-t border-white/10 flex items-baseline justify-between">
                        <span class="text-sm font-bold uppercase tracking-[0.18em] text-white">Total</span>
                        <span class="text-2xl font-extrabold font-raleway text-primary tabular-nums">
                            {{ formatPesoExact(grandTotalDisplay) }}
                        </span>
                    </div>

                    <!-- Buttons -->
                    <div class="flex-shrink-0 px-7 pt-6 pb-3 space-y-3">
                        <button
                            type="button"
                            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-dark px-4 py-3.5 text-sm font-bold font-raleway text-secondary shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.98] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            @click="goToRefill"
                        >
                            <RefreshCw class="w-4 h-4" />
                            Order Refills
                        </button>
                        <button
                            type="button"
                            class="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/85 hover:bg-white/[0.07] hover:border-white/25 active:scale-[0.98] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            @click="goToRefill"
                        >
                            <ShoppingBag class="w-4 h-4" />
                            + Add More Items
                        </button>
                        <button
                            type="button"
                            :disabled="true"
                            :aria-disabled="true"
                            class="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-white/45 cursor-not-allowed"
                        >
                            <Receipt class="w-4 h-4" />
                            Request Bill
                        </button>
                        <p class="text-[10px] text-center text-white/30 -mt-1 leading-tight">
                            Ask a server to settle — touch billing coming soon
                        </p>
                    </div>

                    <!-- Spacer pushing End Session link to the bottom -->
                    <div class="flex-1" />

                    <button
                        type="button"
                        class="flex-shrink-0 mb-8 mx-auto text-xs font-semibold text-white/45 hover:text-white/70 underline-offset-4 hover:underline transition"
                        @click="endSession"
                    >
                        End Session
                    </button>
                </aside>
            </div>

            <!-- ── Service Request Modal (unchanged) ───────────────────────────── -->
            <ElDialog
                v-model="showServiceModal"
                title="Call for Staff"
                width="360px"
                align-center
                class="session-dialog"
            >
                <p class="mb-5 text-sm text-[#9b9484]">
                    What do you need help with?
                </p>
                <div class="flex flex-col gap-3">
                    <ElButton
                        type="primary"
                        :loading="isSubmittingService"
                        class="w-full"
                        @click="callForService(1)"
                    >
                        Call Waiter
                    </ElButton>
                    <ElButton
                        :loading="isSubmittingService"
                        class="w-full"
                        @click="callForService(2)"
                    >
                        Request Bill
                    </ElButton>
                    <ElButton
                        :loading="isSubmittingService"
                        class="w-full"
                        @click="callForService(3)"
                    >
                        Need Utensils / Condiments
                    </ElButton>
                </div>
                <template #footer>
                    <ElButton :disabled="isSubmittingService" @click="showServiceModal = false">
                        Cancel
                    </ElButton>
                </template>
            </ElDialog>
        </template>

        <!-- ── Error boundary fallback ──────────────────────────────────────── -->
        <template #error="{ error, clearError }">
            <div class="flex h-screen flex-col items-center justify-center gap-4 bg-[#080706] p-8 text-center">
                <UtensilsCrossed class="h-12 w-12 text-[#7a776f]" />
                <p class="text-lg font-medium text-[#f0e6d2]">
                    Something went wrong
                </p>
                <p class="text-sm text-[#9b9484]">
                    {{ (error as any)?.message ?? 'An unexpected error occurred.' }}
                </p>
                <div class="mt-2 flex gap-3">
                    <button
                        class="flex items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-br from-primary to-primary-dark px-4 py-[14px] text-sm font-bold text-secondary cursor-pointer transition-[opacity,transform] duration-150 hover:opacity-[0.92] active:scale-[0.98]"
                        @click="clearError()"
                    >
                        Try Again
                    </button>
                    <button
                        class="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.12] bg-transparent px-[14px] py-2 text-[0.8125rem] font-semibold text-[#9b9484] cursor-pointer transition-[border-color,color,background] duration-150 hover:border-[rgba(233,211,170,0.3)] hover:text-[#e9d3aa] hover:bg-[rgba(233,211,170,0.05)]"
                        @click="navigateTo('/')"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        </template>
    </NuxtErrorBoundary>
</template>

<style scoped>
@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}
.animate-pulse-live {
  animation: pulse-live 1.6s ease-in-out infinite;
}
</style>
