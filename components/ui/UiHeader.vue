<script setup lang="ts">
import { computed } from 'vue'
import { useOrderStore } from '../../stores/order'
import { ShoppingBasket } from 'lucide-vue-next'
const orderStore = useOrderStore()
const cartCount = computed(() => orderStore.cartItems.reduce((s,i)=>s+(i.quantity||1),0))
const emit = defineEmits(['open-cart'])
const openCart = () => emit('open-cart')
</script>


<template>
  <div class="flex items-center justify-between p-4 bg-secondary">
    <div class="flex items-center gap-4">
      <WoosooLogo />
      <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-white flex items-center justify-center text-black font-bold">K</div>
      <div>
        <div class="text-sm text-gray-100">Table</div>
        <div class="text-lg font-bold">4</div>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <el-badge :value="cartCount" class="cursor-pointer">
        <el-button circle class="bg-panel ui-hover-lift"  @click="openCart"><ShoppingBasket /></el-button>
      </el-badge>
      <!-- <UiFlameButton @click="openCart">Cart</UiFlameButton> -->
    </div>
  </div>
</template>