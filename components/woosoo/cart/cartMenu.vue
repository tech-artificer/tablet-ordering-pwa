<template>
    <div class="w-full bg-white py-6 p-2 relative pb-2 !scroll-smooth">
        <div class="flex gap-2 justify-between">
            <h2 class="text-lg mb-6 font-medium ml-4">Order summary</h2>
        </div>

        <!-- Cart Items -->
        <div class="space-y-2 px-2 mb-4 max-h-[390px] min-h-[390px] overflow-y-auto">
            <div
                v-for="item in cartStore.cartItems"
                :key="item.id"
                class="flex items-center"
            >
                <CommonImage
                    :src="item.img_url"
                    :alt="item.name"
                    :style-class="'w-8 h-8 rounded-lg object-cover mr-8'"
                />
                <div class="flex-1">
                    <h4 class="font-normal text-sm">{{ item.name }}</h4>
                    <p class="text-sm text-gray-500">{{ item.description }}</p>
                    <div class="flex items-center justify-between mt-2">
                        <div class="flex items-center space-x-1">
                            <button
                                class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                                @click="updateQuantity(item.id, item.quantity - 1)"
                            >
                                <svg class="w-5 h-5 text-red-500 hover:text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                            <span class="text-sm font-medium w-8 text-center">{{ item.quantity }}</span>
                            <button
                                class="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center hover:bg-orange-600"
                                @click="updateQuantity(item.id, item.quantity + 1)"
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <span class="font-medium">₱{{ cartStore.formatPrice(item.price * item.quantity) }}</span>
                    <p class="text-xs text-gray-500">{{ item.quantity }}x</p>
                </div>
            </div>
        </div>

        <div v-if="!cartStore.hasCartItems" class="text-center py-8 text-gray-500">
            Your cart is empty
        </div>

        <!-- Sticky Bottom Section for Totals -->
        <div v-if="cartStore.hasCartItems" class="bg-white p-4 w-full z-10">
            <div class="space-y-2">
                <div class="flex justify-between text-gray-600">
                    <span>Sub Total</span>
                    <span>₱{{ cartStore.formatPrice(cartStore.subTotal) }}</span>
                </div>
                <div class="flex justify-between text-gray-600">
                    <span>VAT (12%)</span>
                    <span>₱{{ cartStore.formatPrice(cartStore.vat) }}</span>
                </div>
                <div class="flex justify-between font-bold text-lg pt-2">
                    <span>Total</span>
                    <span>₱{{ cartStore.formatPrice(cartStore.total) }}</span>
                </div>

                <button
                    class="w-full mt-4 py-3 bg-primary text-white rounded-lg hover:bg-orange-600 transition-colors font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="cartStore.isLoading"
                    @click="confirmOrder"
                >
                    {{ cartStore.isLoading ? 'Processing...' : 'Review Order' }}
                </button>
            </div>
        </div>
    </div>

    <el-dialog
        v-model="isCartModalShow"
        title="Confirmation & Summary"
        align-center
        width="400"
    >
        <div>
            <div class="mb-6 text-center">
                <div class="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <CommonImage
                        src="/logo/logo2.png"
                        alt="logo"
                        :class="'w-20 h-20'"
                    />
                </div>
                <h3 class="text-xl font-semibold mb-2">Confirm Your Order</h3>
                <p class="text-gray-600">Please review your order details before confirming</p>
            </div>
            <div
                v-for="item in cartStore.cartItems"
                :key="item.id"
                class="flex justify-start px-2 rounded-lg"
            >
                <div class="flex flex-col justify-center">
                    <CommonImage
                        :src="item.img_url"
                        :alt="item.name"
                        :style-class="'w-8 h-8 rounded-lg object-cover'"
                    />
                </div>
                <div class="flex flex-col justify-center">
                    <h4 class="font-medium">{{ item.name }}</h4>
                    <p v-show="item.description" class="text-sm text-gray-500">{{ item.description }}</p>
                </div>
                <div class="text-right flex-1">
                    <span class="font-medium">₱{{ cartStore.formatPrice(item.price * item.quantity) }}</span>
                    <p class="text-xs text-gray-500">{{ item.quantity }}x ₱{{ cartStore.formatPrice(item.price) }}</p>
                </div>
            </div>
            <div class="bg-gray-50 p-2 rounded-lg mb-6">
                <div class="flex justify-between text-sm mb-2">
                    <span>Items ({{ cartStore.totalItems }})</span>
                    <span>₱{{ cartStore.formatPrice(cartStore.subTotal) }}</span>
                </div>
                <div class="flex justify-between text-sm mb-2">
                    <span>VAT (12%)</span>
                    <span>₱{{ cartStore.formatPrice(cartStore.vat) }}</span>
                </div>
                <div class="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total Amount</span>
                    <span>₱{{ cartStore.formatPrice(cartStore.total) }}</span>
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

    <!-- Success Modal -->
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
                    <CommonImage
                        src="/logo/logo2.png"
                        alt="logo"
                        :class="'w-20 h-20'"
                    />
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
                    <CommonImage
                        src="/logo/logo2.png"
                        alt="logo"
                        :class="'w-20 h-20'"
                    />
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

const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
        removeFromCart(itemId)
    } else {
        cartStore.updateQuantity(itemId, newQuantity)
    }
}
const removeFromCart = (itemId) => {
    cartStore.removeFromCart(itemId)
}

const placeOrder = async () => {
    try {
        orderTotal.value = cartStore.total
        cartStore.orderParams.guest_count = guestStore.count
        cartStore.orderParams.total = cartStore.total
        cartStore.orderParams.subtotal = cartStore.subTotal
        cartStore.orderParams.discount = 0
        cartStore.orderParams.tax = cartStore.vat || 0
        cartStore.orderParams.table_id = deviceStore.device.device.table_id
        cartStore.orderParams.items = cartStore.cartItems
        await cartStore.confirmOrder()
        orderNumber.value =`ORD-${Date.now()}`
        isCartModalShow.value = false
        isSuccessModalShow.value = true
        orderStore.orders.push({
            ...cartStore.orderParams,
            orderNumber: orderNumber.value,
            status: 'IN_PROGRESS'
        })
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
</script>
