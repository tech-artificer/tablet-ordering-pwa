<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, unref, watch } from "vue"
import { Bell, Clock, ShoppingBag, Users, UtensilsCrossed } from "lucide-vue-next"
import { ElDialog, ElButton, ElMessage } from "element-plus"
import { useSessionStore } from "~/stores/Session"
import { useOrderStore } from "~/stores/Order"
import { useDeviceStore } from "~/stores/Device"
import { useApi } from "~/composables/useApi"
import { useIdleDetector } from "~/composables/useIdleDetector"
import { logger } from "~/utils/logger"

// ── Stores ───────────────────────────────────────────────────────────────────
const sessionStore = useSessionStore()
const orderStore = useOrderStore()
const deviceStore = useDeviceStore()

// ── Derived state ─────────────────────────────────────────────────────────────
const currentOrder = computed(() => {
    const raw = orderStore.currentOrder
    if (!raw) { return null }
    // Normalise nested vs flat shape
    return (raw as any).order ?? raw
})

const orderStatus = computed<string>(() => currentOrder.value?.status ?? "pending")
const orderNumber = computed<string | null>(() => currentOrder.value?.order_number ?? null)
const orderId = computed<number | null>(() => currentOrder.value?.order_id ?? sessionStore.orderId ?? null)

const tableName = computed<string>(() => deviceStore.getTableName() ?? "—")
const guestCount = computed<number>(() => (unref(orderStore.guestCount) ?? 2) as number)

const submittedItems = computed<any[]>(() => (unref(orderStore.submittedItems) ?? []) as any[])

const refillHistory = computed(() => {
    const h = (unref(orderStore.history) ?? []) as any[]
    if (h.length <= 1) { return [] }
    return h.slice(1).map((entry: any) => ({
        orderNumber: entry?.order?.order_number ?? entry?.order_number ?? "—",
        status: entry?.order?.status ?? entry?.status ?? "pending",
    }))
})

// ── Display helpers ───────────────────────────────────────────────────────────
const packageName = computed(() =>
    (orderStore.package as any)?.name ??
    (currentOrder.value as any)?.package_name ??
    "Package"
)

const totalItemsOrdered = computed(() =>
    submittedItems.value.reduce((s: number, i: any) => s + Number(i?.quantity ?? 0), 0)
)

const displayTotal = computed(() =>
    submittedItems.value.reduce(
        (s: number, i: any) => s + Number(i?.price ?? i?.unit_price ?? 0) * Number(i?.quantity ?? 0),
        0
    )
)

function getStatusDarkStyle (status: string): string {
    const m: Record<string, string> = {
        pending: "background:rgba(217,119,6,0.15);color:#d97706;border-color:rgba(217,119,6,0.3)",
        confirmed: "background:rgba(59,130,246,0.15);color:#60a5fa;border-color:rgba(59,130,246,0.3)",
        preparing: "background:rgba(167,139,250,0.15);color:#a78bfa;border-color:rgba(167,139,250,0.3)",
        ready: "background:rgba(34,197,94,0.15);color:#4ade80;border-color:rgba(34,197,94,0.3)",
        completed: "background:rgba(156,163,175,0.15);color:#9ca3af;border-color:rgba(156,163,175,0.3)",
        cancelled: "background:rgba(239,68,68,0.15);color:#f87171;border-color:rgba(239,68,68,0.3)",
        voided: "background:rgba(239,68,68,0.15);color:#f87171;border-color:rgba(239,68,68,0.3)",
    }
    return m[status] ?? "background:rgba(156,163,175,0.15);color:#9ca3af;border-color:rgba(156,163,175,0.3)"
}

function getStatusDotStyle (status: string): string {
    const m: Record<string, string> = {
        pending: "background:#d97706",
        confirmed: "background:#60a5fa",
        preparing: "background:#a78bfa",
        ready: "background:#4ade80",
        completed: "background:#9ca3af",
        cancelled: "background:#f87171",
        voided: "background:#f87171",
    }
    return m[status] ?? "background:#9ca3af"
}

function itemEmoji (item: any): string {
    const cat = String(item?.category ?? "").toLowerCase()
    if (cat.includes("meat")) { return "🔥" }
    if (cat.includes("side")) { return "🌿" }
    if (
        cat.includes("drink") || cat.includes("bev") ||
        cat.includes("soju") || cat.includes("beer") ||
        cat.includes("wine") || cat.includes("juice") ||
        cat.includes("tea") || cat.includes("coffee")
    ) { return "🥤" }
    if (cat.includes("dessert")) { return "🍮" }
    return "🍽️"
}

// ── Timer ─────────────────────────────────────────────────────────────────────
const formatTime = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    const mm = String(minutes).padStart(2, "0")
    const ss = String(seconds).padStart(2, "0")
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

const timeRemaining = computed<string>(() => formatTime((unref(sessionStore.remainingMs) ?? 0) as number))
const isTimerCritical = computed<boolean>(() => ((unref(sessionStore.remainingMs) ?? 0) as number) < 5 * 60 * 1000)

// ── Wall clock (12-hour AM/PM) ────────────────────────────────────────────────
const currentTime = ref<string>("")

function updateCurrentTime () {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    })
}

let clockIntervalId: ReturnType<typeof setInterval> | null = null

// ── Order round label (Initial Order / Refill #N) ─────────────────────────────
const orderRound = computed<string>(() => {
    const h = (unref(orderStore.history) ?? []) as any[]
    // history[0] = initial order; history[1..n] = refills
    const refillCount = Math.max(0, h.length - 1)
    if (refillCount === 0) { return "Initial Order" }
    return `Refill #${refillCount}`
})

// ── Session-end screen ────────────────────────────────────────────────────────
const showEndScreen = ref(false)
let endRedirectTimer: ReturnType<typeof setTimeout> | null = null

const handleSessionEnd = () => {
    if (showEndScreen.value) { return }
    showEndScreen.value = true
    logger.info("[in-session] Session ended — showing thank-you screen")
    if (sessionStore.isActive) {
        void sessionStore.end().catch((e: unknown) => logger.warn("[in-session] sessionStore.end() failed", e))
    }
    endRedirectTimer = setTimeout(() => {
        navigateTo("/")
    }, 5000)
}

watch(
    () => sessionStore.timerExpired,
    (expired) => { if (expired) { handleSessionEnd() } },
    { immediate: true }
)

watch(orderStatus, (status) => {
    if (status !== "pending" && status !== "confirmed") {
        logger.info("[in-session] Order status changed to non-live — ending session", { status })
        handleSessionEnd()
    }
})

// ── Idle lock ─────────────────────────────────────────────────────────────────
const showIdleWarning = ref(false)

const { isWarning: idleWarning, start: startIdleDetector, stop: stopIdleDetector } = useIdleDetector({
    onWarn () {
        showIdleWarning.value = true
    },
    onExpire () {
        showIdleWarning.value = false
        logger.warn("[in-session] Idle timeout — ending session")
        sessionStore.endSession()
        navigateTo("/")
    },
})

watch(idleWarning, (v) => {
    if (!v) { showIdleWarning.value = false }
})

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
        return
    }
    updateCurrentTime()
    clockIntervalId = setInterval(updateCurrentTime, 1000)
    startIdleDetector()
})

onUnmounted(() => {
    stopIdleDetector()
    if (clockIntervalId) {
        clearInterval(clockIntervalId)
        clockIntervalId = null
    }
    if (endRedirectTimer) {
        clearTimeout(endRedirectTimer)
        endRedirectTimer = null
    }
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

// ── Service request modal ─────────────────────────────────────────────────────
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

// ── Status helpers ────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
    pending: "Order Received",
    confirmed: "Confirmed",
    preparing: "Preparing",
    ready: "Ready",
    completed: "Completed",
    cancelled: "Cancelled",
    voided: "Voided",
}

const statusLabel = computed(() => STATUS_LABELS[orderStatus.value] ?? orderStatus.value)

definePageMeta({ middleware: ["order-guard"] })
</script>

<template>
    <NuxtErrorBoundary
        @error="(err: unknown) => logger.error('[in-session] Page error boundary caught', err)"
    >
        <template #default>
            <!-- ── Session-end Thank-You Screen ────────────────────────────────── -->
            <div
                v-if="showEndScreen"
                class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#080706]"
            >
                <div class="flex flex-col items-center gap-6">
                    <div class="flex h-24 w-24 items-center justify-center rounded-full border border-[#e9d3aa]/20 bg-[#1e1a16]">
                        <UtensilsCrossed class="h-10 w-10 text-[#e9d3aa]" />
                    </div>
                    <div class="text-center">
                        <h1 class="text-4xl font-bold tracking-tight text-[#f0e6d2]">
                            Thank You!
                        </h1>
                        <p class="mt-3 text-base text-[#9b9484]">
                            We hope you enjoyed your meal.
                        </p>
                    </div>
                    <p class="text-sm text-[#7a776f]">
                        Returning to the welcome screen…
                    </p>
                </div>
            </div>

            <!-- ── Main In-Session Layout ──────────────────────────────────────── -->
            <div v-else class="session-root">
                <!-- ══ LEFT COLUMN — Order Stream ════════════════════════════════ -->
                <div class="session-left">
                    <!-- Header -->
                    <header class="flex flex-shrink-0 items-center justify-between border-b border-white/5 px-6 py-4">
                        <button
                            class="session-ghost-btn"
                            @click="goToRefill"
                        >
                            <ShoppingBag class="h-4 w-4" />
                            Add More Items
                        </button>
                        <div class="flex flex-col items-center gap-0.5">
                            <h1 class="text-sm font-semibold uppercase tracking-widest text-[#9b9484]">
                                {{ orderRound }}
                            </h1>
                            <span class="text-xs text-[#6b6760]">
                                {{ currentTime }}
                            </span>
                        </div>
                        <div class="flex items-center gap-2 rounded-full border border-[#4ade80]/30 bg-[#4ade80]/10 px-3 py-1">
                            <span class="live-dot" />
                            <span class="text-xs font-medium text-[#4ade80]">Live Session</span>
                        </div>
                    </header>

                    <!-- Order meta row -->
                    <div class="flex flex-shrink-0 items-center gap-4 border-b border-white/5 px-6 py-3">
                        <span class="text-xs text-[#7a776f]">
                            {{ orderNumber ? `#${orderNumber}` : 'Processing…' }}
                        </span>
                        <div
                            class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                            :style="getStatusDarkStyle(orderStatus)"
                        >
                            <span class="h-1.5 w-1.5 rounded-full" :style="getStatusDotStyle(orderStatus)" />
                            {{ statusLabel }}
                        </div>
                        <div
                            class="ml-auto flex items-center gap-1.5 text-xs"
                            :class="isTimerCritical ? 'text-red-400' : 'text-[#8a8578]'"
                        >
                            <Clock class="h-3.5 w-3.5" :class="isTimerCritical && 'animate-pulse'" />
                            {{ timeRemaining }}
                        </div>
                    </div>

                    <!-- Scrollable item stream -->
                    <div class="session-scroll flex-1 space-y-2 px-6 py-4">
                        <div
                            v-for="item in submittedItems"
                            :key="item.id"
                            class="session-item-card"
                        >
                            <!-- Emoji icon cell -->
                            <div class="item-icon-cell flex-shrink-0">
                                <span class="text-xl leading-none">{{ itemEmoji(item) }}</span>
                            </div>

                            <!-- Item details -->
                            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                                <div class="flex items-center gap-2">
                                    <span class="truncate text-sm font-medium text-[#f0e6d2]">{{ item.name }}</span>
                                    <span
                                        v-if="item.is_unlimited"
                                        class="flex-shrink-0 rounded border border-[#e9d3aa]/30 bg-[#e9d3aa]/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#e9d3aa]"
                                    >∞</span>
                                </div>
                                <span class="text-xs text-[#7a776f]">
                                    ₱{{ Number(item.price ?? item.unit_price ?? 0).toFixed(2) }} each
                                </span>
                            </div>

                            <!-- Quantity badge -->
                            <div class="flex flex-shrink-0 items-center">
                                <span class="rounded-lg bg-[#1e1a16] px-3 py-1 text-sm font-semibold tabular-nums text-[#e8e2d4]">
                                    ×{{ item.quantity }}
                                </span>
                            </div>

                            <!-- Line total -->
                            <div class="w-20 flex-shrink-0 text-right">
                                <span class="text-sm font-semibold text-[#e9d3aa]">
                                    ₱{{ (Number(item.price ?? item.unit_price ?? 0) * Number(item.quantity)).toFixed(2) }}
                                </span>
                            </div>
                        </div>

                        <p
                            v-if="!submittedItems.length"
                            class="py-8 text-center text-sm text-[#7a776f]"
                        >
                            No items submitted yet.
                        </p>

                        <!-- Refill history -->
                        <div
                            v-if="refillHistory.length"
                            class="mt-4 space-y-2 border-t border-white/5 pt-4"
                        >
                            <p class="mb-3 text-xs font-medium uppercase tracking-widest text-[#7a776f]">
                                Refill History
                            </p>
                            <div
                                v-for="(refill, i) in refillHistory"
                                :key="i"
                                class="flex items-center justify-between rounded-lg bg-[#141210] px-4 py-2.5"
                            >
                                <span class="text-sm text-[#8a8578]">
                                    Refill #{{ i + 1 }} — Order {{ refill.orderNumber }}
                                </span>
                                <div
                                    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
                                    :style="getStatusDarkStyle(refill.status)"
                                >
                                    <span class="h-1.5 w-1.5 rounded-full" :style="getStatusDotStyle(refill.status)" />
                                    {{ STATUS_LABELS[refill.status] ?? refill.status }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ══ RIGHT COLUMN — Billing Terminal ══════════════════════════ -->
                <aside class="session-right">
                    <!-- SUMMARY label -->
                    <div class="flex-shrink-0 border-b border-white/5 px-6 py-4">
                        <p class="text-xs font-bold uppercase tracking-[0.2em] text-[#7a776f]">
                            Summary
                        </p>
                    </div>

                    <!-- Table / timer / clock mini-header -->
                    <div class="flex flex-shrink-0 items-center justify-between border-b border-white/5 px-6 py-3">
                        <span class="text-sm font-semibold text-[#f0e6d2]">{{ tableName }}</span>
                        <div class="flex flex-col items-end gap-0.5">
                            <div
                                class="flex items-center gap-1.5 text-xs"
                                :class="isTimerCritical ? 'text-red-400' : 'text-[#8a8578]'"
                            >
                                <Clock class="h-3 w-3" />
                                {{ timeRemaining }}
                            </div>
                            <span class="text-[11px] text-[#6b6760]">{{ currentTime }}</span>
                        </div>
                    </div>

                    <!-- Order detail rows -->
                    <div class="flex-shrink-0 space-y-3 border-b border-white/5 px-6 py-4">
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-[#8a8578]">Order ID</span>
                            <span class="text-sm font-semibold tabular-nums text-[#e8e2d4]">
                                {{ orderId ?? '—' }}
                            </span>
                        </div>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-2 text-[#8a8578]">
                                <Users class="h-3.5 w-3.5" />
                                <span class="text-xs">Guests</span>
                            </div>
                            <span class="text-sm font-semibold text-[#e8e2d4]">{{ guestCount }}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-[#8a8578]">Package</span>
                            <span class="max-w-[140px] truncate text-right text-sm font-semibold text-[#e8e2d4]">
                                {{ packageName }}
                            </span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-[#8a8578]">Items Ordered</span>
                            <span class="text-sm font-semibold text-[#e8e2d4]">{{ totalItemsOrdered }}</span>
                        </div>
                    </div>

                    <!-- Total block -->
                    <div class="flex-shrink-0 border-b border-white/5 px-6 py-5">
                        <div class="flex items-end justify-between">
                            <span class="text-xs font-medium uppercase tracking-wider text-[#7a776f]">Total</span>
                            <span class="text-2xl font-bold text-[#e9d3aa]">
                                ₱{{ displayTotal.toFixed(2) }}
                            </span>
                        </div>
                    </div>

                    <!-- Status pill -->
                    <div class="flex-shrink-0 px-6 py-4">
                        <div
                            class="inline-flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold"
                            :style="getStatusDarkStyle(orderStatus)"
                        >
                            <span class="h-2 w-2 rounded-full" :style="getStatusDotStyle(orderStatus)" />
                            {{ statusLabel }}
                        </div>
                    </div>

                    <!-- Spacer -->
                    <div class="flex-1" />

                    <!-- Action buttons -->
                    <div class="flex-shrink-0 space-y-3 border-t border-white/5 px-6 py-5">
                        <button
                            class="session-action-ghost w-full opacity-40 cursor-not-allowed"
                            disabled
                            title="Coming soon"
                        >
                            <Bell class="h-4 w-4" />
                            Call Staff
                        </button>
                        <button
                            class="session-action-ghost w-full"
                            @click="goToRefill"
                        >
                            <ShoppingBag class="h-4 w-4" />
                            Add More Items
                        </button>
                        <button
                            class="session-action-gold w-full opacity-40 cursor-not-allowed"
                            disabled
                            title="Coming soon"
                        >
                            Request Bill
                        </button>
                    </div>
                </aside>
            </div>

            <!-- ── Service Request Modal ──────────────────────────────────────── -->
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

            <!-- ── Idle Warning Modal ─────────────────────────────────────────── -->
            <ElDialog
                v-model="showIdleWarning"
                title="Are you still there?"
                width="360px"
                align-center
                :close-on-click-modal="false"
                :show-close="false"
                class="session-dialog"
            >
                <p class="text-center text-sm text-[#9b9484]">
                    Your session will end automatically due to inactivity.
                </p>
                <template #footer>
                    <ElButton type="primary" @click="showIdleWarning = false">
                        Yes, I'm here
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
                        class="session-action-gold"
                        @click="clearError()"
                    >
                        Try Again
                    </button>
                    <button
                        class="session-action-ghost"
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
/* ── Root layout ─────────────────────────────────────────────────────────── */
.session-root {
    display: flex;
    height: 100dvh;
    overflow: hidden;
    background: #080706;
}

/* ── Left column — order stream ──────────────────────────────────────────── */
.session-left {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
}

/* ── Right column — billing terminal ─────────────────────────────────────── */
.session-right {
    width: 300px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    background: #0f0e0c;
}

/* ── Scrollable item stream ───────────────────────────────────────────────── */
.session-scroll {
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #2b241c transparent;
}
.session-scroll::-webkit-scrollbar {
    width: 4px;
}
.session-scroll::-webkit-scrollbar-track {
    background: transparent;
}
.session-scroll::-webkit-scrollbar-thumb {
    background: #2b241c;
    border-radius: 2px;
}

/* ── Live dot pulse ───────────────────────────────────────────────────────── */
.live-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #4ade80;
    animation: pulse-live 2s ease-in-out infinite;
}

@keyframes pulse-live {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
}

/* ── Item card ────────────────────────────────────────────────────────────── */
.session-item-card {
    display: flex;
    align-items: center;
    gap: 12px;
    border-radius: 12px;
    background: #141210;
    border: 1px solid transparent;
    padding: 12px 14px;
    transition: border-color 0.15s, background 0.15s;
}

.session-item-card:hover {
    background: #1e1a16;
    border-color: rgba(233, 211, 170, 0.1);
}

/* ── Item icon cell ───────────────────────────────────────────────────────── */
.item-icon-cell {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: #1e1a16;
    flex-shrink: 0;
}

/* ── Ghost button (header + sidebar) ─────────────────────────────────────── */
.session-ghost-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    padding: 8px 14px;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #9b9484;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.session-ghost-btn:hover {
    border-color: rgba(233, 211, 170, 0.3);
    color: #e9d3aa;
    background: rgba(233, 211, 170, 0.05);
}

/* ── Sidebar ghost action ─────────────────────────────────────────────────── */
.session-action-ghost {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent;
    padding: 12px 16px;
    font-size: 0.875rem;
    font-weight: 600;
    color: #9b9484;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.session-action-ghost:hover {
    border-color: rgba(233, 211, 170, 0.25);
    color: #e8e2d4;
    background: rgba(255, 255, 255, 0.03);
}

/* ── Gold CTA ─────────────────────────────────────────────────────────────── */
.session-action-gold {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 12px;
    border: none;
    background: linear-gradient(135deg, #e9d3aa 0%, #d1b883 100%);
    padding: 14px 16px;
    font-size: 0.875rem;
    font-weight: 700;
    color: #0f0e0c;
    cursor: pointer;
    transition: opacity 0.15s, transform 0.1s;
}

.session-action-gold:hover {
    opacity: 0.92;
}

.session-action-gold:active {
    transform: scale(0.98);
}

/* ── Element Plus dialog dark overrides ──────────────────────────────────── */
:deep(.session-dialog .el-dialog) {
    background: #141210 !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 16px !important;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6) !important;
}

:deep(.session-dialog .el-dialog__header) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
    padding: 20px 24px 16px !important;
}

:deep(.session-dialog .el-dialog__title) {
    color: #f0e6d2 !important;
    font-size: 1rem !important;
    font-weight: 600 !important;
}

:deep(.session-dialog .el-dialog__headerbtn .el-dialog__close) {
    color: #7a776f !important;
}

:deep(.session-dialog .el-dialog__body) {
    color: #9b9484 !important;
    padding: 20px 24px !important;
}

:deep(.session-dialog .el-dialog__footer) {
    border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
    padding: 16px 24px 20px !important;
}
</style>
