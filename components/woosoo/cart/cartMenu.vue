<template>
    <div class="w-80 bg-white shadow-lg p-6">
        <h2 class="text-xl mb-6">Order summary</h2>

        <!-- Cart Items -->
        <div class="space-y-4 mb-6">
            <div
                v-for="item in cartStore.cartItems"
                :key="item.id"
                class="flex items-center space-x-3"
            >
                <img
                    :src="item.image"
                    :alt="item.name"
                    class="w-16 h-16 rounded-lg object-cover"
                >
                <div class="flex-1">
                    <h4 class="font-medium">{{ item.name }}</h4>
                    <p class="text-sm text-gray-500">{{ item.description }}</p>
                    <div class="flex items-center justify-between mt-2">
                        <div class="flex items-center space-x-1">
                            <button
                                class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                                @click="updateQuantity(item.id, item.quantity - 1)"
                            >
                                -
                            </button>
                            <span class="text-sm font-medium w-8 text-center">{{ item.quantity }}</span>
                            <button
                                class="w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-600"
                                @click="updateQuantity(item.id, item.quantity + 1)"
                            >
                                +
                            </button>
                        </div>

                        <button
                            v-if="item.quantity > 1"
                            class="text-red-500 hover:text-red-700 text-sm font-medium"
                            @click="decreaseQuantity(item.id)"
                        >
                            <svg class="w-5 h-5 text-red-500 hover:text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                        <!-- <button
                            class="text-gray-500 hover:text-gray-700 text-sm font-medium ml-2"
                            @click="removeFromCart(item.id)"
                        >
                            <svg class="w-5 h-5 text-gray-500 hover:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button> -->
                    </div>
                </div>
                <div class="text-right">
                    <span class="font-medium">₱{{ formatPrice(item.price * item.quantity) }}</span>
                    <p class="text-xs text-gray-500">{{ item.quantity }}x</p>
                </div>
            </div>
        </div>

        <div v-if="!cartStore.hasCartItems" class="text-center py-8 text-gray-500">
            Your cart is empty
        </div>

        <div v-if="cartStore.hasCartItems" class="border-t pt-4 space-y-2">
            <div class="flex justify-between text-gray-600">
                <span>Sub Total</span>
                <span>₱{{ formatPrice(subTotal) }}</span>
            </div>
            <div class="flex justify-between text-gray-600">
                <span>Tax</span>
                <span>₱{{ formatPrice(tax) }}</span>
            </div>
            <div class="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total</span>
                <span>₱{{ formatPrice(total) }}</span>
            </div>
        </div>

        <button
            v-if="cartStore.hasCartItems"
            class="w-full mt-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="cartStore.isLoading"
            @click="placeOrder"
        >
            {{ cartStore.isLoading ? 'Processing...' : 'Place Order' }}
        </button>
    </div>
</template>

<script setup lang="ts">
const cartStore = useCartStore()

const subTotal = computed(() => {
    return cartStore.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const tax = computed(() => {
    return Math.round(subTotal.value * 0.12)
})

const total = computed(() => {
    return subTotal.value + tax.value
})

const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(price)
}

const updateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
        newQuantity = 1
        // removeFromCart(itemId)
    } else {
        cartStore.updateQuantity(itemId, newQuantity)
    }
}

const decreaseQuantity = (itemId: number) => {
    const item = cartStore.cartItems.find(item => item.id === itemId)
    if (item && item.quantity > 1) {
        cartStore.updateQuantity(itemId, item.quantity - 1)
    }
}

const removeFromCart = (itemId: number) => {
    cartStore.removeFromCart(itemId)
}
const placeOrder = async () => {
    try {
        cartStore.isLoading = true

        // const orderData = {
        //     items: cartStore.cartItems,
        //     subTotal: subTotal.value,
        //     tax: tax.value,
        //     total: total.value
        // }

        // const { data } = await $fetch('/api/orders', {
        //   method: 'POST',
        //   body: orderData
        // })

        await new Promise(resolve => setTimeout(resolve, 1000))
        cartStore.clearCart()

        // await navigateTo('/order-success')

    } catch (error) {
        console.error('Error placing order:', error)
    } finally {
        cartStore.isLoading = false
    }
}
</script>
