<script setup lang="ts">
import { formatCurrency } from '../../utils/formats';
import { computed } from 'vue';
import type { Package, CartItem } from '../../types';
import { ElBadge, ElEmpty } from 'element-plus';
import CartItemCard from '../menu/CartItemCard.vue';
import { useDeviceStore } from '../../stores/Device';
import { useSessionStore } from '../../stores/Session';
import { useOrderStore } from '../../stores/Order';
import { RefreshCw, Clock, ChefHat, CheckCircle, AlertCircle } from 'lucide-vue-next';

const deviceStore = useDeviceStore();
const sessionStore = useSessionStore();
const orderStore = useOrderStore();

// Submission readiness checks
const hasPackage = computed(() => Boolean(props.selectedPackage && (props.selectedPackage as any).id));
const hasCartItems = computed(() => Array.isArray(props.cartItems) && props.cartItems.length > 0 && props.cartItems.some((i: any) => Number(i.quantity) > 0));
const hasGuestCount = computed(() => Number(props.guestCount) >= 2);
const hasTableAssigned = computed(() => {
  const tableData = deviceStore.table?.value || deviceStore.table
  return Boolean(tableData && ((tableData as any).id || (tableData as any).id === 0))
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
  const status = orderStore.currentOrder?.order?.status || orderStore.currentOrder?.status
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
  const order = orderStore.currentOrder?.order || orderStore.currentOrder
  const serverItems = order?.items || order?.order_items || []

  // If server items exist and have names, use them
  if (serverItems.length > 0 && serverItems[0]?.name) {
    console.log('[CartSidebar] Using server order_items:', serverItems.length)
    return serverItems
  }

  // Otherwise, use our locally stored submittedItems (which have names)
  if (orderStore.submittedItems && orderStore.submittedItems.length > 0) {
    console.log('[CartSidebar] Using submittedItems fallback:', orderStore.submittedItems.length)
    return orderStore.submittedItems
  }

  // Last resort: try to merge server items with names by mapping menu_id to local menu data
  console.log('[CartSidebar] No named items available, returning server items:', serverItems.length)
  return serverItems
})

// Get order totals from server response (used after order is placed)
const orderSubtotal = computed(() => {
  const order = orderStore.currentOrder?.order || orderStore.currentOrder
  return Number(order?.subtotal || 0)
})

const orderTax = computed(() => {
  const order = orderStore.currentOrder?.order || orderStore.currentOrder
  return Number(order?.tax || 0)
})

const orderTotal = computed(() => {
  const order = orderStore.currentOrder?.order || orderStore.currentOrder
  return Number(order?.total || 0)
})

const orderGuestCount = computed(() => {
  const order = orderStore.currentOrder?.order || orderStore.currentOrder
  return Number(order?.guest_count || props.guestCount)
})

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
}>();

const emit = defineEmits<{
  'updateQuantity': [itemId: number, quantity: number];
  'removeItem': [itemId: number];
  'submitOrder': [];
  'setGuestCount': [count: number];
  'toggleRefillMode': [];
}>();

const updateQuantity = (itemId: number, quantity: number) => {
  emit('updateQuantity', itemId, quantity);
};

const removeItem = (itemId: number) => {
  emit('removeItem', itemId);
};

import { logger } from '../../utils/logger'

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
    class="w-80 text-white bg-gradient-to-b from-secondary via-secondary-dark to-black backdrop-blur-xl border-l border-primary/20 flex flex-col shadow-2xl">

    <!-- Summary Header with gradient -->
    <div
      class="sticky top-0 z-10 p-4 border-b border-primary/20 bg-gradient-to-r from-primary/20 to-primary-dark/20 backdrop-blur-lg">

      <!-- Refill Mode Banner -->
      <div v-if="isRefillMode" class="mb-3 bg-green-500/20 rounded-lg px-3 py-2 border border-green-500/30">
        <div class="flex items-center gap-2">
          <RefreshCw class="w-5 h-5 text-green-400" />
          <div>
            <p class="font-bold text-green-400 text-sm">Refill Order</p>
            <p class="text-[10px] text-green-300/80">Unlimited items only</p>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-between mb-2 gap-2">
        <div class="flex-1 bg-primary/20 rounded-lg px-2.5 py-1.5 border border-primary/30">
          <span class="text-[10px] text-primary/70 block">Table</span>
          <span class="text-lg font-bold text-primary">{{ deviceStore.tableName || '-' }}</span>
        </div>
        <div class="flex-1 bg-white/5 rounded-lg px-2.5 py-1.5 border border-white/10">
          <span class="text-[10px] text-white/50 block">Order ID</span>
          <span class="text-base font-bold text-white">{{ orderStore.currentOrder?.order?.order_id ||
            orderStore.currentOrder?.order?.id || sessionStore.orderId || '-' }}</span>
        </div>
      </div>

      <!-- Package info (hide in refill mode) -->
      <div v-if="selectedPackage && !isRefillMode"
        class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5 border border-white/10">
        <span class="text-primary font-semibold text-sm">{{ selectedPackage.name }}</span>
        <div v-if="!orderStore.hasPlacedOrder" class="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1">
          <button @click="emit('setGuestCount', Math.max(2, guestCount - 1))"
            class="touch-btn-circle !min-w-[44px] !min-h-[44px] w-11 h-11 text-white font-bold bg-white/10 active:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            :disabled="guestCount <= 2">−</button>
          <span class="text-white font-semibold min-w-[2ch] text-center text-sm">{{ guestCount }}</span>
          <button @click="emit('setGuestCount', Math.min(20, guestCount + 1))"
            class="touch-btn-circle !min-w-[44px] !min-h-[44px] w-11 h-11 text-white font-bold bg-white/10 active:bg-white/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            :disabled="guestCount >= 20">+</button>
          <span class="text-white/70 text-[10px] ml-0.5">Guests</span>
        </div>
        <div v-else class="text-white/60 text-sm">{{ orderGuestCount }} guests</div>
      </div>
    </div>

    <!-- Content Area -->
    <div class="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">

      <!-- POST-ORDER: Show ordered items (read-only) -->
      <template v-if="orderStore.hasPlacedOrder && !isRefillMode">
        <div v-if="orderedItems.length > 0">
          <h3 class="text-white font-semibold text-sm flex items-center gap-2 mb-3">
            <span>📋</span>
            <span>Your Order</span>
            <el-badge :value="orderedItems.length" class="badge-primary" />
          </h3>

          <div class="space-y-2">
            <div v-for="item in orderedItems" :key="item.id || item.menu_item_id"
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
                <p class="text-white font-medium text-xs truncate">{{ item.name || item.menu_item?.name }}</p>
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
          <div class="flex justify-between text-gray-300">
            <span>Subtotal</span>
            <span>{{ formatCurrency(orderSubtotal) }}</span>
          </div>

          <div v-if="orderTax > 0" class="flex justify-between text-gray-300">
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
          <div class="flex justify-between text-gray-300">
            <span>Subtotal</span>
            <span>{{ formatCurrency(packageTotal + addOnsTotal) }}</span>
          </div>

          <div v-if="taxAmount > 0" class="flex justify-between text-gray-300">
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
        <div class="flex justify-between text-gray-300">
          <span>Refill Items</span>
          <span class="text-green-400 font-medium">{{ cartItems.length }} items</span>
        </div>
        <div class="flex justify-between text-lg font-bold text-green-400 pt-2 border-t border-green-500/30">
          <span>Unlimited</span>
          <span>FREE</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="space-y-2">
        <!-- Place Order Button (before order placed) -->
        <el-tooltip v-if="!orderStore.hasPlacedOrder"
          :content="!canSubmit ? 'Select package, guests, and items to place order' : ''" :show-arrow="true"
          placement="top">
          <button @click="submitOrder" :disabled="!canSubmit" :class="[
            'w-full py-3.5 rounded-xl font-bold text-base transition-all duration-150 shadow-lg min-h-[52px]',
            canSubmit
              ? 'bg-gradient-to-r from-primary to-primary-dark text-secondary hover:shadow-2xl active:scale-[0.98]'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
          ]" :aria-disabled="!canSubmit">
            🔥 Place Order
          </button>
        </el-tooltip>

        <!-- Submit Refill Button (in refill mode) -->
        <el-tooltip v-else-if="isRefillMode" :content="!canSubmit ? 'Add items and confirm guest count for refill' : ''"
          :show-arrow="true" placement="top">
          <button @click="submitOrder" :disabled="!canSubmit" :class="[
            'w-full py-3.5 rounded-xl font-bold text-base transition-all duration-150 shadow-lg min-h-[52px]',
            canSubmit
              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-2xl active:scale-[0.98]'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
          ]" :aria-disabled="!canSubmit">
            🔄 Submit Refill
          </button>
        </el-tooltip>

        <!-- Order Refill Button (after order placed, not in refill mode) -->
        <el-tooltip v-else content="Add unlimited refill items (Meats & Sides only)" :show-arrow="true" placement="top">
          <button @click="$emit('toggleRefillMode')"
            class="w-full py-3.5 rounded-xl font-bold text-base transition-all duration-150 shadow-lg min-h-[52px] bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-2xl active:scale-[0.98]"
            aria-label="Switch to refill mode to order unlimited items">
            🔄 Order Refill
          </button>
        </el-tooltip>
      </div>
    </div>

  </div>
</template>

<style scoped>
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
