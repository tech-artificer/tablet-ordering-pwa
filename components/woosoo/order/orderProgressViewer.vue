<template>
    <!-- Orders List Drawer -->
    <el-drawer
        v-model="cartStore.cartStatus"
        :title="drawerTitle"
        :with-header="false"
        direction="rtl"
        size="400px"
        class="order-drawer"
        :close-on-click-modal="false"
        :close-on-press-escape="false">
        <!-- Pending State -->
        <div v-if="cartStore.orderStatus === OrderStatus.CONFIRMED" class="order-pending">
            <h1 class="text-2xl font-bold mt-10">Order Confirmed</h1>
            <div class="flex justify-center">
                <CommonImage
                    src="/logo/logo2.png"
                    alt="logo"
                    class="w-20 h-20"
                />
            </div>

            <!-- Chef Animation -->
            <div class="chef-container">
                <div class="chef-illustration">
                    <!-- Chef SVG -->
                    <svg width="120" height="120" viewBox="0 0 120 120" class="chef-svg">
                        <!-- Chef Hat -->
                        <ellipse cx="60" cy="35" rx="25" ry="15" fill="#ffa07a" stroke="#" stroke-width="2" />
                        <!-- Chef Head -->
                        <circle cx="60" cy="55" r="20" fill="black" />
                        <!-- Chef Body -->
                        <rect x="45" y="70" width="30" height="35" rx="15" fill="black" />
                        <!-- Chef Arms -->
                        <circle cx="40" cy="80" r="8" fill="black" />
                        <circle cx="80" cy="80" r="8" fill="black" />
                        <!-- Cooking Pan -->
                        <ellipse cx="60" cy="95" rx="15" ry="8" fill="#ffffff" class="cooking-pan" />
                        <!-- Steam Animation -->
                        <g class="steam">
                            <path d="M50 88 Q52 82 50 78" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.7" />
                            <path d="M60 88 Q62 82 60 78" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.7" />
                            <path d="M70 88 Q72 82 70 78" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.7" />
                        </g>
                    </svg>
                </div>

                <!-- orange Circle Background -->
                <div class="gray-circle" />
            </div>

            <!-- Status Text -->
            <div class="status-text">
                <p>Preparing your food</p>
                <p>Please wait . .</p>
            </div>
        </div>

        <!-- Complete State -->
        <div v-else-if="cartStore.orderStatus === OrderStatus.COMPLETE" class="order-complete">
            <div class="complete-animation mt-10">
                <div class="flex justify-center mb-4">
                    <CommonImage
                        src="/logo/logo2.png"
                        alt="logo"
                        class="w-20 h-20"
                    />
                </div>

                <h2 class="complete-title">Order Prepareing Complete !</h2>
                <p class="complete-message">Your delicious food is being prepared and will arrive shortly.</p>
            </div>
        </div>
    </el-drawer>
</template>

<script setup>
import { useCartStore } from '@/stores/Cart'
import { useOrderStore } from '@/stores/Order'

const cartStore = useCartStore()
const orderStore = useOrderStore()
const estimatedTime = ref(21)
const progress = ref(0)
const progressWidth = ref(0)
const currentOrderId = ref(null) // Track the current order being processed

const drawerTitle = computed(() => {
    return cartStore.orderStatus === OrderStatus.CONFIRMED ? 'Order Pending' : 'Order Complete'
})

const setupOrderListening = (orderId) => {
    if (!window.Echo || !orderId) {
        console.error('Display.vue: window.Echo is not available or order ID is missing.')
        console.log('Echo available:', !!window.Echo)
        console.log('Order ID:', orderId)
        return
    }

    console.log('Kitchen Display. Setting up listener for order:', orderId)

    // Leave previous channel if exists
    if (currentOrderId.value) {
        window.Echo.leave(`orders.${currentOrderId.value}`)
    }

    currentOrderId.value = orderId

    window.Echo.channel(`orders.${orderId}`)
        .listen('.order.created', (orderEvent) => handleOrderCreated(orderEvent))
        .listen('.order.completed', (orderEvent) => handleOrderCompleted(orderEvent))
        .error((error) => {
            console.error('Display.vue: Error connecting to order channel:', error)
        })

    if (window.Echo.connector?.socket) {
        window.Echo.connector.socket.on('connect', () => {
            console.log('Connected to WebSocket')
        })

        window.Echo.connector.socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket')
        })
    }
}

onMounted(() => {
    progress.value = 0
    progressWidth.value = 0
    estimatedTime.value = 21

    // Get the initial order ID from the store
    const initialOrderId = orderStore.current_order?.order_id
    if (initialOrderId) {
        setupOrderListening(initialOrderId)
    }
})

onUnmounted(() => {
    if (currentOrderId.value) {
        window.Echo.leave(`orders.${currentOrderId.value}`)
    }
})

const handleOrderCreated = (orderEvent) => {
    console.log('New order received:', orderEvent)
    console.log('Current cart status:', cartStore.cartStatus)

    if (orderEvent && orderEvent.order) {
        const order = orderEvent.order

        // Update the current order in the store
        orderStore.current_order = order

        // Set up listening for this specific order
        if (order.order_id && order.order_id !== currentOrderId.value) {
            setupOrderListening(order.order_id)
        }
    }
}

const handleOrderCompleted = (orderEvent) => {
    console.log('Order completed received:', orderEvent)
    console.log('Current cart status:', cartStore.cartStatus)

    if (orderEvent && orderEvent.order) {
        const order = orderEvent.order

        // Update the current order in the store
        orderStore.current_order = order

        cartStore.orderStatus = order.status
        console.log('Updated order status:', cartStore.orderStatus)

        // Close cart after a delay
        setTimeout(() => {
            cartStore.cartStatus = false
        }, 1000)
    }
}

// Watch for changes in the current order
watch(
    () => orderStore.current_order?.order_id,
    (newOrderId, oldOrderId) => {
        if (newOrderId && newOrderId !== oldOrderId) {
            console.log('Order ID changed, setting up new listener:', newOrderId)
            cartStore.cartStatus = true
            cartStore.orderStatus = orderStore.current_order.status
            console.log('Updated cart status:', cartStore.cartStatus)
            console.log('Updated order status:', cartStore.orderStatus)
            setupOrderListening(newOrderId)
        }
    }
)

watch(
    () => cartStore.orderStatus,
    (newVal) => {
        if (newVal === OrderStatus.COMPLETE) {
            setTimeout(() => {
                navigateTo('/')
                cartStore.orderStatus = OrderStatus.PENDING
                cartStore.cartItems = []
                cartStore.cartStatus = false
                currentOrderId.value = null // Reset current order ID
            }, 3000)
        }
    }
)
</script>

<style scoped>
.order-drawer {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.order-pending {
    padding: 20px;
    text-align: center;
}

.delivery-time-section {
    margin-bottom: 30px;
}

.delivery-label {
    color: #666;
    font-size: 14px;
    margin-bottom: 5px;
}

.delivery-time {
    font-size: 36px;
    font-weight: bold;
    color: #333;
    margin: 0;
}

.chef-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 40px 0;
}

.gray-circle {
    position: absolute;
    width: 180px;
    height: 180px;
    background: linear-gradient(135deg, #e88d1e 0%, rgb(255, 81, 0) 100%);
    border-radius: 50%;
    z-index: 1;
}

.chef-illustration {
    position: relative;
    z-index: 2;
}

.chef-svg {
    animation: bounce 2s infinite;
}

.steam {
    animation: steam 1.5s infinite;
}

.cooking-pan {
    animation: shake 0.5s infinite;
}

.progress-section {
    margin: 30px 0;
}

.progress-bar {
    width: 100%;
    height: 4px;
    background: #e0e0e0;
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 15px;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff6b6b, #ff8787);
    transition: width 0.3s ease;
}

.progress-dots {
    display: flex;
    justify-content: space-between;
    padding: 0 20px;
}

.dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #e0e0e0;
    transition: background 0.3s ease;
}

.dot.active {
    background: #ff6b6b;
}

.status-text {
    margin: 30px 0;
    padding: 0 20px;
    color: #666;
    line-height: 1.5;
}

.order-details {
    margin-top: 40px;
    text-align: left;
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
}

.order-details h3 {
    margin-top: 0;
    margin-bottom: 15px;
    color: #333;
}

.order-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #eee;
}

.order-item:last-child {
    border-bottom: none;
}

.item-name {
    flex: 1;
}

.item-quantity {
    margin: 0 10px;
    color: #666;
}

.item-price {
    font-weight: bold;
    color: #333;
}

.order-total {
    margin-top: 15px;
    padding-top: 15px;
    border-top: 2px solid #ddd;
    text-align: right;
}

/* Complete State Styles */
.order-complete {
    padding: 30px 20px;
    text-align: center;
}

.complete-animation {
    animation: fadeIn 0.5s ease-in;
}

.success-icon {
    margin-bottom: 20px;
    margin: auto;
    animation: scale 0.5s ease-out;
}

.complete-title {
    color: #4CAF50;
    font-size: 24px;
    margin-bottom: 10px;
}

.complete-message {
    color: #666;
    margin-bottom: 30px;
}

.delivery-info {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 30px;
    text-align: left;
}

.delivery-info p {
    margin: 5px 0;
}

.action-buttons {
    display: flex;
    gap: 10px;
    justify-content: center;
}

.action-buttons .el-button {
    flex: 1;
    max-width: 150px;
}

/* Animations */
@keyframes bounce {
    0%, 20%, 50%, 80%, 100% {
        transform: translateY(0);
    }
    40% {
        transform: translateY(-10px);
    }
    60% {
        transform: translateY(-5px);
    }
}

@keyframes steam {
    0% {
        opacity: 0.7;
        transform: translateY(0);
    }
    100% {
        opacity: 0;
        transform: translateY(-20px);
    }
}

@keyframes shake {
    0%, 100% {
        transform: translateX(0);
    }
    25% {
        transform: translateX(-1px);
    }
    75% {
        transform: translateX(1px);
    }
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes scale {
    0% {
        transform: scale(0);
    }
    50% {
        transform: scale(1.2);
    }
    100% {
        transform: scale(1);
    }
}
</style>
