<template>
    <div class="bg-gray-50 min-h-[450px]">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <!-- Header -->
            <div class="flex items-center justify-between mb-8">
                <div class="flex items-center space-x-4">
                    <h1 class="text-3xl font-bold text-gray-900">{{ selectedPackageName }}</h1>
                    <div class="bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-medium">
                        {{ cartItems.length - 1 }} items
                    </div>
                </div>
                <button class="min-w-24 bg-primary text-black py-3 px-4 rounded-lg font-medium hover:bg-primary/80 transition-colors" @click="navigateTo('woosoo/menu')">
                    Let's Grill
                </button>
            </div>

            <!-- Cart Items -->
            <div class="space-y-6">
                <!-- Cart Items List -->
                <div class="rounded-lg shadow-sm overflow-hidden">
                    <div class="p-2">
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            <!-- Sample Cart Item 4 -->
                            <div v-for="item in cartItems.slice(1)" :key="item.id" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 hover:shadow-md transition-shadow">
                                <!-- Product Badge -->
                                <div class="flex items-start justify-between mb-3">
                                    <div class="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center">
                                        <span class="text-white font-bold text-xs"> {{ item.receipt_name }} </span>
                                    </div>
                                </div>

                                <!-- Product Image -->
                                <div class="relative mb-3">
                                    <div class="w-full h-24 bg-gray-100 rounded-lg overflow-hidden">
                                        <CommonImage
                                            :src="item.image_url || item.image || '/default-food.png'"
                                            :alt="item.name || 'Food item'"
                                            :style-class="'w-full h-full object-cover'"
                                        />
                                    </div>
                                </div>

                                <!-- Product Info -->
                                <div class="space-y-2">
                                    <h3 class="text-sm font-semibold text-gray-900 line-clamp-2">{{ item.name }}</h3>

                                    <!-- Quantity Controls -->
                                    <div class="flex items-center justify-between">
                                        <span class="text-xs text-gray-600">Qty</span>
                                        <div class="flex items-center space-x-2">
                                            <button class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors" @click="decreaseQuantity(item)">
                                                <svg class="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/>
                                                </svg>
                                            </button>

                                            <span class="w-6 text-center font-medium text-sm text-gray-900">{{ item.quantity }}</span>

                                            <button class="w-6 h-6 rounded-full bg-orange-400 flex items-center justify-center hover:bg-orange-500 transition-colors" @click="increaseQuantity(item)">
                                                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup>
const cartStore = useCartStore()
const packageStore = usePackageStore()
const { cartItems } = storeToRefs(cartStore)
const { selectedPackageName } = storeToRefs(packageStore)

const increaseQuantity = (item) => {
    item.quantity++
}
const decreaseQuantity = (item) => {
    if (item.quantity > 1) {
        item.quantity--
    }
}
</script>

<style scoped>
button {
    transition: all 0.2s ease-in-out;
}

.border {
    transition: all 0.2s ease-in-out;
}
</style>
