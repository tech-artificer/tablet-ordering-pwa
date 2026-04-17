<template>
  <div class="fixed right-6 top-16 w-1/3 h-[70%] bg-panel rounded-2xl p-4 shadow-xl z-50">
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl text-primary font-bold">Cart</h3>
      <FlameButton variant="secondary" @click="$emit('close')">Close</FlameButton>
    </div>

    <div class="space-y-3 overflow-auto h-[calc(100%-140px)] pr-2 text-white">
      <div v-for="(item, idx) in cart" :key="idx" class="flex justify-between items-center p-3 bg-transparent rounded-lg">
        <div>
          <div class="font-semibold">{{ item.name }}</div>
          <div class="text-sm text-gray-400">x{{ item.quantity }}</div>
        </div>
        <div class="text-lg font-bold">{{ item.price }}</div>
      </div>
    </div>

    <div class="mt-4">
      <FlameButton @click="sendOrder" :disabled="orderStore.isSubmitting || (orderStore.hasPlacedOrder && !orderStore.isRefillMode)">
        <template v-if="orderStore.isSubmitting">Sending...</template>
        <template v-else-if="orderStore.hasPlacedOrder && !orderStore.isRefillMode">Order Placed</template>
        <template v-else>Send Order</template>
      </FlameButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOrderStore } from '../../stores/Order'
import { useApi } from '../../composables/useApi'
import { logger } from '../../utils/logger'

const orderStore = useOrderStore()
const cart = computed(() => (((orderStore.cartItems as any)?.value ?? orderStore.cartItems ?? []) as any[]))
const emit = defineEmits(['close', 'sent'])

const api = useApi()
const sendOrder = async () => {
  if (orderStore.hasPlacedOrder && !orderStore.isRefillMode) return
  try {
    const res = await orderStore.submitOrder()
    emit('sent', res)
  } catch (err) {
    logger.error(err)
    // optionally surface toast here
  }
}
</script>
