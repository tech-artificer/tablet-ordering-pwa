<script setup lang="ts">
import { useOrderStore } from '../../stores/order';
import type { CartItem, MenuItem } from '../../types';
import { formatCurrency } from '../../utils/formats';

const { addToCart, getCartItemQuantity, cartItems, updateQuantity } = useOrderStore()

const props = defineProps<{
    item: MenuItem
}>()

// Increase/decrease for a specific item
const increase = (item: CartItem) => {
    updateQuantity(item.id, getCartItemQuantity(item.id) + 1)
}

const decrease = (item: CartItem) => {
    const current = getCartItemQuantity(item.id)
    if (current > 0) {
        updateQuantity(item.id, current - 1)
    }
}
</script>

<template>
  <div class="text-white rounded-xl transition-shadow relative flex flex-col">
    <!-- Image -->
    <CommonImage
      :src="props.item.img_url"
      :alt="props.item.name"
      class="w-full h-36 object-fit rounded-t-lg"
    />

    <!-- Card Content -->
    <div class="flex flex-col justify-between p-3 w-full h-full">
      <!-- Top Content -->
      <div class="">
        

        <h3 class="font-semibold text-gray-200">
          {{ props.item.name }}
        </h3>

        <span class="text-gray-400 text-sm">
          {{ props.item.group }}
        </span>

      </div>

      <div class="flex flex-row flex-wrap justify-between items-center">
         <p class="text-lg font-semibold text-accent self-end">
          ₱ {{ formatCurrency(props.item.price) }}
        </p>

        <el-button
            type="primary"
            class="w-fit self-end bg-accent"
            @click="addToCart(props.item)"
        >
            Add
        </el-button>
      </div>
      
    </div>
  </div>
</template>

