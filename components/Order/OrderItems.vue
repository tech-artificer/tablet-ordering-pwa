<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { Plus, Minus, X } from 'lucide-vue-next'
import { useCartStore } from '@/stores/Cart'
import { storeToRefs } from 'pinia'
import { useOrderStore } from '~/stores/Order'
import { formatCurrency } from '~/utils/formats'
import type { CartItem } from '~/types'
import order from '~/middleware/order'

const orderStore = useOrderStore()
const cart = useCartStore()
const { cartItems, subtotal, total, vat } = storeToRefs(cart)

// Place Order Button
const loading = ref(false)
const countDown = ref(0)
const orderConfirmation = ref(false)
const orderPlaced = computed(() => orderStore.hasOrder)
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

            if (!orderConfirmation.value) {
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

    <div class="h-full min-w-screen font-inter bg-gray-50 p-2 flex flex-col">

        <div v-for="item in cartItems.filter((i: number | any) => i.id !== cart.packageSelected.id)" :key="item.id"
            class="flex flex-col gap-1 justify-between">

            <div class="flex flex-row justify-between p-1">
                <h3 class="text-lg font-normal block truncate w-full">{{ item.name }} </h3>
                <h3 class="text-lg font-medium flex justify-end h-full flex-row items-center">
                    {{ formatCurrency(item.price * item.quantity) }}
                </h3>
            </div>
            <div class="flex flex-row justify-between p-1">
                <div class="flex items-center">
                    <button
                        class="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        @click="decrease(item)" :disabled="orderPlaced">
                        <Minus />
                    </button>
                    <span class="font-medium min-w-10 text-center">{{ getQuantity(item) }} </span>
                    <button :disabled="orderPlaced"
                        class="w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        @click="increase(item)">

                        <Plus />
                    </button>

                </div>


                <h3 class="flex justify-end h-full flex-row items-center">
                    {{ formatCurrency(item.price) }}
                </h3>
            </div>


        </div>
    </div>

</template>
