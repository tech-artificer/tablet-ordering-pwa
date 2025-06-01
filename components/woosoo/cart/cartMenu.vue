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
                        <!-- Quantity Controls -->
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

                        <!-- Delete Button - Only show if quantity > 1 -->
                        <button
                            v-if="item.quantity > 1"
                            class="text-red-500 hover:text-red-700 text-sm font-medium"
                            @click="decreaseQuantity(item.id)"
                        >
                            Delete
                        </button>

                        <!-- Remove Button - Always visible -->
                        <button
                            class="text-gray-500 hover:text-gray-700 text-sm font-medium ml-2"
                            @click="removeFromCart(item.id)"
                        >
                            Remove
                        </button>
                    </div>
                </div>
                <div class="text-right">
                    <span class="font-medium">₱{{ formatPrice(item.price * item.quantity) }}</span>
                    <p class="text-xs text-gray-500">{{ item.quantity }}x</p>
                </div>
            </div>
        </div>

        <!-- Empty Cart Message -->
        <div v-if="!cartStore.hasCartItems" class="text-center py-8 text-gray-500">
            Your cart is empty
        </div>

        <!-- Order Total -->
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

        <!-- Place Order Button -->
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

// Computed properties for totals
const subTotal = computed(() => {
    return cartStore.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
})

const tax = computed(() => {
    return Math.round(subTotal.value * 0.12) // 12% tax
})

const total = computed(() => {
    return subTotal.value + tax.value
})

// Utility function to format price
const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-PH', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(price)
}

// Handle quantity updates
const updateQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
        removeFromCart(itemId)
    } else {
        cartStore.updateQuantity(itemId, newQuantity)
    }
}

// Decrease quantity by 1 (for delete button)
const decreaseQuantity = (itemId: number) => {
    const item = cartStore.cartItems.find(item => item.id === itemId)
    if (item && item.quantity > 1) {
        cartStore.updateQuantity(itemId, item.quantity - 1)
    }
}

// Remove item completely from cart
const removeFromCart = (itemId: number) => {
    cartStore.removeFromCart(itemId)
}

// Place order
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
