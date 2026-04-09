<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, unref, watch } from 'vue'
import { Bell, ChevronRight, Clock, ShoppingBag, Users, UtensilsCrossed } from 'lucide-vue-next'
import { ElDialog, ElButton, ElMessage } from 'element-plus'
import { useSessionStore } from '~/stores/Session'
import { useOrderStore } from '~/stores/Order'
import { useDeviceStore } from '~/stores/Device'
import { useApi } from '~/composables/useApi'
import { useIdleDetector } from '~/composables/useIdleDetector'
import { logger } from '~/utils/logger'

// ────────────────────────────────────────────────────────────────────────────
// Stores
// ────────────────────────────────────────────────────────────────────────────
const sessionStore = useSessionStore()
const orderStore = useOrderStore()
const deviceStore = useDeviceStore()

// ────────────────────────────────────────────────────────────────────────────
// Derived state
// ────────────────────────────────────────────────────────────────────────────
const currentOrder = computed(() => {
  const raw = orderStore.currentOrder
  if (!raw) return null
  // Normalise nested vs flat shape
  return (raw as any).order ?? raw
})

const orderStatus = computed<string>(() => currentOrder.value?.status ?? 'pending')
const orderNumber = computed<string | null>(() => currentOrder.value?.order_number ?? null)
const orderId = computed<number | null>(() => currentOrder.value?.order_id ?? sessionStore.orderId ?? null)

const tableName = computed<string>(() => deviceStore.getTableName() ?? '—')
const guestCount = computed<number>(() => (unref(orderStore.guestCount) ?? 2) as number)

/** Submitted items for the current (initial) order */
const submittedItems = computed<any[]>(() => (unref(orderStore.submittedItems) ?? []) as any[])

/**
 * Refill history: history entries after the first (index 0 is the initial order,
 * subsequent entries are confirmed refills).
 */
const refillHistory = computed(() => {
  const h = (unref(orderStore.history) ?? []) as any[]
  if (h.length <= 1) return []
  return h.slice(1).map((entry: any) => ({
    orderNumber: entry?.order?.order_number ?? entry?.order_number ?? '—',
    status: entry?.order?.status ?? entry?.status ?? 'pending',
  }))
})

// ────────────────────────────────────────────────────────────────────────────
// Timer — server-authoritative via sessionStore.remainingMs (updated every 1 s)
// ────────────────────────────────────────────────────────────────────────────
const formatTime = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`
}

const timeRemaining = computed<string>(() => formatTime((unref(sessionStore.remainingMs) ?? 0) as number))
const isTimerCritical = computed<boolean>(() => ((unref(sessionStore.remainingMs) ?? 0) as number) < 5 * 60 * 1000)

// ────────────────────────────────────────────────────────────────────────────
// Session-end screen
// ────────────────────────────────────────────────────────────────────────────
const showEndScreen = ref(false)
let endRedirectTimer: ReturnType<typeof setTimeout> | null = null

const handleSessionEnd = () => {
  if (showEndScreen.value) return
  showEndScreen.value = true
  logger.info('[in-session] Session ended — showing thank-you screen')
  endRedirectTimer = setTimeout(() => {
    navigateTo('/')
  }, 5000)
}

watch(
  () => sessionStore.timerExpired,
  (expired) => { if (expired) handleSessionEnd() },
  { immediate: true }
)

// Watch for order completion driven by the polling/WS layer in Order.ts
// (Order.ts already calls sessionStore.end() + navigates to '/' on 'completed' status,
//  but we guard here too in case the navigation doesn't fire inside this component)
watch(orderStatus, (status) => {
  if (status === 'completed') {
    logger.info('[in-session] Order completed — ending session')
    handleSessionEnd()
  }
})

// ────────────────────────────────────────────────────────────────────────────
// Idle lock — 2 min warn, 5 min auto-end
// ────────────────────────────────────────────────────────────────────────────
const showIdleWarning = ref(false)

const { isWarning: idleWarning, start: startIdleDetector, stop: stopIdleDetector } = useIdleDetector({
  onWarn() {
    showIdleWarning.value = true
  },
  onExpire() {
    showIdleWarning.value = false
    logger.warn('[in-session] Idle timeout — ending session')
    sessionStore.endSession()
    navigateTo('/')
  },
})

watch(idleWarning, (v) => {
  if (!v) showIdleWarning.value = false
})

// ────────────────────────────────────────────────────────────────────────────
// Navigation guards — also enforced by middleware/order-guard.ts
// ────────────────────────────────────────────────────────────────────────────
onMounted(() => {
  if (!sessionStore.isActive) {
    logger.warn('[in-session] No active session — redirecting to home')
    navigateTo('/')
    return
  }
  if (!orderStore.hasPlacedOrder) {
    logger.warn('[in-session] No placed order — redirecting to menu')
    navigateTo('/menu')
    return
  }
  startIdleDetector()
})

onUnmounted(() => {
  stopIdleDetector()
  if (endRedirectTimer) {
    clearTimeout(endRedirectTimer)
    endRedirectTimer = null
  }
})

// ────────────────────────────────────────────────────────────────────────────
// Refill navigation
// ────────────────────────────────────────────────────────────────────────────
const goToRefill = () => {
  try {
    orderStore.toggleRefillMode(true)
  } catch (e) {
    logger.warn('[in-session] toggleRefillMode failed', e)
  }
  navigateTo('/menu')
}

// ────────────────────────────────────────────────────────────────────────────
// Order summary drawer
// ────────────────────────────────────────────────────────────────────────────
const showOrderDrawer = ref(false)

// ────────────────────────────────────────────────────────────────────────────
// Service request modal
// ────────────────────────────────────────────────────────────────────────────
const showServiceModal = ref(false)
const isSubmittingService = ref(false)

const callForService = async (tableServiceId: number) => {
  const currentOrderId = orderId.value
  if (!currentOrderId) {
    ElMessage.error('Cannot send request: no active order found.')
    return
  }
  isSubmittingService.value = true
  try {
    const api = useApi()
    await api.post('/api/service/request', {
      order_id: currentOrderId,
      table_service_id: tableServiceId,
    })
    ElMessage.success('Staff has been notified!')
    showServiceModal.value = false
  } catch (e: any) {
    logger.error('[in-session] Service request failed', e?.message)
    ElMessage.error('Failed to send request. Please try again.')
  } finally {
    isSubmittingService.value = false
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Status helpers
// ────────────────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  pending: 'Order Received',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
  voided: 'Voided',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  ready: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
  voided: 'bg-red-100 text-red-800',
}

const statusLabel = computed(() => STATUS_LABELS[orderStatus.value] ?? orderStatus.value)
const statusColor = computed(() => STATUS_COLORS[orderStatus.value] ?? 'bg-gray-100 text-gray-700')

definePageMeta({ middleware: ['order-guard'] })
</script>

<template>
  <NuxtErrorBoundary
    @error="(err: unknown) => logger.error('[in-session] Page error boundary caught', err)"
  >
    <template #default>
      <!-- ── Session-end Thank-You Screen ────────────────────────────────── -->
      <div
        v-if="showEndScreen"
        class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 to-amber-600 text-white"
      >
        <UtensilsCrossed class="mb-6 h-20 w-20 opacity-90" />
        <h1 class="text-4xl font-bold tracking-tight">Thank You!</h1>
        <p class="mt-3 text-lg opacity-80">We hope you enjoyed your meal.</p>
        <p class="mt-6 text-sm opacity-60">Returning to the welcome screen…</p>
      </div>

      <!-- ── Main In-Session Layout ──────────────────────────────────────── -->
      <div v-else class="flex h-screen flex-col overflow-hidden bg-gray-50">

        <!-- ── Session Header Bar ────────────────────────────────────────── -->
        <header class="flex items-center justify-between bg-white px-6 py-3 shadow-sm">
          <!-- Table + Guest info -->
          <div class="flex items-center gap-4">
            <div class="text-sm text-gray-500">Table</div>
            <div class="text-lg font-semibold text-gray-900">{{ tableName }}</div>
            <div class="flex items-center gap-1 text-sm text-gray-500">
              <Users class="h-4 w-4" />
              <span>{{ guestCount }}</span>
            </div>
          </div>

          <!-- Server-authoritative countdown timer -->
          <div
            class="flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
            :class="isTimerCritical ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'"
          >
            <Clock class="h-4 w-4" :class="isTimerCritical && 'animate-pulse'" />
            {{ timeRemaining }}
          </div>
        </header>

        <!-- ── Main Content ───────────────────────────────────────────────── -->
        <main class="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          <!-- Order Status Card -->
          <section class="rounded-2xl bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <p v-if="orderNumber" class="text-xs font-medium uppercase tracking-wider text-gray-500">
                  Order #{{ orderNumber }}
                </p>
                <p v-else class="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Processing…
                </p>
              </div>
              <span
                class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                :class="statusColor"
              >
                {{ statusLabel }}
              </span>
            </div>

            <!-- Status progress bar -->
            <div class="mt-4 flex gap-1">
              <div
                v-for="step in ['pending','confirmed','ready']"
                :key="step"
                class="h-1.5 flex-1 rounded-full transition-colors duration-500"
                :class="['pending','confirmed','ready','completed'].indexOf(orderStatus) >= ['pending','confirmed','ready'].indexOf(step)
                  ? 'bg-orange-500'
                  : 'bg-gray-200'"
              />
            </div>

            <!-- Submitted items summary -->
            <ul v-if="submittedItems.length" class="mt-4 divide-y divide-gray-50 text-sm text-gray-700">
              <li
                v-for="item in submittedItems"
                :key="item.id"
                class="flex justify-between py-1.5"
              >
                <span>{{ item.name }} <span v-if="item.quantity > 1" class="text-gray-400">×{{ item.quantity }}</span></span>
                <span class="text-gray-500">₱{{ (Number(item.price) * Number(item.quantity)).toFixed(2) }}</span>
              </li>
            </ul>
          </section>

          <!-- Refill History -->
          <section v-if="refillHistory.length" class="rounded-2xl bg-white p-5 shadow-sm">
            <h2 class="mb-3 text-sm font-semibold text-gray-700">Refill History</h2>
            <ul class="divide-y divide-gray-50 text-sm">
              <li
                v-for="(refill, i) in refillHistory"
                :key="i"
                class="flex items-center justify-between py-2"
              >
                <span class="text-gray-700">Refill #{{ i + 1 }} — Order {{ refill.orderNumber }}</span>
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="STATUS_COLORS[refill.status] ?? 'bg-gray-100 text-gray-500'"
                >{{ STATUS_LABELS[refill.status] ?? refill.status }}</span>
              </li>
            </ul>
          </section>

        </main>

        <!-- ── Primary Action Row ─────────────────────────────────────────── -->
        <footer class="bg-white border-t border-gray-100 px-6 py-4">
          <div class="flex gap-3">
            <!-- Add More Items (Refill) -->
            <button
              class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600 active:scale-95"
              @click="goToRefill"
            >
              <ShoppingBag class="h-4 w-4" />
              Add More Items
            </button>

            <!-- Request Service -->
            <button
              class="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
              @click="showServiceModal = true"
            >
              <Bell class="h-4 w-4" />
              Call Staff
            </button>

            <!-- View My Order -->
            <button
              class="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-95"
              @click="showOrderDrawer = true"
            >
              <ChevronRight class="h-4 w-4" />
              My Order
            </button>
          </div>
        </footer>

      </div>

      <!-- ── Service Request Modal ──────────────────────────────────────── -->
      <ElDialog
        v-model="showServiceModal"
        title="Call for Staff"
        width="360px"
        align-center
      >
        <p class="text-sm text-gray-600 mb-5">What do you need help with?</p>
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
          <ElButton @click="showServiceModal = false" :disabled="isSubmittingService">
            Cancel
          </ElButton>
        </template>
      </ElDialog>

      <!-- ── My Order Drawer (slide-over) ──────────────────────────────── -->
      <ElDialog
        v-model="showOrderDrawer"
        title="My Order"
        width="400px"
        align-center
      >
        <ul v-if="submittedItems.length" class="divide-y text-sm text-gray-700">
          <li
            v-for="item in submittedItems"
            :key="item.id"
            class="flex justify-between py-2"
          >
            <span>{{ item.name }} <span v-if="item.quantity > 1" class="text-gray-400">×{{ item.quantity }}</span></span>
            <span>₱{{ (Number(item.price) * Number(item.quantity)).toFixed(2) }}</span>
          </li>
        </ul>
        <p v-else class="text-sm text-gray-400">No items found.</p>
        <template #footer>
          <ElButton @click="showOrderDrawer = false">Close</ElButton>
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
      >
        <p class="text-sm text-gray-600 text-center">
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
      <div class="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <UtensilsCrossed class="h-12 w-12 text-gray-300" />
        <p class="text-lg font-medium text-gray-700">Something went wrong</p>
        <p class="text-sm text-gray-500">{{ (error as any)?.message ?? 'An unexpected error occurred.' }}</p>
        <div class="flex gap-3 mt-2">
          <button
            class="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
            @click="clearError()"
          >
            Try Again
          </button>
          <button
            class="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            @click="navigateTo('/')"
          >
            Return Home
          </button>
        </div>
      </div>
    </template>
  </NuxtErrorBoundary>
</template>
