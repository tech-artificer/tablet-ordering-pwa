<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, unref, watch } from "vue"
import { Bell, Clock, ShoppingBag, Users, UtensilsCrossed } from "lucide-vue-next"
import { ElDialog, ElButton, ElMessage } from "element-plus"
import { useSessionStore } from "~/stores/Session"
import { useOrderStore } from "~/stores/Order"
import { useDeviceStore } from "~/stores/Device"
import type { SubmittedItem } from "~/types"
import { useApi } from "~/composables/useApi"
import { useSessionEndFlow } from "~/composables/useSessionEndFlow"
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

type OrderedItem = SubmittedItem & { sourceRound?: "initial" | "refill"; sourceRoundLabel?: string; is_unlimited?: boolean; unit_price?: number }

function normalizeHistoryItem (item: any, sourceRound: "initial" | "refill", sourceRoundLabel: string): OrderedItem {
    return {
        id: Number(item?.menu_id ?? item?.id ?? 0),
        menu_id: Number(item?.menu_id ?? item?.id ?? 0),
        name: String(item?.name ?? item?.receipt_name ?? "Item"),
        quantity: Number(item?.quantity ?? 0),
        price: Number(item?.price ?? item?.unit_price ?? 0),
        img_url: item?.img_url || null,
        category: item?.category || null,
        isUnlimited: Boolean(item?.isUnlimited || item?.is_unlimited),
        sourceRound,
        sourceRoundLabel,
    }
}

const displaySubmittedItems = computed<OrderedItem[]>(() => {
    // PRIMARY: rounds[] — append-only ledger written by appendRound() on every
    // successful submission. Source of truth for "show every item the customer
    // has ever ordered in this session, grouped by round". Survives refresh,
    // recovery, and validator passes — it is never cleared mid-session.
    const rounds = (unref(orderStore.rounds) ?? []) as any[]
    if (Array.isArray(rounds) && rounds.length > 0) {
        const out: OrderedItem[] = []
        for (const round of rounds) {
            const isRefill = round?.kind === "refill"
            const label = isRefill
                ? `Refill #${Math.max(1, Number(round?.number ?? 1) - 1)}`
                : "Initial Order"
            const items = Array.isArray(round?.items) ? round.items : []
            for (const item of items) {
                out.push({
                    id: Number(item?.id ?? item?.menu_id ?? 0),
                    menu_id: Number(item?.menu_id ?? item?.id ?? 0),
                    name: String(item?.name ?? "Item"),
                    quantity: Number(item?.quantity ?? 0),
                    price: Number(item?.price ?? 0),
                    img_url: item?.img_url || null,
                    category: item?.category || null,
                    isUnlimited: Boolean(item?.isUnlimited),
                    sourceRound: isRefill ? "refill" : "initial",
                    sourceRoundLabel: label,
                })
            }
        }
        if (out.length > 0) { return out }
    }

    // FALLBACK 1: legacy submittedItems (now append-only via the refill fix).
    const submitted = (unref(orderStore.submittedItems) ?? []) as SubmittedItem[]
    if (submitted.length > 0) {
        return submitted.map(item => ({
            ...item,
            sourceRound: "initial" as const,
            sourceRoundLabel: "Order",
        }))
    }

    // FALLBACK 2: currentOrder.items / .order_items (server-polled snapshot).
    const co = currentOrder.value as any
    if (Array.isArray(co?.items) && co.items.length > 0) {
        return co.items.map((item: any) => normalizeHistoryItem(item, "initial", "Order"))
    }
    if (Array.isArray(co?.order_items) && co.order_items.length > 0) {
        return co.order_items.map((item: any) => normalizeHistoryItem(item, "initial", "Order"))
    }

    // FALLBACK 3: legacy history entries.
    const history = ([...((unref(orderStore.history) ?? []) as any[])]).reverse()
    for (const entry of history) {
        const order = (entry as any)?.order ?? entry
        const items = order?.items ?? order?.order_items
        if (Array.isArray(items) && items.length > 0) {
            const isRefill = (entry as any)?.type === "refill"
            const sourceRound: "initial" | "refill" = isRefill ? "refill" : "initial"
            const sourceRoundLabel = isRefill ? "Refill" : "Order"
            return items.map((item: any) => normalizeHistoryItem(item, sourceRound, sourceRoundLabel))
        }
    }

    return []
})

// ── Display helpers ───────────────────────────────────────────────────────────
const packageName = computed(() =>
    (orderStore.package as any)?.name ??
    (currentOrder.value as any)?.package_name ??
    "Package"
)

const totalItemsOrdered = computed(() =>
    displaySubmittedItems.value.reduce((s: number, i: SubmittedItem) => s + Number(i?.quantity ?? 0), 0)
)

// Use server/order-adapter total when available so billing matches authoritative
// order calculation (package, multipliers, taxes, and backend adjustments).
const displayTotal = computed<number>(() => {
    // 1. Server total from normalized currentOrder (polled live value).
    //    Guard > 0: polling responses sometimes return 0 for an unpopulated field.
    const totalFromOrder = Number((currentOrder.value as any)?.total_amount)
    if (Number.isFinite(totalFromOrder) && totalFromOrder > 0) { return totalFromOrder }

    // 2. History entries most-recent-first — submission responses carry total_amount
    //    even after polling overwrites currentOrder with a shape that lacks it.
    const history = ([...((unref(orderStore.history) ?? []) as any[])]).reverse()
    for (const entry of history) {
        const order = (entry as any)?.order ?? entry
        const histTotal = Number(order?.total_amount ?? (entry as any)?.total_amount)
        if (Number.isFinite(histTotal) && histTotal > 0) { return histTotal }
    }

    // 3. grandTotal — package × guestCount; add-ons zeroed after cart clear.
    //    Only approximate, shown while server total is not yet available.
    const fallbackTotal = Number(unref(orderStore.grandTotal) ?? 0)
    return Number.isFinite(fallbackTotal) ? fallbackTotal : 0
})
const formattedDisplayTotal = computed<string>(() => displayTotal.value.toFixed(2))

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

// Note: Session only ends when order is paid/voided/cancelled (handled by orderStatus watcher)
// No idle timeout - customers can stay in session indefinitely until order is terminal

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
})

onUnmounted(() => {
    if (clockIntervalId) {
        clearInterval(clockIntervalId)
        clockIntervalId = null
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

definePageMeta({ layout: "kiosk", middleware: ["order-guard"] })
</script>

<template>
    <NuxtErrorBoundary
        @error="(err: unknown) => logger.error('[in-session] Page error boundary caught', err)"
    >
        <template #default>
            <!-- ── Main In-Session Layout ──────────────────────────────────────── -->
            <div class="flex h-dvh overflow-hidden bg-[#080706]">
                <!-- ══ LEFT COLUMN — Order Stream ════════════════════════════════ -->
                <div class="flex-1 min-w-0 flex flex-col overflow-hidden border-r border-white/5">
                    <!-- Header -->
                    <header class="flex flex-shrink-0 items-center justify-between border-b border-white/5 px-6 py-4">
                        <button
                            class="inline-flex items-center gap-1.5 rounded-[10px] border border-white/[0.12] bg-transparent px-[14px] py-2 text-[0.8125rem] font-semibold text-[#9b9484] cursor-pointer transition-[border-color,color,background] duration-150 hover:border-[rgba(233,211,170,0.3)] hover:text-[#e9d3aa] hover:bg-[rgba(233,211,170,0.05)]"
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
                            <span class="inline-block h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse-live" />
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
                    <div class="scrollbar-warm flex-1 overflow-y-auto space-y-2 px-6 py-4">
                        <div
                            v-for="(item, index) in displaySubmittedItems"
                            :key="`ordered-${item.sourceRoundLabel ?? 'order'}-${item.id ?? item.menu_id ?? index}-${index}`"
                            class="flex items-center gap-3 rounded-xl bg-[#141210] border border-transparent p-[12px_14px] transition-[border-color,background] duration-150 hover:bg-[#1e1a16] hover:border-[rgba(233,211,170,0.1)]"
                        >
                            <!-- Emoji icon cell -->
                            <div class="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-[10px] bg-[#1e1a16]">
                                <span class="text-xl leading-none">{{ itemEmoji(item) }}</span>
                            </div>

                            <!-- Item details -->
                            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                                <div class="flex items-center gap-2">
                                    <span class="truncate text-sm font-medium text-[#f0e6d2]">{{ item.name }}</span>
                                    <span
                                        v-if="item.isUnlimited || item.is_unlimited"
                                        class="flex-shrink-0 rounded border border-[#e9d3aa]/30 bg-[#e9d3aa]/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[#e9d3aa]"
                                    >∞</span>
                                    <span
                                        v-if="item.sourceRound === 'refill'"
                                        class="flex-shrink-0 rounded border border-[#7a776f]/30 bg-[#7a776f]/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-[#9b9484]"
                                    >
                                        {{ item.sourceRoundLabel }}
                                    </span>
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
                            v-if="!displaySubmittedItems.length"
                            class="py-8 text-center text-sm text-[#7a776f]"
                        >
                            No items submitted yet.
                        </p>
                    </div>
                </div>

                <!-- ══ RIGHT COLUMN — Billing Terminal ══════════════════════════ -->
                <aside class="w-[300px] flex-shrink-0 flex flex-col bg-[#0f0e0c]">
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
                                ₱{{ formattedDisplayTotal }}
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
                            class="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-[#9b9484] cursor-pointer transition-[border-color,color,background] duration-150 hover:border-[rgba(233,211,170,0.25)] hover:text-[#e8e2d4] hover:bg-white/[0.03] w-full opacity-40 cursor-not-allowed"
                            disabled
                            title="Coming soon"
                        >
                            <Bell class="h-4 w-4" />
                            Call Staff
                        </button>
                        <button
                            class="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-[#9b9484] cursor-pointer transition-[border-color,color,background] duration-150 hover:border-[rgba(233,211,170,0.25)] hover:text-[#e8e2d4] hover:bg-white/[0.03] w-full"
                            @click="goToRefill"
                        >
                            <ShoppingBag class="h-4 w-4" />
                            Add More Items
                        </button>
                        <button
                            class="flex items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-br from-[#e9d3aa] to-[#d1b883] px-4 py-[14px] text-sm font-bold text-[#0f0e0c] cursor-pointer transition-[opacity,transform] duration-150 hover:opacity-[0.92] active:scale-[0.98] w-full opacity-40 cursor-not-allowed"
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
                        class="flex items-center justify-center gap-2 rounded-xl border-0 bg-gradient-to-br from-[#e9d3aa] to-[#d1b883] px-4 py-[14px] text-sm font-bold text-[#0f0e0c] cursor-pointer transition-[opacity,transform] duration-150 hover:opacity-[0.92] active:scale-[0.98]"
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
