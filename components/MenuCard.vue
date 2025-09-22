<script setup lang="ts">
import { useCartStore } from '~/stores/Cart';
import type { CartItem } from '~/types';

const cart = useCartStore()



const props = defineProps<{
    item: CartItem
}>()

const addToCart = () => {
    cart.add(props.item)
}

const getQuantity = (item: CartItem) => {
    return cart.cartItems.find(i => i.id === item.id)?.quantity ?? 0
}

// Increase/decrease for a specific item
const increase = (item: CartItem) => {
    cart.updateQuantity(item.id, getQuantity(item) + 1)
}

const decrease = (item: CartItem) => {
    const current = getQuantity(item)
    if (current > 0) {
        cart.updateQuantity(item.id, current - 1)
    }
}
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden relative flex flex-col">
    <!-- Image -->
    <CommonImage
      :src="props.item.img_url"
      :alt="props.item.name"
      class="w-full h-48 object-cover rounded-t-lg"
    />

    <!-- Card Content -->
    <div class="flex flex-col justify-between flex-1 p-4">
      <!-- Top Content -->
      <div class="">
        

        <h3 class="font-semibold text-gray-900">
          {{ props.item.name }}
        </h3>

        <span class="text-gray-500 text-sm">
          {{ props.item.group }}
        </span>

       
      </div>

      <div class="flex flex-row flex-wrap justify-between items-center">
         <p class="text-lg font-semibold text-accent self-end">
          ₱ {{ formatCurrency(props.item.price) }}
        </p>

        <el-button
            type="primary"
            class="mt-4 w-fit self-end"
            @click="addToCart()"
        >
            Add
        </el-button>
      </div>
      
    </div>
  </div>
</template>

