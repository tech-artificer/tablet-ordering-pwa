<template>
    <div class="w-64 bg-white shadow-lg flex flex-col">
        <!-- Logo Section -->
        <div class="p-6 border-b flex justify-center">
            <el-skeleton v-if="isLoading" animated>
                <template #template>
                    <el-skeleton-item
                        variant="image"
                        style="width: 96px; height: 96px; border-radius: 12px;"
                    />
                </template>
            </el-skeleton>
            <CommonImage
                v-else
                src="/logo/logo2.png"
                alt="logo"
                class="w-24 h-24"
            />
        </div>

        <!-- Orders Section -->
        <div class="p-4 border-b flex-1">
            <!-- Orders Header -->
            <div class="flex gap-2 justify-between mb-4">
                <div>
                    <el-skeleton v-if="isLoading" animated>
                        <template #template>
                            <el-skeleton-item variant="h3" style="width: 140px; height: 20px;" />
                        </template>
                    </el-skeleton>
                    <p v-else class="text-md font-medium">
                        Orders List
                        <span class="text-sm text-gray-500">({{ orders.length }})</span>
                    </p>
                </div>
                <!-- Uncomment if you want to show the New Order button skeleton
                <div>
                    <el-skeleton v-if="isLoading" animated>
                        <template #template>
                            <el-skeleton-item variant="button" style="width: 100px; height: 36px;" />
                        </template>
                    </el-skeleton>
                    <button
                        v-else
                        class="bg-lightGreen text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
                        @click="orderStore.newOrder()"
                    >
                        New Order
                    </button>
                </div>
                -->
            </div>

            <!-- Orders List Skeleton -->
            <div v-if="isLoading" class="space-y-3">
                <el-skeleton v-for="n in 4" :key="n" animated>
                    <template #template>
                        <div class="border border-gray-200 rounded-lg p-3">
                            <!-- Order header -->
                            <div class="flex justify-between items-center mb-2">
                                <el-skeleton-item variant="text" style="width: 80px;" />
                                <el-skeleton-item variant="button" style="width: 60px; height: 20px; border-radius: 10px;" />
                            </div>
                            <!-- Order details -->
                            <div class="space-y-1">
                                <el-skeleton-item variant="text" style="width: 100%;" />
                                <el-skeleton-item variant="text" style="width: 70%;" />
                            </div>
                            <!-- Order footer -->
                            <div class="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                                <el-skeleton-item variant="text" style="width: 60px;" />
                                <el-skeleton-item variant="text" style="width: 50px;" />
                            </div>
                        </div>
                    </template>
                </el-skeleton>
            </div>

            <!-- Actual Orders List -->
            <WoosooOrderMenu v-else :items="orders" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useOrderStore } from '@/stores/Order'

const orderStore = useOrderStore()
const { orders } = storeToRefs(orderStore)

// Loading state
const isLoading = ref(true)

// Simulate loading process
onMounted(async () => {
    try {
        await orderStore.exampleData()
        // Simulate network delay
        setTimeout(() => {
            isLoading.value = false
        }, 1500)
    } catch (error) {
        console.error('Error loading orders:', error)
        isLoading.value = false
    }
})
</script>
