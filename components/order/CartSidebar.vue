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
  return hasPackage.value && hasGuestCount.value && hasTableAssigned.value
})

// Order status helpers
const orderStatus = computed(() => {
  const status = orderStore.getCurrentOrderStatus() || (orderStore.getCurrentOrder() as any)?.status
  return status?.toLowerCase() || 'pending'
})

const statusConfig = computed(() => {
  const configs: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
    'pending':   { label: 'Order Received', color: 'text-warning',      bgColor: 'bg-warning/20 border-warning/30',      icon: Clock },
    'confirmed': { label: 'Confirmed',      color: 'text-primary/80',   bgColor: 'bg-primary/10 border-primary/20',      icon: CheckCircle },
    'preparing': { label: 'Preparing',      color: 'text-primary',      bgColor: 'bg-primary/20 border-primary/30',      icon: ChefHat },
    'ready':     { label: 'Ready to Serve', color: 'text-success',      bgColor: 'bg-success/20 border-success/30',      icon: CheckCircle },
    'served':    { label: 'Served',         color: 'text-success',      bgColor: 'bg-success/20 border-success/30',      icon: CheckCircle },
    'completed': { label: 'Completed',      color: 'text-white/40',     bgColor: 'bg-white/5 border-white/10',           icon: CheckCircle },
    'cancelled': { label: 'Cancelled',      color: 'text-error',        bgColor: 'bg-error/20 border-error/30',          icon: AlertCircle },
    'voided':    { label: 'Voided',         color: 'text-error',        bgColor: 'bg-error/20 border-error/30',          icon: AlertCircle },
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
    logger.debug('[CartSidebar] Using server order_items:', serverItems.length)
    return serverItems
  }

  // Otherwise, use our locally stored submittedItems (which have names)
  if (submittedItems.length > 0) {
    logger.debug('[CartSidebar] Using submittedItems fallback:', submittedItems.length)
    return submittedItems
  }

  // Last resort: try to merge server items with names by mapping menu_id to local menu data
  logger.debug('[CartSidebar] No named items available, returning server items:', serverItems.length)
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

const displayedGuestCount = computed(() => {
  return orderStore.hasPlacedOrder ? orderGuestCount.value : Number(props.guestCount)
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
    class="w-80 flex-shrink-0 text-white bg-[#111111] border-l border-white/[0.07] flex flex-col shadow-[-8px_0_32px_rgba(0,0,0,0.5)] relative z-20">

    <!-- ─── Summary Header ──────────────────────────────────── -->
    <div class="px-5 pt-5 pb-3 border-b border-white/[0.07]">
      <!-- Label -->
      <p class="text-white/30 text-[10px] font-black uppercase tracking-[0.2em] mb-3">Order Summary</p>

      <!-- Refill Mode Banner -->
      <div v-if="isRefillMode" class="mb-3 bg-success/15 rounded-xl px-3 py-2.5 border border-success/25">
        <div class="flex items-center gap-2">
          <RefreshCw class="w-4 h-4 text-success flex-shrink-0" />
          <div>
            <p class="font-bold text-success text-sm leading-none">Refill Order</p>
            <p class="text-[10px] text-success/70 mt-0.5">Unlimited items only</p>
          </div>
        </div>
      </div>
      <!-- Guests row -->
      <div class="flex items-center justify-between py-2">
        <span class="text-white/60 text-sm font-medium">Guests</span>
        <!-- Editable stepper before order is placed; read-only after -->
        <div v-if="!hasPlacedOrder" class="flex items-center gap-1.5">
          <button
            class="w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold transition-colors
                   bg-white/[0.08] border border-white/10 text-white/60
                   hover:bg-white/15 hover:text-white active:scale-90
                   disabled:opacity-30 disabled:cursor-not-allowed
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/40"
            :disabled="guestCount <= 2"
            aria-label="Decrease guest count"
            @click="emit('setGuestCount', guestCount - 1)"
          >−</button>
          <span class="text-white font-bold text-base tabular-nums min-w-[1.5ch] text-center">{{ displayedGuestCount }}</span>
          <button
            class="w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold transition-colors
                   bg-primary/15 border border-primary/30 text-primary
                   hover:bg-primary/25 active:scale-90
                   disabled:opacity-30 disabled:cursor-not-allowed
                   focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/50"
            :disabled="guestCount >= 20"
            aria-label="Increase guest count"
            @click="emit('setGuestCount', guestCount + 1)"
          >+</button>
        </div>
        <span v-else class="text-white font-bold text-base tabular-nums">{{ displayedGuestCount }}</span>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">

      <!-- POST-ORDER: Show ordered items (read-only) -->
      <template v-if="orderStore.hasPlacedOrder && !isRefillMode">

        <!-- Order Status Badge -->
        <div
          :class="['rounded-xl border px-3 py-2.5 mb-1 flex items-center justify-between gap-2', statusConfig.bgColor]"
          role="status"
          :aria-label="`Order status: ${statusConfig.label}`"
        >
          <div class="flex items-center gap-2">
            <component :is="statusConfig.icon" class="w-4 h-4 flex-shrink-0" :class="statusConfig.color" />
            <span class="text-xs font-bold uppercase tracking-widest" :class="statusConfig.color">
              {{ statusConfig.label }}
            </span>
          </div>
          <span v-if="displayOrderId !== '-'" class="text-[10px] font-mono text-white/40 tabular-nums">
            #{{ displayOrderId }}
          </span>
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
          <!-- Clear all -->
          <div class="flex items-center justify-between mb-3">
            <span class="text-white/30 text-[10px] font-bold uppercase tracking-widest">
              {{ isRefillMode ? 'Refill Items' : 'Items' }}
            </span>
            <button
              @click="cartItems.forEach(item => $emit('removeItem', item.id))"
              class="text-[10px] text-error/70 hover:text-error transition-colors active:scale-95 px-2 py-1 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-error/60">
              Clear All
            </button>
          </div>

          <!-- Reference-style item rows -->
          <div class="divide-y divide-white/[0.05]">
            <div
              v-for="item in cartItems"
              :key="item.id"
              class="py-3 first:pt-0 last:pb-0">
              <!-- Name + price/badge row -->
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex-1 min-w-0">
                  <p class="text-white font-semibold text-[13px] leading-snug truncate">{{ item.name }}</p>
                  <p class="text-white/35 text-[10px] uppercase tracking-wide mt-0.5">
                    {{ (item as any).category || (item as any).group || 'ITEM' }}
                    <template v-if="item.isUnlimited"> · Unlimited</template>
                  </p>
                </div>
                <span
                  class="flex-shrink-0 text-[10px] font-bold mt-0.5"
                  :class="item.price > 0 ? 'text-primary' : 'text-white/40'">
                  {{ item.price > 0 ? formatCurrency(item.price) : 'Included' }}
                </span>
              </div>
              <!-- Stepper row -->
              <div class="flex items-center gap-2">
                <button
                  class="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base transition-all
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
                  :class="item.quantity <= 1
                    ? 'bg-error/15 text-error border border-error/30 hover:bg-error/25 focus-visible:outline-error/50'
                    : 'bg-white/[0.08] text-white/70 border border-white/10 hover:bg-white/15 focus-visible:outline-white/40'"
                  @click="item.quantity <= 1 ? removeItem(item.id) : updateQuantity(item.id, item.quantity - 1)"
                  :aria-label="item.quantity <= 1 ? 'Remove item' : 'Decrease quantity'">
                  <span v-if="item.quantity <= 1" class="text-xs">×</span>
                  <span v-else>−</span>
                </button>
                <span class="text-white font-bold text-sm min-w-[2ch] text-center tabular-nums select-none">
                  {{ item.quantity }}
                </span>
                <button
                  class="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base transition-all
                         bg-white/[0.08] text-white/70 border border-white/10 hover:bg-white/15
                         disabled:opacity-30 disabled:cursor-not-allowed
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-white/40"
                  @click="updateQuantity(item.id, item.quantity + 1)"
                  :disabled="item.isUnlimited && item.quantity >= (unlimitedItemCap || 5)"
                  aria-label="Increase quantity">
                  +
                </button>
              </div>
            </div>
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

</style>
