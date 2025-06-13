<template>
    <div class="min-h-screen min-w-screen bg-gray-50 flex">
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
                                'px-2 py-2 rounded-lg font-medium transition-colors text-responsive-sm',
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
                class="w-92 bg-white border-l border-gray-200"
            >
                <el-skeleton v-if="isLoading" animated class="p-6">
                    <template #template>
                        <!-- Cart header -->
                        <el-skeleton-item variant="h3" class="w-92" style="margin-bottom: 24px;" />

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
                />
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

</script>
