<script setup lang="ts">
import { computed } from 'vue'
import { ElDrawer, ElBadge, ElButton, ElDivider } from 'element-plus'
import { formatCurrency } from '../../utils/formats'
import type { PropType } from 'vue'
import { useDeviceStore } from '../../stores/Device'
import { useSessionStore } from '../../stores/Session'

const deviceStore = useDeviceStore()
const sessionStore = useSessionStore()

const props = defineProps({
  modelValue: { type: Boolean as PropType<boolean>, required: true },
  selectedPackage: { type: Object as PropType<any>, default: null },
  guestCount: { type: Number as PropType<number>, default: 1 },
  cartItems: { type: Array as PropType<any[]>, default: () => [] },
  packageTotal: { type: Number as PropType<number>, default: 0 },
  addOnsTotal: { type: Number as PropType<number>, default: 0 },
  taxAmount: { type: Number as PropType<number>, default: 0 },
  grandTotal: { type: Number as PropType<number>, default: 0 },
  isCountingDown: { type: Boolean as PropType<boolean>, default: false },
  countdown: { type: Number as PropType<number>, default: 0 },
  placeOrderError: { type: String as PropType<string | null>, default: null },
  isSubmitting: { type: Boolean as PropType<boolean>, default: false },
  isRefillMode: { type: Boolean as PropType<boolean>, default: false }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'modify', 'retry', 'request-support'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

function close() {
  emit('update:modelValue', false)
}

function onConfirm() {
  emit('confirm')
}

function onCancel() {
  emit('cancel')
}

function onModify() {
  emit('modify')
}

function onRetry() {
  emit('retry')
}

function onRequestSupport() {
  emit('request-support')
}
</script>

<template>
  <el-drawer 
    v-model="visible" 
    :title="isRefillMode ? '🔄 Confirm Refill Order' : '🔥 Confirm Order'" 
    size="28rem" 
    direction="rtl"
    :with-header="true"
  >
    <div class="h-full flex flex-col items-center justify-center text-white bg-gradient-to-b from-secondary via-secondary-dark to-black p-6">
      
      <!-- Countdown Mode -->
      <div v-if="isCountingDown" class="text-center space-y-6">
        <div class="relative">
          <div class="text-9xl font-bold text-primary animate-pulse-scale">{{ countdown }}</div>
          <div class="absolute inset-0 blur-3xl bg-primary/30 animate-pulse"></div>
        </div>
        <p class="text-xl text-white/90 font-medium">
          Order will be placed in {{ countdown }}...
        </p>
        <p class="text-sm text-white/60">Cancel now to stop, or modify your order.</p>
        <div class="flex gap-4 justify-center mt-8">
          <button
            @click="onCancel"
            class="px-8 py-4 min-h-[44px] rounded-xl font-bold text-lg transition-all bg-red-500/20 text-red-400 border-2 border-red-500/30 hover:bg-red-500/30 active:scale-95 shadow-lg hover:shadow-red-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
          >
            ✕ Cancel
          </button>
          <button
            @click="onModify"
            class="px-8 py-4 min-h-[44px] rounded-xl font-bold text-lg transition-all bg-yellow-500/20 text-yellow-400 border-2 border-yellow-500/30 hover:bg-yellow-500/30 active:scale-95 shadow-lg hover:shadow-yellow-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-400"
          >
            ✎ Review Order
          </button>
        </div>
      </div>

      <!-- Confirmation Mode (fallback if not counting down) -->
      <div v-else class="w-full space-y-6">
        
        <!-- Total Amount - Large Display -->
        <div class="text-center space-y-4 py-8">
          <p class="text-lg text-white/70">Order Total</p>
          <div class="text-6xl font-bold bg-gradient-to-r from-primary to-primary-dark bg-clip-text text-transparent">
            {{ formatCurrency(grandTotal) }}
          </div>
          <div class="flex items-center justify-center gap-6 text-sm text-white/60">
            <div v-if="!isRefillMode && packageTotal > 0">
              <span class="text-white/40">Package:</span> {{ formatCurrency(packageTotal) }}
            </div>
            <div v-if="addOnsTotal > 0">
              <span class="text-white/40">{{ isRefillMode ? 'Refill' : 'Add-ons' }}:</span> {{ formatCurrency(addOnsTotal) }}
            </div>
            <div v-if="taxAmount > 0 && !isRefillMode">
              <span class="text-white/40">Tax:</span> {{ formatCurrency(taxAmount) }}
            </div>
          </div>
          <div v-if="!isRefillMode" class="text-white/50">
            {{ selectedPackage?.name }} × {{ guestCount }} {{ guestCount > 1 ? 'guests' : 'guest' }}
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="placeOrderError" class="bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-3 space-y-3">
          <p class="text-red-400 text-sm">{{ placeOrderError }}</p>
          <div class="flex flex-wrap gap-3">
            <button
              @click="onRetry"
                class="px-4 py-2 min-h-[44px] rounded-lg font-semibold bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Retry Order
            </button>
            <button
              @click="onRequestSupport"
                class="px-4 py-2 min-h-[44px] rounded-lg font-semibold bg-white/10 text-white border border-white/20 hover:bg-white/20 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Request Staff
            </button>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-4 mt-8">
          <button
            @click="onConfirm"
            :disabled="isSubmitting"
            class="flex-1 py-5 min-h-[56px] rounded-xl font-bold text-xl transition-all duration-300 shadow-lg bg-gradient-to-r from-primary to-primary-dark text-white hover:shadow-2xl active:scale-95 hover:from-primary-dark hover:to-primary disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {{ isRefillMode ? '🔄 Confirm Refill' : '🔥 Confirm Order' }}
          </button>
          <button
            @click="onCancel"
            class="px-8 py-5 min-h-[56px] rounded-xl font-bold text-xl transition-all duration-300 bg-white/10 text-white hover:bg-white/20 active:scale-95 border-2 border-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Cancel
          </button>
        </div>
      </div>

    </div>
  </el-drawer>
</template>

<style scoped>
/* Drawer background - make entire drawer dark */
:deep(.el-drawer) {
  background: linear-gradient(to bottom, #1a1a1a, #0a0a0a) !important;
  --el-drawer-bg-color: #0a0a0a !important;
}

:deep(.el-drawer__body) {
  padding: 0;
  background: linear-gradient(to bottom, #1a1a1a, #0a0a0a) !important;
}

:deep(.el-drawer__header) {
  background: linear-gradient(135deg, #F6B56D, #C78B45) !important;
  color: #252525;
  border-bottom: 1px solid rgba(246, 181, 109, 0.2);
  padding: 1.5rem;
  margin-bottom: 0;
}

:deep(.el-drawer__title) {
  color: #252525 !important;
  font-weight: bold;
  font-size: 1.25rem;
}

:deep(.el-drawer__close-btn) {
  color: #252525 !important;
  font-size: 1.5rem;
}

:deep(.el-drawer__close-btn:hover) {
  color: #000 !important;
}

/* Scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Badge styling */
.badge-primary :deep(.el-badge__content) {
  background: linear-gradient(135deg, #F6B56D, #C78B45) !important;
  color: #252525 !important;
  font-weight: bold;
  border: none;
}

/* Divider */
:deep(.el-divider) {
  background-color: rgba(246, 181, 109, 0.3);
}

/* Tabular nums for consistent spacing */
.tabular-nums {
  font-variant-numeric: tabular-nums;
}

/* Animation */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-scale {
  0%, 100% { 
    transform: scale(1);
    opacity: 1;
  }
  50% { 
    transform: scale(1.05);
    opacity: 0.9;
  }
}

.animate-pulse-scale {
  animation: pulse-scale 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
