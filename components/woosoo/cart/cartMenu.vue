<template>
    <div class="w-full bg-white relative flex flex-col h-full !scroll-smooth">
        <!-- Header Section - Fixed -->
        <div class="flex gap-2 justify-between py-6 px-4 border-b border-gray-200 bg-white">
            <h2 class="text-lg font-medium">Order Details</h2>
        </div>

        <!-- Cart Items - Scrollable Middle Section -->
        <div
            class="flex-1 overflow-y-auto px-4 min-h-0"
        >
            <div>
                <div
                    v-for="item, index in cartStore.cartItems"
                    :key="index"
                    class="flex items-center gap-3 border-b border-gray-100 last:border-b-0"
                    :class="index === 0 ? '' : 'py-2'"
                >
                    <CommonImage
                        v-if="index > 0"
                        :src="item.img_url"
                        :alt="item.name"
                        :style-class="'w-12 h-12 rounded-lg object-cover flex-shrink-0'"
                    />
                    <div
                        class="flex-1 min-w-0"
                        :class="index === 0 ? 'border-b border-gray-300 pb-2' : ''"
                    >
                        <h4
                            class="font-medium text-gray-800 truncate"
                            :class="index === 0 ? 'text-lg font-bold' : 'text-sm font-normal'"
                        >
                            {{ item.name }}
                        </h4>
                        <p class="text-sm text-gray-500 line-clamp-1">{{ item.description }}</p>
                        <div class="flex items-center justify-between mt-2">
                            <div class="flex items-center space-x-2">
                                <button
                                    v-if="index > 0 && !cartStore.isLocked"
                                    class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                                    @click="updateQuantity(index, item.id, item.quantity - 1)"
                                >
                                    <svg v-if="index > 0" class="w-4 h-4 text-red-500 hover:text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    <p v-else>-</p>
                                </button>
                                <svg
                                    v-if="index === 0"
                                    class="w-4 h-4 text-red-500 hover:text-red-700"
                                    xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="256" height="256" viewBox="0 0 256 256" xml:space="preserve">
                                    <g style="stroke: none; stroke-width: 0; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: none; fill-rule: nonzero; opacity: 1;" transform="translate(1.4065934065934016 1.4065934065934016) scale(2.81 2.81)">
                                        <path d="M 45 49.519 L 45 49.519 c -7.68 0 -13.964 -6.284 -13.964 -13.964 v -5.008 c 0 -7.68 6.284 -13.964 13.964 -13.964 h 0 c 7.68 0 13.964 6.284 13.964 13.964 v 5.008 C 58.964 43.236 52.68 49.519 45 49.519 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
                                        <path d="M 52.863 51.438 c -2.362 1.223 -5.032 1.927 -7.863 1.927 s -5.501 -0.704 -7.863 -1.927 C 26.58 53.014 18.414 62.175 18.414 73.152 v 14.444 c 0 1.322 1.082 2.403 2.403 2.403 h 48.364 c 1.322 0 2.403 -1.082 2.403 -2.403 V 73.152 C 71.586 62.175 63.42 53.014 52.863 51.438 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
                                        <path d="M 71.277 34.854 c -2.362 1.223 -5.032 1.927 -7.863 1.927 c -0.004 0 -0.007 0 -0.011 0 c -0.294 4.412 -2.134 8.401 -4.995 11.43 c 10.355 3.681 17.678 13.649 17.678 24.941 v 0.263 h 11.511 c 1.322 0 2.404 -1.082 2.404 -2.404 V 56.568 C 90 45.59 81.834 36.429 71.277 34.854 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
                                        <path d="M 63.414 0 c -7.242 0 -13.237 5.589 -13.898 12.667 c 8 2.023 13.947 9.261 13.947 17.881 v 2.385 c 7.657 -0.027 13.914 -6.298 13.914 -13.961 v -5.008 C 77.378 6.284 71.094 0 63.414 0 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
                                        <path d="M 13.915 73.152 c 0 -11.292 7.322 -21.261 17.677 -24.941 c -2.861 -3.029 -4.702 -7.019 -4.995 -11.43 c -0.004 0 -0.007 0 -0.011 0 c -2.831 0 -5.5 -0.704 -7.863 -1.927 C 8.166 36.429 0 45.59 0 56.568 v 14.444 c 0 1.322 1.082 2.404 2.404 2.404 h 11.511 V 73.152 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
                                        <path d="M 26.536 32.932 v -2.385 c 0 -8.62 5.946 -15.858 13.947 -17.881 C 39.823 5.589 33.828 0 26.586 0 c -7.68 0 -13.964 6.284 -13.964 13.964 v 5.008 C 12.622 26.635 18.879 32.905 26.536 32.932 z" style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-linejoin: miter; stroke-miterlimit: 10; fill: rgb(0,0,0); fill-rule: nonzero; opacity: 1;" transform=" matrix(1 0 0 1 0 0) " stroke-linecap="round"/>
                                    </g>
                                </svg>
                                <span class="text-sm font-medium w-4 text-center">{{ item.quantity }}</span>
                                <button
                                    v-if="index > 0 && !cartStore.isLocked"
                                    class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center hover:bg-orange-600 transition-colors"
                                    @click="updateQuantity(index, item.id, item.quantity + 1)"
                                >
                                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </button>
                            </div>
                            <div class="text-right">
                                <span class="font-medium text-gray-800">₱{{ cartStore.formatPrice(item.price * item.quantity) }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Empty Cart State -->
            <div v-if="!cartStore.hasCartItems" class="flex flex-col items-center justify-center py-12 text-center">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5M17 13v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6" />
                    </svg>
                </div>
                <p class="text-gray-500 font-medium">Your cart is empty</p>
                <p class="text-sm text-gray-400 mt-1">Add items from the menu to get started</p>
            </div>
        </div>

        <!-- Fixed Bottom Section - Order Summary & Checkout -->
        <div v-if="cartStore.hasCartItems" class="bg-white border-t border-gray-200 p-4 mt-auto">

            <!-- Price Breakdown -->
            <div class="space-y-2 mb-4">
                <div class="flex justify-between text-gray-600">
                    <span>Sub Total</span>
                    <span>₱{{ cartStore.formatPrice(cartStore.subTotal) }}</span>
                </div>
                <div class="flex justify-between text-gray-600">
                    <span>VAT (12%)</span>
                    <span>₱{{ cartStore.formatPrice(cartStore.vat) }}</span>
                </div>
                <div class="border-t border-gray-200 pt-2 mt-2">
                    <div class="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>₱{{ cartStore.formatPrice(cartStore.total) }}</span>
                    </div>
                </div>
            </div>

            <!-- Place Order Button -->
            <button
                v-show="!cartStore.isLocked"
                class="w-full py-3 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                :disabled="cartStore.isLocked"
                @click="confirmOrder"
            >
                {{ cartStore.isLocked ? 'Processing...' : 'Review Order' }}
            </button>
        </div>
    </div>

    <!-- Modals remain the same -->
    <el-dialog
        v-model="isCartModalShow"
        title="Confirmation & Summary"
        align-center
        width="400"
    >
        <div>
            <div class="mb-6 text-center">
                <div class="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <CommonLogo />
                </div>
                <h3 class="text-xl font-semibold mb-2">Confirm Your Order</h3>
                <p class="text-gray-600">Please review your order details before confirming</p>
            </div>
            <div
                v-for="item in cartStore.cartItems"
                :key="item.id"
                class="flex justify-between items-center px-3 rounded-lg border-b border-gray-100 last:border-b-0"
            >
                <div class="flex items-center gap-3">
                    <CommonImage
                        :src="item.img_url"
                        :alt="item.name"
                        :style-class="'w-8 h-8 rounded-lg object-cover'"
                    />
                    <div>
                        <h4 class="font-medium">{{ item.name }}</h4>
                        <p v-show="item.description" class="text-sm text-gray-500">{{ item.description }}</p>
                    </div>
                </div>
                <div class="text-right">
                    <span class="font-medium">₱{{ cartStore.formatPrice(item.price * item.quantity) }}</span>
                    <p class="text-xs text-gray-500">{{ item.quantity }}x ₱{{ cartStore.formatPrice(item.price) }}</p>
                </div>
            </div>
            <div class="bg-gray-50 p-3 rounded-lg mt-4">
                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span>Items ({{ cartStore.totalItems }})</span>
                        <span>₱{{ cartStore.formatPrice(cartStore.subTotal) }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span>VAT (12%)</span>
                        <span>₱{{ cartStore.formatPrice(cartStore.vat) }}</span>
                    </div>
                    <div class="flex justify-between font-bold text-lg border-t pt-2">
                        <span>Total Amount</span>
                        <span>₱{{ cartStore.formatPrice(cartStore.total) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-between">
                <el-button @click="closeCartModal">
                    Cancel
                </el-button>
                <el-button
                    type="primary"
                    :loading="cartStore.isLoading"
                    @click="placeOrder"
                >
                    Confirm Order
                </el-button>
            </div>
        </template>
    </el-dialog>

    <!-- Success Modal with Auto-Close -->
    <el-dialog
        v-model="isSuccessModalShow"
        align-center
        width="400"
        :show-close="false"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
    >
        <div class="text-center">
            <div class="mb-6">
                <div class="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <CommonLogo />
                </div>
                <h3 class="text-2xl font-bold text-green-600 mb-2">Order Placed Successfully!</h3>
                <p class="text-gray-600 mb-4">Thank you for your order. We've received your request and will process it shortly.</p>
                <div v-if="orderNumber" class="bg-green-50 p-3 rounded-lg mb-4">
                    <p class="text-sm text-green-700">
                        <strong>Order Number:</strong> {{ orderNumber }}
                    </p>
                    <p class="text-sm text-green-700">Any details here. under development</p>
                    <p class="text-sm text-green-700">
                        <strong>Total Amount:</strong> ₱{{ cartStore.formatPrice(orderTotal) }}
                    </p>
                </div>
                <p class="text-sm text-gray-500">You will receive a confirmation email shortly.</p>
                <div v-if="autoCloseCountdown > 0" class="mt-4 p-2 bg-blue-50 rounded-lg">
                    <p class="text-sm text-green-600">
                        Close automatically in {{ autoCloseCountdown }} seconds
                    </p>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-center">
                <el-button
                    type="primary"
                    @click="closeSuccessModal"
                >
                    Continue
                </el-button>
            </div>
        </template>
    </el-dialog>

    <!-- Error Modal -->
    <el-dialog
        v-model="isErrorModalShow"
        align-center
        width="400"
        :show-close="false"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
    >
        <div class="text-center">
            <div class="mb-6">
                <div class="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <CommonLogo />
                </div>
                <h3 class="text-2xl font-bold text-red-600 mb-2">Order Failed</h3>
                <p class="text-gray-600 mb-4">We're sorry, but there was an issue processing your order.</p>
                <div class="bg-red-50 p-3 rounded-lg mb-4">
                    <p class="text-sm text-red-700">
                        <strong>Error:</strong> {{ errorMessage }}
                    </p>
                </div>
                <p class="text-sm text-gray-500">Please try again or contact support if the problem persists.</p>
            </div>
        </div>

        <template #footer>
            <div class="flex justify-center gap-3">
                <el-button @click="closeErrorModal">
                    Cancel
                </el-button>
                <el-button
                    type="primary"
                    @click="retryOrder"
                >
                    Try Again
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup>
import { useCartStore } from '@/stores/Cart'
import { useGuestStore } from '@/stores/Guest'
import { useOrderStore } from '@/stores/Order'
import { useMyDeviceStore } from '@/stores/Device'

const deviceStore = useMyDeviceStore()
const cartStore = useCartStore()
const guestStore = useGuestStore()
const orderStore = useOrderStore()

const isCartModalShow = ref(false)
const isSuccessModalShow = ref(false)
const isErrorModalShow = ref(false)
const orderNumber = ref('')
const orderTotal = ref(0)
const errorMessage = ref('')
const autoCloseCountdown = ref(0)
const autoCloseTimer = ref(null)

const updateQuantity = (index, itemId, newQuantity) => {
    if (newQuantity <= 0 && index === 0) {
        cartStore.updateQuantity(itemId, 1)
    } else if (newQuantity <= 0) {
        removeFromCart(itemId)
    } else {
        cartStore.updateQuantity(itemId, newQuantity)
    }
}

const removeFromCart = (itemId) => {
    cartStore.removeFromCart(itemId)
}

const startAutoCloseTimer = () => {
    autoCloseCountdown.value = 10

    autoCloseTimer.value = setInterval(() => {
        autoCloseCountdown.value--

        if (autoCloseCountdown.value <= 0) {
            clearInterval(autoCloseTimer.value)
            autoCloseTimer.value = null
            closeSuccessModal()
        }
    }, 1000)
}

const clearAutoCloseTimer = () => {
    if (autoCloseTimer.value) {
        clearInterval(autoCloseTimer.value)
        autoCloseTimer.value = null
    }
    autoCloseCountdown.value = 0
}

const placeOrder = async () => {
    try {
        orderTotal.value = cartStore.total
        cartStore.orderParams.guest_count = guestStore.count
        cartStore.orderParams.subtotal = cartStore.subTotal
        cartStore.orderParams.discount = 0
        cartStore.orderParams.tax = cartStore.vat || 0
        cartStore.orderParams.table_id = deviceStore.device.device.table_id
        cartStore.orderParams.items = cartStore.cartItems
         cartStore.orderParams.total = cartStore.total
        cartStore.orderParams.total_amount = cartStore.total

        console.log('orderParams', cartStore.orderParams)   
        await cartStore.confirmOrder(cartStore.orderParams)
        isCartModalShow.value = false
        if ( cartStore.isLocked ) {
            isSuccessModalShow.value = true
            orderStore.orders.push(cartStore.order)
            orderStore.current_order = cartStore.order
            orderNumber.value = orderStore.current_order.order_number
            startAutoCloseTimer()
        }
    } catch (error) {
        console.error('Error placing order:', error)
        errorMessage.value = cartStore.errorMessage || 'An unexpected error occurred while processing your order.'
        isCartModalShow.value = false
        isErrorModalShow.value = true
    }
}

const confirmOrder = () => {
    isCartModalShow.value = true
}

const closeCartModal = () => {
    isCartModalShow.value = false
}

const closeSuccessModal = () => {
    clearAutoCloseTimer()
    isSuccessModalShow.value = false
    orderNumber.value = ''
    orderTotal.value = 0
}

const closeErrorModal = () => {
    isErrorModalShow.value = false
    errorMessage.value = ''
}

const retryOrder = () => {
    isErrorModalShow.value = false
    errorMessage.value = ''
    isCartModalShow.value = true
}

watch(isSuccessModalShow, (newValue) => {
    if (!newValue) {
        clearAutoCloseTimer()
    }
})

onUnmounted(() => {
    clearAutoCloseTimer()
})
</script>

<style scoped>
/* Custom scrollbar styling */
.overflow-y-auto::-webkit-scrollbar {
    width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
}

/* Line clamp utility for text truncation */
.line-clamp-1 {
    display: -webkit-box;
    line-clamp:1;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
