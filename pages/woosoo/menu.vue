<template>
    <div class="min-h-screen bg-gray-50 flex">
        <!-- Sidebar -->
        <WoosooSidebarMenu />

        <!-- Main Content -->
        <div class="flex-1 flex">
            <!-- Menu Section -->
            <div class="flex-1 p-6">
                <!-- Search Bar Skeleton -->
                <div class="relative mb-6 hidden">
                    <el-skeleton v-if="isLoading" animated class="hidden">
                        <template #template>
                            <el-skeleton-item variant="rect" style="width: 100%; height: 48px; border-radius: 8px;" />
                        </template>
                    </el-skeleton>
                    <input
                        v-else
                        v-model="searchQuery"
                        type="text"
                        placeholder="Search"
                        class="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                    <svg v-if="!isLoading" class="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>

                <!-- Featured Item Skeleton -->
                <div>
                    <el-skeleton v-if="isLoading" animated>
                        <template #template>
                            <el-skeleton-item variant="rect" style="width: 100%; height: 200px; border-radius: 12px;" />
                        </template>
                    </el-skeleton>
                    <WoosooCarouselMenu v-else :data="featureItems" />
                </div>

                <!-- Filter Tabs Skeleton -->
                <div class="flex overflow-x-auto w-full mb-6 gap-2 mt-2">
                    <template v-if="isLoading">
                        <el-skeleton v-for="n in 5" :key="n" animated>
                            <template #template>
                                <el-skeleton-item variant="button" style="width: 80px; height: 36px; margin-right: 16px;" />
                            </template>
                        </el-skeleton>
                    </template>
                    <template v-else>
                        <button
                            v-for="filter in filters"
                            :key="filter"
                            :class="[
                                'px-4 py-2 rounded-lg font-medium transition-colors',
                                activeFilter === filter
                                    ? 'bg-primary text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            ]"
                            @click="activeFilter = filter"
                        >
                            {{ filter.charAt(0).toUpperCase() + filter.slice(1) }}
                        </button>
                    </template>
                </div>

                <!-- Menu Grid Skeleton -->
                <div v-if="isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <el-skeleton v-for="n in 6" :key="n" animated>
                        <template #template>
                            <div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                <!-- Image skeleton -->
                                <el-skeleton-item variant="image" style="width: 100%; height: 200px;" />
                                <div class="p-4 space-y-3">
                                    <!-- Title skeleton -->
                                    <el-skeleton-item variant="h3" style="width: 80%;" />
                                    <!-- Description skeleton -->
                                    <el-skeleton-item variant="text" style="width: 100%;" />
                                    <el-skeleton-item variant="text" style="width: 60%;" />
                                    <!-- Price and button skeleton -->
                                    <div class="flex justify-between items-center mt-4">
                                        <el-skeleton-item variant="text" style="width: 60px;" />
                                        <el-skeleton-item variant="button" style="width: 80px; height: 32px;" />
                                    </div>
                                </div>
                            </div>
                        </template>
                    </el-skeleton>
                </div>

                <!-- Actual Menu Grid -->
                <WoosooProductMenu
                    v-else
                    :data="filteredMenuItems"
                    @add-to-cart="addToCart"
                />
            </div>

            <!-- Order Summary Skeleton -->
            <div
                v-if="cartItems.length > 0"
                class="w-80 bg-white border-l border-gray-200"
            >
                <el-skeleton v-if="isLoading" animated class="p-6">
                    <template #template>
                        <!-- Cart header -->
                        <el-skeleton-item variant="h3" style="width: 120px; margin-bottom: 24px;" />

                        <!-- Cart items -->
                        <div v-for="n in 3" :key="n" class="mb-4 pb-4 border-b border-gray-100">
                            <div class="flex items-center space-x-3">
                                <el-skeleton-item variant="image" style="width: 60px; height: 60px; border-radius: 8px;" />
                                <div class="flex-1 space-y-2">
                                    <el-skeleton-item variant="text" style="width: 80%;" />
                                    <el-skeleton-item variant="text" style="width: 60%;" />
                                    <div class="flex justify-between items-center">
                                        <el-skeleton-item variant="button" style="width: 80px; height: 24px;" />
                                        <el-skeleton-item variant="text" style="width: 40px;" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Total -->
                        <div class="mt-6 pt-4 border-t border-gray-200 space-y-3">
                            <el-skeleton-item variant="text" style="width: 100%;" />
                            <el-skeleton-item variant="button" style="width: 100%; height: 48px;" />
                        </div>
                    </template>
                </el-skeleton>

                <!-- Actual Cart -->
                <WoosooCartMenu
                    v-else
                    :items="cartItems"
                    @update-quantity="updateQuantity"
                />
            </div>
        </div>

        <div class="fixed bottom-6 right-6 z-50">
            <div class="relative">
                <Transition
                    enter-active-class="transition-all duration-300 ease-out"
                    enter-from-class="transform scale-95 opacity-0"
                    enter-to-class="transform scale-100 opacity-100"
                    leave-active-class="transition-all duration-200 ease-in"
                    leave-from-class="transform scale-100 opacity-100"
                    leave-to-class="transform scale-95 opacity-0"
                >
                    <div
                        v-if="showStaffMenu"
                        class="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 min-w-[240px]"
                        @click.stop
                    >
                        <!-- Close button -->
                        <div class="flex justify-between items-center mb-3">
                            <h3 class="font-medium text-gray-800">Staff Support</h3>
                            <button
                                class="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                @click="showStaffMenu = false"
                            >
                                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div class="flex flex-col space-y-2">
                            <button
                                class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group text-left"
                                @click="handleStaffAction('clean')"
                            >
                                <div class="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </div>
                                <span class="font-medium text-gray-700">Clean Table</span>
                            </button>

                            <button
                                class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group text-left"
                                @click="handleStaffAction('support')"
                            >
                                <div class="p-2 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                                    <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <span class="font-medium text-gray-700">Get Support</span>
                            </button>

                            <button
                                class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group text-left"
                                @click="handleStaffAction('bill')"
                            >
                                <div class="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
                                    <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <span class="font-medium text-gray-700">Request Bill</span>
                            </button>

                            <button
                                class="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group text-left"
                                @click="handleStaffAction('water')"
                            >
                                <div class="p-2 bg-cyan-50 rounded-lg group-hover:bg-cyan-100 transition-colors">
                                    <svg class="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                </div>
                                <span class="font-medium text-gray-700">Order Water</span>
                            </button>
                        </div>
                    </div>
                </Transition>

                <button
                    v-if="!showStaffMenu"
                    class="relative flex items-center justify-center w-14 h-14 bg-primary hover:bg-orange-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
                    @click="toggleStaffMenu"
                >
                    <div class="absolute inset-0 rounded-full bg-primary animate-ping opacity-20" />
                    <svg class="w-6 h-6 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 016 0v6a3 3 0 01-3 3z"/>
                    </svg>
                </button>
            </div>
        </div>

        <!-- Backdrop for closing menu -->
        <div
            v-if="showStaffMenu"
            class="fixed inset-0 z-40"
            @click="showStaffMenu = false"
        />
    </div>
</template>

<script setup>
import { useMenuStore } from '@/stores/Menu'
import { useCartStore } from '@/stores/Cart'

const menuStore = useMenuStore()
const cartStore = useCartStore()

const { cartItems } = storeToRefs(cartStore)
const { menuItems, featureItems } = storeToRefs(menuStore)

const isLoading = ref(true)
const showStaffMenu = ref(false)

onMounted(async () => {
    try {
        await menuStore.exampleData()
        setTimeout(() => {
            isLoading.value = false
        }, 2000)
    } catch (error) {
        console.error('Error loading menu data:', error)
        isLoading.value = false
    }
})

const searchQuery = ref('')
const activeFilter = ref(CategoryFilter.ALL)

const filters = computed(() => {
    if (isLoading.value) return []
    return [CategoryFilter.ALL, ...new Set(menuItems.value.map(item => item.category))]
})

const filteredMenuItems = computed(() => {
    if (isLoading.value) return []

    let items = menuItems.value

    if (activeFilter.value !== CategoryFilter.ALL) {
        items = items.filter(item => item.category === activeFilter.value)
    }

    if (searchQuery.value) {
        items = items.filter(item =>
            item.name.toLowerCase().includes(searchQuery.value.toLowerCase())
        )
    }
    return items
})

const addToCart = (item) => {
    cartStore.addToCart({
        ...item
    })
}

const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity <= 0) {
        cartStore.removeCartItem(itemId)
    } else {
        cartStore.updateCartItemQuantity(itemId, newQuantity)
    }
}

const toggleStaffMenu = () => {
    showStaffMenu.value = !showStaffMenu.value
}

const handleStaffAction = (action) => {
    switch (action) {
        case 'clean':
            console.log('Requesting table cleaning...')
            break
        case 'support':
            console.log('Requesting staff support...')
            break
        case 'bill':
            console.log('Requesting bill...')
            break
        case 'water':
            console.log('Ordering water...')
            break
    }

    showStaffMenu.value = false
}

</script>
