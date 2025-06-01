<template>
    <div class="w-64 bg-white shadow-lg flex flex-col">
        <!-- Logo -->
        <div class="p-6 border-b flex justify-center">
            <CommonImage
                src="/logo/logo2.png"
                alt="logo"
                class="w-24 h-24"
            />
        </div>
        <!-- Orders -->
        <div class="p-4 border-b">

            <div class="flex gap-2 justify-between">
                <div>
                    <p class="text-md font-medium mb-4">Orders List
                        <span class="text-sm text-gray-500">({{ orders.length }})</span>
                    </p>
                </div>
                <!-- <div>
                    <button
                        class="bg-lightGreen text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors font-medium"
                        @click="orderStore.newOrder()"
                    >
                        New Order
                    </button>
                </div> -->
            </div>
            <WoosooOrderMenu :items="orders" />
        </div>
        <!-- Bottom Actions -->
        <div>
            <WoosooStaffSupportMenu />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useOrderStore } from '@/stores/Order'
const orderStore = useOrderStore()
orderStore.exampleData()
const { orders } = storeToRefs(orderStore)

</script>
