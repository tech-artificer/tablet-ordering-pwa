<!--
  Order Placed Badge Component
  
  Displays a prominent badge when an order has been placed,
  indicating that the user is now in refill-only mode.
-->

<script setup lang="ts">
import { computed } from 'vue'
import { useOrderStore } from '~/stores/Order'

const orderStore = useOrderStore()

const isVisible = computed(() => orderStore.hasPlacedOrder)
</script>

<template>
    <Transition name="fade">
        <div v-if="isVisible"
            class="fixed top-4 right-4 z-40 bg-gradient-to-r from-orange-500 to-orange-600 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-3 border border-orange-400"
            :aria-label="'Order placed. Refill mode only.'">
            <span class="text-2xl animate-bounce">✅</span>
            <div>
                <p class="font-bold text-sm">Order Confirmed</p>
                <p class="text-xs text-orange-100">Refill Mode Active</p>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
    transform: translateY(-10px);
}

@keyframes bounce {

    0%,
    100% {
        transform: translateY(0);
    }

    50% {
        transform: translateY(-4px);
    }
}

.animate-bounce {
    animation: bounce 2s infinite;
}
</style>
