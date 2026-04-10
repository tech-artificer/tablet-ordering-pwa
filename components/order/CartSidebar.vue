<script setup lang="ts">
import { computed } from 'vue'
import { formatCurrency } from '../../utils/formats';
import type { Package, CartItem } from '../../types';
import { ElBadge, ElEmpty } from 'element-plus';
import { useDeviceStore } from '../../stores/Device';
import { useSessionStore } from '../../stores/Session';
import { useOrderStore } from '../../stores/Order';
import { RefreshCw, Clock, ChefHat, CheckCircle, AlertCircle, Flame, X } from 'lucide-vue-next';
import { logger } from '../../utils/logger';

const deviceStore = useDeviceStore();
const sessionStore = useSessionStore();
const orderStore = useOrderStore();

const props = defineProps<{
  selectedPackage: Package | null;
  guestCount: number;
  cartItems: CartItem[];
  packageTotal: number;
  addOnsTotal: number;
  taxAmount: number;
  grandTotal: number;
  unlimitedItemCap?: number;
  isRefillMode?: boolean;
  hasPlacedOrder?: boolean;
  isCountingDown?: boolean;
  countdown?: number;
}>();

const emit = defineEmits<{
  'updateQuantity': [itemId: number, quantity: number];
  'removeItem': [itemId: number];
  'submitOrder': [];
  'setGuestCount': [count: number];
  'toggleRefillMode': [];
  'cancelCountdown': [];
}>();

// Submission readiness checks
const hasPackage = computed(() => Boolean(props.selectedPackage && (props.selectedPackage as any).id));
const hasCartItems = computed(() => Array.isArray(props.cartItems) && props.cartItems.length > 0 && props.cartItems.some((i: any) => Number(i.quantity) > 0));
const hasGuestCount = computed(() => Number(props.guestCount) >= 2);
const hasTableAssigned = computed(() => {
  const tableData = deviceStore.table?.value || deviceStore.table
  return Boolean(
    tableData
    && (
      (tableData as any).id || (tableData as any).id === 0
      || (tableData as any).name
    )
  )
});

const canSubmit = computed(() => {
  if (orderStore.isSubmitting) return false
  if (orderStore.hasPlacedOrder && !props.isRefillMode) return false
  if (props.isRefillMode) return hasCartItems.value && hasGuestCount.value && hasTableAssigned.value
  const packageSelected = hasPackage.value
  const packageHasValue = Number(props.packageTotal) > 0
  const addOnsPresent = hasCartItems.value
  return packageSelected && hasGuestCount.value && hasTableAssigned.value && (packageHasValue || addOnsPresent)
})

// Order status helpers
const orderStatus = computed(() => {
  const status = orderStore.getCurrentOrderStatus() || (orderStore.getCurrentOrder() as any)?.status
  return status?.toLowerCase() || 'pending'
})

const statusConfig = computed(() => {
  const configs: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    'pending': { label: 'Order Received', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20 border-yellow-500/30', icon: Clock },
    'confirmed': { label: 'Confirmed', color: 'text-blue-400', bgColor: 'bg-blue-500/20 border-blue-500/30', icon: CheckCircle },
    'preparing': { label: 'Preparing', color: 'text-orange-400', bgColor: 'bg-orange-500/20 border-orange-500/30', icon: ChefHat },
    'ready': { label: 'Ready to Serve', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30', icon: CheckCircle },
    'served': { label: 'Served', color: 'text-green-400', bgColor: 'bg-green-500/20 border-green-500/30', icon: CheckCircle },
    'completed': { label: 'Completed', color: 'text-gray-400', bgColor: 'bg-gray-500/20 border-gray-500/30', icon: CheckCircle },
    'cancelled': { label: 'Cancelled', color: 'text-red-400', bgColor: 'bg-red-500/20 border-red-500/30', icon: AlertCircle },
  }
  return configs[orderStatus.value] || configs['pending']
})

// Get ordered items from server response, fallback to submittedItems (local copy with names)
const orderedItems = computed(() => {
  const currentOrder = orderStore.getCurrentOrder() as any
  const order = currentOrder?.order || currentOrder
  const serverItems = order?.items || order?.order_items || []
  const submittedItems = ((orderStore.submittedItems as any)?.value ?? orderStore.submittedItems ?? []) as any[]

  // If server items exist and have any displayable name fields, use them
  if (serverItems.length > 0 && serverItems.some((it: any) => it?.name || it?.menu?.name || it?.menu_item?.name || it?.menu_name)) {
    console.log('[CartSidebar] Using server order_items:', serverItems.length)
    return serverItems
  }

  // Otherwise, use our locally stored submittedItems (which have names)
  if (submittedItems.length > 0) {
    console.log('[CartSidebar] Using submittedItems fallback:', submittedItems.length)
    return submittedItems
  }

  // Last resort: try to merge server items with names by mapping menu_id to local menu data
  console.log('[CartSidebar] No named items available, returning server items:', serverItems.length)
  return serverItems
})

// Get order totals from server response (used after order is placed)
const orderSubtotal = computed(() => {
  const currentOrder = orderStore.getCurrentOrder() as any
  const order = currentOrder?.order || currentOrder
  return Number(order?.subtotal || 0)
})

const orderTax = computed(() => {
  const currentOrder = orderStore.getCurrentOrder() as any
  const order = currentOrder?.order || currentOrder
  return Number(order?.tax || 0)
})

const orderTotal = computed(() => {
  const currentOrder = orderStore.getCurrentOrder() as any
  const order = currentOrder?.order || currentOrder
  return Number(order?.total || 0)
})

const orderGuestCount = computed(() => {
  const currentOrder = orderStore.getCurrentOrder() as any
  const order = currentOrder?.order || currentOrder
  return Number(order?.guest_count || props.guestCount)
})

const displayOrderId = computed(() => {
  const currentOrder = orderStore.getCurrentOrder() as any
  const order = currentOrder?.order || currentOrder
  return order?.order_id || order?.id || sessionStore.orderId || '-'
})

const updateQuantity = (itemId: number, quantity: number) => {
  emit('updateQuantity', itemId, quantity);
};

const removeItem = (itemId: number) => {
  emit('removeItem', itemId);
};

// Order status progress tracker
const trackerSteps = [
  { key: 'pending',   label: 'Received' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready',     label: 'Ready' },
  { key: 'served',    label: 'Served' },
] as const

const trackerOrder = ['pending', 'confirmed', 'preparing', 'ready', 'served']

const stepState = (key: string): 'completed' | 'active' | 'pending' => {
  const currentIdx = trackerOrder.indexOf(orderStatus.value)
  const stepIdx = trackerOrder.indexOf(key)
  if (currentIdx < 0 || stepIdx < 0) return 'pending'
  if (stepIdx < currentIdx) return 'completed'
  if (stepIdx === currentIdx) return 'active'
  return 'pending'
}

const submitOrder = () => {
  if (orderStore.isSubmitting) {
    logger.warn('CartSidebar submitOrder blocked: submission already in progress')
    return
  }
  if (!canSubmit.value) {
    logger.warn('CartSidebar submitOrder blocked: cannot submit in current state')
    return
  }
  logger.debug('CartSidebar submitOrder clicked')
  emit('submitOrder');
};
</script>

<template>
  <div
    class="w-80 flex-shrink-0 text-white bg-gradient-to-b from-[#1e1e1e] via-[#141414] to-black backdrop-blur-xl border-l-2 border-primary/40 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.6)] relative z-20">

    <!-- Summary Header with gradient -->
    <div
      class="sticky top-0 z-10 p-4 border-b border-primary/20 bg-gradient-to-r from-primary/20 to-primary-dark/20 backdrop-blur-lg">

      <!-- Refill Mode Banner -->
      <div v-if="isRefillMode" class="mb-3 bg-green-500/20 rounded-lg px-3 py-2 border border-green-500/30">
        <div class="flex items-center gap-2">
          <RefreshCw class="w-4 h-4 text-green-400" />
          <div>
            <p class="font-bold text-green-400 text-sm">Refill Order</p>
            <p class="text-[10px] text-green-300/80">Unlimited items only</p>
          </div>
        </div>
      </div>

      <!-- Package header (hide in refill mode) -->
      <template v-if="selectedPackage && !isRefillMode">
        <!-- Package name + Order ID pill -->
        <div class="flex items-start justify-between gap-2 mb-2.5">
          <div class="flex-1 min-w-0">
            <p class="text-primary font-bold text-base leading-tight truncate">{{ selectedPackage.name }}</p>
            <p v-if="selectedPackage.price" class="text-primary/55 text-[11px] mt-0.5">₱{{ selectedPackage.price }}/person</p>
          </div>
          <!-- Order ID — only shown once an actual ID exists -->
          <div v-if="orderStore.hasPlacedOrder && displayOrderId !== '-'"
            class="flex-shrink-0 bg-white/[0.07] rounded-lg px-2 py-1.5 border border-white/10 text-right">
            <p class="text-[9px] text-white/40 leading-none mb-0.5">Order</p>
            <p class="text-white text-xs font-bold leading-none">#{{ displayOrderId }}</p>
          </div>
        </div>

        <!-- Guest count control (pre-order) -->
        <div v-if="!orderStore.hasPlacedOrder"
          class="flex items-center justify-between bg-white/[0.06] rounded-xl px-3 py-2.5 border border-white/10">
          <span class="text-white/50 text-xs font-medium">Guests</span>
          <div class="flex items-center gap-3">
            <button
              @click="emit('setGuestCount', Math.max(2, guestCount - 1))"
              class="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold transition-colors bg-white/10 active:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
              :class="guestCount <= 2 ? 'text-white/20 cursor-not-allowed' : 'text-white'"
              :disabled="guestCount <= 2"
              aria-label="Decrease guests">−</button>
            <span class="text-white font-bold text-lg min-w-[2ch] text-center tabular-nums">{{ guestCount }}</span>
            <button
              @click="emit('setGuestCount', Math.min(20, guestCount + 1))"
              class="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold transition-colors bg-white/10 active:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white"
              :class="guestCount >= 20 ? 'text-white/20 cursor-not-allowed' : 'text-white'"
              :disabled="guestCount >= 20"
              aria-label="Increase guests">+</button>
          </div>
        </div>
        <!-- Post-order: show guest count as static info -->
        <div v-else class="flex items-center gap-1.5 text-white/40 text-xs">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2m6-6a3 3 0 100-6 3 3 0 000 6zm6 6v-2a3 3 0 00-3-3H9a3 3 0 00-3 3v2"/></svg>
          <span>{{ orderGuestCount }} guests</span>
        </div>
      </template>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">

      <!-- POST-ORDER: Show ordered items (read-only) -->
      <template v-if="orderStore.hasPlacedOrder && !isRefillMode">

        <!-- Order Status Progress Tracker -->
        <div class="order-status-tracker mb-1">
          <div class="tracker-header">
            <component :is="statusConfig.icon" class="w-4 h-4" :class="statusConfig.color" />
            <span class="text-xs font-bold uppercase tracking-wide" :class="statusConfig.color">{{ statusConfig.label }}</span>
          </div>
          <div class="tracker-steps" role="progressbar" :aria-label="`Order status: ${statusConfig.label}`">
            <template v-for="(step, index) in trackerSteps" :key="step.key">
              <!-- Step node -->
              <div class="tracker-step">
                <!-- Checkmark for completed, pulse circle for active, empty for future -->
                <div
                  :class="[
                    'tracker-dot',
                    stepState(step.key) === 'completed' ? 'tracker-dot--done' : '',
                    stepState(step.key) === 'active' ? 'tracker-dot--active' : '',
                    stepState(step.key) === 'pending' ? 'tracker-dot--pending' : '',
                  ]">
                  <!-- Completed: checkmark -->
                  <svg v-if="stepState(step.key) === 'completed'" class="w-2.5 h-2.5 text-secondary" fill="none" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <!-- Active: inner dot -->
                  <span v-else-if="stepState(step.key) === 'active'" class="tracker-pulse"></span>
                </div>
                <span class="tracker-label" :class="stepState(step.key) === 'pending' ? 'text-white/30' : 'text-white/80'">
                  {{ step.label }}
                </span>
              </div>
              <!-- Connector line (not after last step) -->
              <div v-if="index < trackerSteps.length - 1"
                class="tracker-line"
                :class="stepState(step.key) === 'completed' ? 'tracker-line--done' : ''"
              ></div>
            </template>
          </div>
        </div>

        <div v-if="orderedItems.length > 0">
          <h3 class="text-white font-semibold text-sm flex items-center gap-2 mb-3">
            <span>📋</span>
            <span>Your Order</span>
            <el-badge :value="orderedItems.length" class="badge-primary" />
          </h3>

          <div class="space-y-2">
            <div v-for="item in orderedItems" :key="item.id || item.menu_id || item.menu_item_id"
              class="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center gap-2">
              <NuxtImg
                v-if="item.img_url || item.image"
                :src="item.img_url || item.image"
                :alt="item.name || 'Order item'"
                class="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                loading="lazy"
                sizes="40px"
                format="webp"
              />
              <div v-else class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xs text-white/60">🍽️</div>
              <div class="flex-1 min-w-0">
                <p class="text-white font-medium text-xs truncate">{{ item.name || item.menu?.name || item.menu_item?.name || item.menu_name || 'Menu Item' }}</p>
                <p class="text-white/50 text-[10px]">Qty: {{ item.quantity }}</p>
              </div>
              <span v-if="item.price > 0" class="text-primary text-xs font-medium">{{ formatCurrency(item.price *
                item.quantity) }}</span>
              <span v-else class="text-green-400 text-[10px]">Unlimited</span>
            </div>
          </div>
        </div>

        <el-empty v-else description="Order details loading..." :image-size="60" class="py-6">
          <template #image>
            <div class="text-4xl animate-pulse">📋</div>
          </template>
        </el-empty>
      </template>

      <!-- PRE-ORDER or REFILL: Show cart items (editable) -->
      <template v-else>
        <div v-if="cartItems.length > 0">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-white font-semibold text-sm flex items-center gap-2">
              <span>{{ isRefillMode ? '🔄' : '➕' }}</span>
              <span>{{ isRefillMode ? 'Refill Items' : 'Add-ons' }}</span>
              <el-badge :value="cartItems.length" class="badge-primary" />
            </h3>
            <button @click="cartItems.forEach(item => $emit('removeItem', item.id))"
              class="text-[10px] text-red-400 hover:text-red-300 active:scale-95 transition-all px-3 py-2 min-h-[44px] rounded bg-red-500/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400">
              Clear All
            </button>
          </div>

          <div class="space-y-2">
            <cart-item-card v-for="item in cartItems" :key="item.id" :item="item" :unlimited-cap="unlimitedItemCap"
              @update-quantity="(qty) => updateQuantity(item.id, qty)" @remove="removeItem(item.id)" />
          </div>
        </div>

        <el-empty v-else :description="isRefillMode ? 'Add unlimited items for refill' : 'Browse the menu to add items'"
          :image-size="60" class="py-6">
          <template #image>
            <div class="text-4xl">{{ isRefillMode ? '🔄' : '🍽️' }}</div>
          </template>
        </el-empty>
      </template>

    </div>

    <!-- Footer -->
    <div
      class="sticky bottom-0 border-t border-primary/20 p-4 space-y-3 bg-gradient-to-t from-secondary via-secondary-dark to-transparent backdrop-blur-lg">

      <!-- Price Breakdown (only in normal mode) -->
      <div v-if="!isRefillMode" class="space-y-1 text-white text-sm">
        <!-- After order placed: use server response values -->
        <template v-if="orderStore.hasPlacedOrder && orderTotal > 0">
          <div class="flex justify-between text-white/60">
            <span>Subtotal</span>
            <span>{{ formatCurrency(orderSubtotal) }}</span>
          </div>

          <div v-if="orderTax > 0" class="flex justify-between text-white/60">
            <span>Tax</span>
            <span>{{ formatCurrency(orderTax) }}</span>
          </div>

          <div class="flex justify-between text-lg font-bold text-primary pt-2 border-t border-primary/30">
            <span>Total</span>
            <span class="tabular-nums">{{ formatCurrency(orderTotal) }}</span>
          </div>
        </template>

        <!-- Before order placed: use props (computed from cart) -->
        <template v-else>
          <div class="flex justify-between text-white/60">
            <span>Subtotal</span>
            <span>{{ formatCurrency(packageTotal + addOnsTotal) }}</span>
          </div>

          <div v-if="taxAmount > 0" class="flex justify-between text-white/60">
            <span>Tax ({{ selectedPackage?.tax?.percentage }}%)</span>
            <span>{{ formatCurrency(taxAmount) }}</span>
          </div>

          <div class="flex justify-between text-lg font-bold text-primary pt-2 border-t border-primary/30">
            <span>Total</span>
            <span class="tabular-nums">{{ formatCurrency(grandTotal) }}</span>
          </div>
        </template>
      </div>

      <!-- Refill mode summary -->
      <div v-else class="space-y-1 text-white text-sm">
        <div class="flex justify-between text-white/60">
          <span>Refill Items</span>
          <span class="text-success font-medium">{{ cartItems.length }} items</span>
        </div>
        <div class="flex justify-between text-lg font-bold text-success pt-2 border-t border-success/30">
          <span>Unlimited</span>
          <span>FREE</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-2">

        <!-- Inline countdown widget — replaces Place Order button while counting down -->
        <Transition name="count-swap" mode="out-in">
          <div v-if="isCountingDown && !orderStore.hasPlacedOrder"
            class="w-full rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 flex items-center justify-between gap-3"
            key="countdown">
            <div class="flex items-center gap-2.5">
              <div class="relative flex-shrink-0">
                <span class="text-3xl font-black text-primary tabular-nums leading-none">{{ countdown }}</span>
              </div>
              <div>
                <p class="text-white text-xs font-bold leading-none">Placing order</p>
                <p class="text-white/40 text-[10px] mt-0.5 leading-none">Tap cancel to stop</p>
              </div>
            </div>
            <button
              @click="emit('cancelCountdown')"
              class="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-red-500/20 text-white/70 hover:text-red-400 transition-colors text-xs font-semibold min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-red-400"
              aria-label="Cancel order countdown">
              <X :size="14" stroke-width="2.5" />
              Cancel
            </button>
          </div>

          <!-- Place Order Button (before order placed, not counting down) -->
          <button v-else-if="!orderStore.hasPlacedOrder"
            key="place-order"
            @click="submitOrder"
            :disabled="!canSubmit"
            :title="!canSubmit ? 'Select package, guests, and items to place order' : ''"
            :class="[
              'w-full py-3.5 rounded-xl font-bold text-base transition-all duration-150 shadow-lg min-h-[52px] flex items-center justify-center gap-2',
              canSubmit
                ? 'bg-gradient-to-r from-primary to-primary-dark text-secondary hover:shadow-2xl active:scale-[0.98]'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            ]"
            :aria-disabled="!canSubmit">
            <Flame :size="18" stroke-width="2" class="flex-shrink-0" />
            Place Order
          </button>

          <!-- Submit Refill Button (in refill mode) -->
          <button v-else-if="isRefillMode"
            key="submit-refill"
            @click="submitOrder"
            :disabled="!canSubmit"
            :title="!canSubmit ? 'Add items and confirm guest count for refill' : ''"
            :class="[
              'w-full py-3.5 rounded-xl font-bold text-base transition-all duration-150 shadow-lg min-h-[52px] flex items-center justify-center gap-2',
              canSubmit
                ? 'bg-gradient-to-r from-success to-success/80 text-secondary-dark hover:shadow-2xl active:scale-[0.98]'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            ]"
            :aria-disabled="!canSubmit">
            <RefreshCw :size="16" stroke-width="2.2" class="flex-shrink-0" />
            Submit Refill
          </button>

          <!-- Order Refill Button (after order placed, not in refill mode) -->
          <button v-else
            key="order-refill"
            @click="$emit('toggleRefillMode')"
            class="w-full py-3.5 rounded-xl font-bold text-base transition-all duration-150 shadow-lg min-h-[52px] flex items-center justify-center gap-2 bg-gradient-to-r from-success to-success/80 text-secondary-dark hover:shadow-2xl active:scale-[0.98]"
            aria-label="Switch to refill mode to order unlimited items">
            <RefreshCw :size="16" stroke-width="2.2" class="flex-shrink-0" />
            Order Refill
          </button>
        </Transition>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Count-swap transition for Place Order ↔ Countdown widget */
.count-swap-enter-active { transition: all 0.18s ease-out; }
.count-swap-leave-active { transition: all 0.12s ease-in; }
.count-swap-enter-from { opacity: 0; transform: translateY(6px) scale(0.97); }
.count-swap-leave-to   { opacity: 0; transform: translateY(-4px) scale(0.97); }

.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

:deep(.el-badge__content) {
  border: none;
}

.badge-primary :deep(.el-badge__content) {
  background: linear-gradient(135deg, #F6B56D, #C78B45) !important;
  color: #252525 !important;
  font-weight: bold;
}

.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* Order Status Progress Tracker */
.order-status-tracker {
  background: linear-gradient(135deg, rgba(246, 181, 109, 0.06) 0%, rgba(255,255,255,0.02) 100%);
  border: 1px solid rgba(246, 181, 109, 0.15);
  border-radius: 14px;
  padding: 10px 12px 12px;
}

.tracker-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.tracker-steps {
  display: flex;
  align-items: center;
  gap: 0;
}

.tracker-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.tracker-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tracker-dot--done {
  background: linear-gradient(135deg, #F6B56D 0%, #C78B45 100%);
  box-shadow: 0 2px 8px rgba(246, 181, 109, 0.4);
}

.tracker-dot--active {
  background: linear-gradient(135deg, #F6B56D 0%, #C78B45 100%);
  box-shadow: 0 0 0 4px rgba(246, 181, 109, 0.2);
  animation: tracker-glow 1.8s ease-in-out infinite;
}

.tracker-dot--pending {
  background: rgba(255, 255, 255, 0.08);
  border: 1.5px solid rgba(255, 255, 255, 0.12);
}

@keyframes tracker-glow {
  0%, 100% { box-shadow: 0 0 0 3px rgba(246, 181, 109, 0.2); }
  50%       { box-shadow: 0 0 0 6px rgba(246, 181, 109, 0.35); }
}

.tracker-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1a1a1a;
}

.tracker-label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: center;
  white-space: nowrap;
}

.tracker-line {
  flex: 1;
  height: 1.5px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 2px;
  margin-bottom: 14px; /* offset to align with dot center */
  transition: background 0.3s ease;
}

.tracker-line--done {
  background: linear-gradient(to right, #F6B56D, #C78B45);
}
</style>
