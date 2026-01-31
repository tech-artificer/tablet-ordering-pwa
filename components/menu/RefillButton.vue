<script setup lang="ts">
import { computed } from 'vue'
import Button from '../ui/Button.vue'

const props = defineProps<{
  hasPlacedOrder: boolean
  isRefillMode: boolean
}>()

const emit = defineEmits<{
  'toggleRefillMode': []
}>()

const buttonText = computed(() => {
  if (!props.hasPlacedOrder) return 'Place order first'
  return props.isRefillMode ? 'Back to Menu' : 'Order Refill'
})

const buttonIcon = computed(() => {
  return props.isRefillMode ? '⬅️' : '🔄'
})
</script>

<template>
  <Button
    :class="[
      'refill-button',
      isRefillMode && 'active',
      !hasPlacedOrder && 'disabled'
    ]"
    :disabled="!hasPlacedOrder"
    aria-label="Toggle refill mode"
    @click="emit('toggleRefillMode')"
  >
    <span class="refill-icon">{{ buttonIcon }}</span>
    <span class="refill-text">{{ buttonText }}</span>

    <!-- Shine effect -->
    <div v-if="hasPlacedOrder && !isRefillMode" class="shine" />
  </Button>
</template>

<style scoped>
.refill-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 12px;
  font-family: 'Kanit', sans-serif;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
}

.refill-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow:
    0 6px 20px rgba(16, 185, 129, 0.4),
    0 3px 10px rgba(0, 0, 0, 0.15);
}

.refill-button:active:not(:disabled) {
  transform: translateY(0) scale(0.98);
}

.refill-button.active {
  background: #252525;
  box-shadow: 0 4px 12px rgba(37, 37, 37, 0.3);
}

.refill-button.disabled {
  background: #6b7280;
  cursor: not-allowed;
  opacity: 0.6;
}

.refill-icon {
  font-size: 20px;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.refill-button:hover:not(:disabled) .refill-icon {
  transform: rotate(180deg);
}

.refill-button.active .refill-icon {
  transform: translateX(-4px);
}

.refill-text {
  position: relative;
  z-index: 1;
}

/* Shine animation */
.shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
      transparent,
      rgba(255, 255, 255, 0.3),
      transparent);
  animation: shine 3s infinite;
}

@keyframes shine {
  0% {
    left: -100%;
  }

  20%,
  100% {
    left: 100%;
  }
}
</style>
