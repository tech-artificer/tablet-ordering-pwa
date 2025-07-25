<template>
    <!-- Floating View Orders Button -->
    <div v-show="orderStore.orders.length > 0" class="fixed bottom-4 right-4 z-50">
        <button
            class="bg-white text-gray-600 px-6 py-3 rounded-full shadow-lg hover:shadow-lg transform hover:scale-105 transition-all duration-300 flex items-center gap-2 font-medium border-2 border-gray-300"
            @click="openOrdersDrawer"
        >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            View Orders
            <span v-if="orderStore.orders.length > 0" class="bg-red-500 text-white text-xs rounded-full px-2 py-1 ml-1">
                {{ orderStore.orders.length }}
            </span>
        </button>
    </div>

    <!-- Orders List Drawer -->
    <el-drawer
        v-model="isOrdersDrawerShow"
        title="Order History"
        :with-header="true"
        direction="rtl"
        size="400px"
    >
        <div class="h-full flex flex-col">
            <!-- Loading State -->
            <div v-if="orderStore.isLoading" class="flex-1 flex items-center justify-center">
                <el-skeleton animated>
                    <template #template>
                        <div class="space-y-4">
                            <div v-for="n in 3" :key="n" class="border border-gray-200 rounded-lg p-4">
                                <div class="flex justify-between items-start mb-2">
                                    <el-skeleton-item variant="h3" style="width: 60%;" />
                                    <el-skeleton-item variant="button" style="width: 80px; height: 24px;" />
                                </div>
                                <el-skeleton-item variant="text" style="width: 40%; margin-bottom: 8px;" />
                                <div class="flex justify-between items-center">
                                    <el-skeleton-item variant="text" style="width: 30%;" />
                                    <el-skeleton-item variant="text" style="width: 25%;" />
                                </div>
                            </div>
                        </div>
                    </template>
                </el-skeleton>
            </div>

            <!-- Orders List -->
            <div v-else class="flex-1 overflow-y-auto">
                <div v-if="orderStore.orders.length === 0" class="text-center py-8 text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p class="text-lg font-medium mb-2">No Orders Yet</p>
                    <p class="text-sm">Your order history will appear here</p>
                </div>

                <div v-else class="space-y-4">
                    <div
                        v-for="order in orderStore.orders"
                        :key="order.id"
                        class="bg-white border border-gray-200 rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
                        @click="viewOrderDetails(order)"
                    >
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <h4 class="font-semibold text-gray-800">
                                    Order #{{ order.id }}
                                </h4>
                                <p class="text-sm text-gray-500">{{ formatDate(order.date) }}</p>
                            </div>
                            <span
                                :class="getStatusClass(order.status)"
                                class="px-2 py-1 rounded-full text-xs font-medium"
                            >
                                {{ formatStatus(order.status) }}
                            </span>
                        </div>

                        <div class="flex justify-between items-center">
                            <div class="text-sm text-gray-600">
                                {{ order.details.length }} item(s)
                            </div>
                            <div class="font-semibold text-primary">
                                ₱{{ formatPrice(order.total) }}
                            </div>
                        </div>

                        <!-- Preview of items -->
                        <div class="mt-2 flex -space-x-2">
                            <div
                                v-for="(item, index) in order.details.slice(0, 3)"
                                :key="index"
                                class="w-8 h-8 rounded-full border-2 border-white overflow-hidden"
                            >
                                <img
                                    :src="item.image"
                                    :alt="item.name"
                                    class="w-full h-full object-cover"
                                >
                            </div>
                            <div
                                v-if="order.details.length > 3"
                                class="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center"
                            >
                                <span class="text-xs text-gray-600">+{{ order.details.length - 3 }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </el-drawer>

    <!-- Order Details Drawer -->
    <el-drawer
        v-model="isOrderDetailsShow"
        title="Order Details"
        :with-header="true"
        direction="rtl"
        size="400px"
    >
        <div v-if="selectedOrder" class="h-full flex flex-col">
            <!-- Order Header -->
            <div class="bg-gray-50 -mx-4 -mt-4 px-4 py-4 mb-6">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">
                            Order #{{ selectedOrder.id }}
                        </h3>
                        <p class="text-sm text-gray-500">{{ formatDate(selectedOrder.date) }}</p>
                    </div>
                    <span
                        :class="getStatusClass(selectedOrder.status)"
                        class="px-3 py-1 rounded-full text-sm font-medium"
                    >
                        {{ formatStatus(selectedOrder.status) }}
                    </span>
                </div>
            </div>

            <!-- Order Items -->
            <div class="flex-1 overflow-y-auto">
                <h4 class="font-semibold text-gray-800 mb-4">Items Ordered</h4>
                <div class="space-y-4 mb-6">
                    <div
                        v-for="item in selectedOrder.details"
                        :key="item.id"
                        class="flex items-center bg-gray-50 rounded-lg p-3"
                    >
                        <img
                            :src="item.image"
                            :alt="item.name"
                            class="w-12 h-12 rounded-lg object-cover mr-3"
                        >
                        <div class="flex-1">
                            <h5 class="font-medium text-gray-800">{{ item.name }}</h5>
                            <p class="text-sm text-gray-500">{{ item.quantity }}x ₱{{ formatPrice(item.price) }}</p>
                        </div>
                        <div class="text-right">
                            <span class="font-semibold text-gray-800">₱{{ formatPrice(item.price * item.quantity) }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-gray-50 -mx-4 -mb-4 px-4 py-4 mt-auto">
                <h4 class="font-semibold text-gray-800 mb-3">Order Summary</h4>
                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">Subtotal</span>
                        <span class="text-gray-800">₱{{ formatPrice(selectedOrder.subTotal) }}</span>
                    </div>
                    <div class="flex justify-between text-sm">
                        <span class="text-gray-600">VAT (12%)</span>
                        <span class="text-gray-800">₱{{ formatPrice(selectedOrder.tax) }}</span>
                    </div>
                    <div class="flex justify-between font-semibold text-lg border-t pt-2">
                        <span>Total</span>
                        <span class="text-primary">₱{{ formatPrice(selectedOrder.total) }}</span>
                    </div>
                </div>
            </div>
        </div>
    </el-drawer>
</template>

<script setup>
import { useOrderStore } from '@/stores/Order'

const orderStore = useOrderStore()

const isOrdersDrawerShow = ref(false)
const isOrderDetailsShow = ref(false)
const selectedOrder = ref(null)

const openOrdersDrawer = () => {
    isOrdersDrawerShow.value = true
}

const viewOrderDetails = (order) => {
    selectedOrder.value = order
    isOrdersDrawerShow.value = false
    isOrderDetailsShow.value = true
}

const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

const formatPrice = (price) => {
    if (!price && price !== 0) return '0.00'
    return parseFloat(price).toFixed(2)
}

const formatStatus = (status) => {
    if (!status) return 'Unknown'
    const statusMap = {
        'IN_PROGRESS': 'In Progress',
        'COMPLETE': 'Complete',
        'CANCELLED': 'Cancelled',
        'PENDING': 'Pending'
    }
    return statusMap[status] || status.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
}

const getStatusClass = (status) => {
    const statusClasses = {
        'IN_PROGRESS': 'bg-yellow-100 text-yellow-800',
        'COMPLETE': 'bg-green-100 text-green-800',
        'CANCELLED': 'bg-red-100 text-red-800',
        'PENDING': 'bg-gray-100 text-gray-800'
    }
    return statusClasses[status] || 'bg-gray-100 text-gray-800'
}

// Watch for drawer close to reset selected order
watch(isOrderDetailsShow, (newVal) => {
    if (!newVal) {
        selectedOrder.value = null
    }
})
</script>
