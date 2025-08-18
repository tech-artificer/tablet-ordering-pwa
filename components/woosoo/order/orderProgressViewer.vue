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
        <WoosooOrderCardConfirm
            v-if="cartStore.orderStatus === OrderStatus.CONFIRMED" />
        <!-- Complete State -->
        <WoosooOrderCardState
            v-if="cartStore.orderStatus === OrderStatus.COMPLETE"
            title="Order Prepareing Complete !"
            description="Your delicious food is being prepared and will arrive shortly." />
        <!-- Void State -->
        <WoosooOrderCardState
            v-else-if="cartStore.orderStatus === OrderStatus.VOIDED"
            title="Order Voided"
            description="Your order has been voided." />
        <!-- Cancelled State -->
        <WoosooOrderCardState
            v-else-if="cartStore.orderStatus === OrderStatus.CANCELLED"
            title="Order Cancelled"
            description="Your order has been cancelled." />
    </el-drawer>
</template>
<script setup>
import { useCartStore } from '@/stores/Cart'
import { useOrderStore } from '@/stores/Order'
import { useGuestStore } from '@/stores/Guest'

const { $echo } = useNuxtApp()
const cartStore = useCartStore()
const orderStore = useOrderStore()
const guestStore = useGuestStore()

const currentOrderId = ref(null)
const estimatedTime = ref(21)
const progress = ref(0)
const progressWidth = ref(0)
const currentOrder = computed(() => orderStore.current_order)
const orderOnRuntime = computed(() => orderStore.current_order?.order)

const drawerTitle = computed(() =>
    cartStore.orderStatus === OrderStatus.CONFIRMED
        ? 'Order Pending'
        : 'Order Complete'
)


function setupOrderListening(orderId) {

    console.log('current Order', currentOrder)
    console.log('Order on runtime', orderOnRuntime)

    if (!orderId) return

    if (!currentOrderId.value) {
        currentOrderId.value = orderId
    }

    console.log('Setting up order listening... orders.', orderId)
    currentOrderId.value = orderId
    console.log(`Listening to channel: orders.${orderId}`)

    $echo
        .channel(`orders.${orderId}`)
        .listen('.order.completed', (e) => handleOrderUpdate(e))
        .listen('.order.voided', (e) => handleOrderUpdate(e))
        .listen('.order.cancelled', (e) => handleOrderUpdate(e))
        .error((error) => {
            console.error('Error connecting to order channel:', error)
        })
}

function handleOrderUpdate(event) {
    if (!event?.order) return
    const order = event.order
    updateCurrentOrder(order)

    console.log('after update current order', order)
    if (shouldReturnToWelcome(order)) {
        console.log('return to welcome after order update')
        transitionToWelcome()
    }

    console.log('skipped return to welcome after order update')
}

function updateCurrentOrder(order) {
    if (!order) return

    if (order.order_id && order.order_id !== currentOrderId.value) {
        setupOrderListening(order.order_id)
    }
}

function shouldReturnToWelcome(order) {

    if (!order) return false

    const status = order?.status

    if (status.toLowerCase().includes(['complete', 'completed', 'void', 'voided', 'cancel', 'cancelled'])) return true

}

function transitionToWelcome(delay = 2000) {
    setTimeout(() => {
        resetStores()
        navigateTo('/')
    }, delay)
}

function resetStores() {
    currentOrderId.value = null
    orderStore.$reset()
    guestStore.$reset()
    cartStore.$reset()
}

onMounted(() => {
    progress.value = 0
    progressWidth.value = 0
    estimatedTime.value = 21

    const initialOrder = orderStore.current_order?.order ?? null
    const initialId = initialOrder?.order_id ?? null
    const initialStatus = initialOrder?.status ?? null

    console.log('Initial order:', initialOrder)
    if (shouldReturnToWelcome(initialOrder)) {
        console.log('Returning to welcome')
        transitionToWelcome(0)
        return
    }

    if (initialId) {
        console.log('Initial order id:', initialOrder)
        cartStore.orderStatus = initialStatus
        cartStore.cartStatus = true
        setupOrderListening(initialId)
    }
})

onUnmounted(() => {

    // if (currentOrderId.value) {
    window.Echo.leave(`orders.${currentOrderId.value}`)
    // }
})

watch(
    () => orderStore.current_order?.order.order_id ?? null,
    (newId, oldId) => {
        if (newId && newId !== oldId) {
            console.log('Order ID changed, listening to new order:', newId)
            cartStore.cartStatus = true
            cartStore.orderStatus = orderStore.current_order?.order?.status ?? null
            setupOrderListening(newId)
        }
    }
)

watch(
    () => cartStore.orderStatus,
    () => {
        const order = orderStore.current_order.order
        if (shouldReturnToWelcome(order)) {
            transitionToWelcome()
        }
    }
)
</script>
