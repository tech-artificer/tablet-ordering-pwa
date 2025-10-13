<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { Plus, Minus, X } from 'lucide-vue-next'
import { useCartStore } from '@/stores/Cart'
import { storeToRefs } from 'pinia'
import { useOrderStore } from '~/stores/Order'
import { formatCurrency } from '~/utils/formats'
import type { CartItem } from '~/types'
import OrderItems from '~/components/Order/OrderItems.vue'

const orderStore = useOrderStore()
const cart = useCartStore()
const { cartItems, subtotal, total, vat } = storeToRefs(cart)

// Place Order Button
const loading = ref(false)
const countDown = ref(0)
const orderConfirmation = ref(false)
const orderPlaced = computed(() => orderStore.hasOrder )
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
  <div class="py-2 px-3  shadow-sm flex flex-col h-full font-inter">
    <h3 class="text-xl flex items-center font-normal mb-2">Order #: {{ orderStore.current.order_id }} </h3>

    <div class="border-t ">
       
      <h3 class="text-md font-bold block font-sans pt-2 truncate">{{ cart.packageSelected.name }}</h3>
       
      <div class="flex flex-row justify-between py-2">
        
        <div class="flex items-center">
            <button 
              class="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              @click="decrease(cart.packageSelected)"
              disabled
            >
              <Minus />
            </button>
            <span class="font-medium min-w-10 text-center">{{ getQuantity(cart.packageSelected) }} </span>
            <button
            disabled
              class="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              @click="increase(cart.packageSelected)">

              <Plus />
            </button>

          </div>

       
          <h3 class="text-lg font-medium flex justify-end h-full flex-row cart.packageSelecteds-center">
            {{ formatCurrency(cart.packageSelected.price * cart.guestCount) }}
          </h3>
        </div>


      
    </div>

    <OrderItems class="overflow-y-auto" />

    <div class="border-t space-y-1">
      <div class="flex justify-between  font-light py-2">
        <span>Subtotal</span>
        <span>{{ formatCurrency(subtotal) }}</span>
      </div>
      <div class="flex justify-between font-light text-gray-600">
        <span>Tax(12%)</span>
        <span>{{ formatCurrency(vat) }}</span>
      </div>
      <div class="flex justify-between text-xl font-semibold py-2 border-t-2 align-self-end">
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
