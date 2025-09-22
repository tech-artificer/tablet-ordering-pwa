<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { Plus, Minus, X } from 'lucide-vue-next'
import { useCartStore } from '@/stores/Cart'
import { storeToRefs } from 'pinia'
import { useOrderStore } from '~/stores/Order'
import { formatCurrency } from '~/utils/formats'
import type { CartItem } from '~/types'

const orderStore = useOrderStore()
const cart = useCartStore()
const { cartItems, subtotal, total, vat } = storeToRefs(cart)

// Place Order Button
const loading = ref(false)
const countDown = ref(0)
const orderConfirmation = ref(false)
const orderPlaced = ref(false)
let timer: ReturnType<typeof setInterval> | null = null


function startCountdownAndRequest() {

  orderConfirmation.value = true
  loading.value = true
  // onPlaceOrder(true)
  countDown.value = 5

  timer = setInterval(() => {
    countDown.value--
    if (countDown.value <= 0) {
      clearInterval(timer!)
      timer = null

      if( !orderConfirmation.value ) {
        // modifyOrder.value = false
        // orderConfirmation.value = false
        return
      }

      // make the request
      placeOrder()
    }
  }, 1000)

}
const placeOrder = async () => {

  try {

    await cart.placeOrder()
    loading.value = false
    orderConfirmation.value = false
    orderPlaced.value = true

  } catch (error) {
    console.error('❌ Order failed:', error)

  } finally {

    if (orderStore.current.order_id) {
      loading.value = false

    }
    // onPlaceOrder(true)
  }
}

const getQuantity = (item: CartItem) => {
  return cartItems.value.find(i => i.id === item.id)?.quantity ?? 0
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

const modifyOrder = () => {
  orderConfirmation.value = false
  loading.value = false
}

onMounted(() => {

  if (cart.cartItems.length === 0) {
    cart.add(cart.packageSelected)
  }

})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

</script>

<template>
  <div class="p-4 bg-white rounded-xl shadow-sm flex flex-col h-full">
    <h3 class="text-xl flex items-center font-normal mb-2">Order #: {{ orderStore.current.order_id }} </h3>

    <div class="flex-1 overflow-y-auto border-t pt-2 space-y-4">

      <div v-for="item in cartItems" :key="item.id" class="flex flex-row gap-1 justify-between place-items-end">
        <!-- <img :src="item.img_url" class="w-16 h-16 object-cover rounded-lg" /> -->
        <div class="flex flex-col justify-between gap-1">
          <!-- <div class="flex flex-col"> -->
          <h3 class="text-lg font-medium truncate" v-if="item.id == cart.packageSelected.id">{{ item.name }} </h3>
          <h3 class="truncate" v-else>{{ item.name }} </h3>
          <div class="flex flex-row items-center" v-if="item.id == cart.packageSelected.id">{{ item.price }}
            <X class="h-3" /> {{ item.quantity }}
          </div>

          <!-- </div> -->

          <div class="flex items-center" v-if="item.id !== cart.packageSelected.id">
            <button v-if="!orderPlaced"
              class="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              @click="decrease(item)">
              <Minus />
            </button>
            <span class="font-medium min-w-10 text-center">{{ getQuantity(item) }} </span>
            <button v-if="!orderPlaced"
              class="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              @click="increase(item)">

              <Plus />
            </button>

          </div>
        </div>

        <div class="flex flex-col h-full">
          <h3 class="text-lg font-medium flex justify-end h-full flex-row items-center">
            {{ formatCurrency(item.price * item.quantity) }}
          </h3>
        </div>


      </div>
    </div>

    <div class="mt-4 border-t border-b py-4 space-y-2">
      <div class="flex justify-between text-lg font-light">
        <span>Subtotal</span>
        <span>{{ formatCurrency(subtotal) }}</span>
      </div>
      <div class="flex justify-between text-lg font-light text-gray-600">
        <span>Tax(12%)</span>
        <span>{{ formatCurrency(vat) }}</span>
      </div>
      <div class="flex justify-between text-xl font-semibold">
        <span>Total</span>
        <span>{{ formatCurrency(total) }}</span>
      </div>
    </div>

    <el-button v-if="!orderPlaced" type="primary" size="large" class="mt-4 w-full" :loading="loading"
      :disabled="loading || cartItems.length === 0" @click="startCountdownAndRequest">
      <span v-if="!loading">Place Order</span>
      <span v-else>Placing Order...</span>
    </el-button>
  </div>


  <el-drawer v-model="orderConfirmation" :title="countDown > 0 ? 'Order Confirmation' : 'Order Placed'" size="40%"
    :with-header="true">

    
    <div class="flex flex-col justify-center items-center">

      <OrderConfirmation v-if="orderConfirmation" />

      <el-button v-if="countDown > 0" type="danger" size="large" class="mt-4" @click="modifyOrder">
          
        <span>Modify ({{ countDown }})</span>
      </el-button>

  
    
      <!-- <div v-if="countDown > 0"> {{ countDown  }} </div> -->
    </div>
  </el-drawer>


  <!-- <el-drawer 
      v-model="orderStore.drawerOpen"
      title="Order Confirmed"
      size="40%"
      :with-header="true"
    >
      <div v-if="orderStore.current">
        <h2 class="text-xl font-bold mb-2">
          Order #{{ orderStore.current.order_number }}
        </h2>
        <p>Status: {{ orderStore.current.status }}</p>
        <p>Table: {{ orderStore.current }}</p>

      
        <pre class="bg-gray-100 p-2 rounded text-sm mt-4">
          {{ orderStore.current.order }}
        </pre>
      </div>
    </el-drawer>  -->


</template>
