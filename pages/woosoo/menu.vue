<template>
    <el-container class="w-full h-screen">
        <div class="min-h-screen w-full bg-gray-50 flex">
            <el-aside width="15vw" class="bg-white shadow-lg flex flex-col">
            <!-- Sidebar -->
                <WoosooSidebarMenu />
            </el-aside>
            <!-- Main Content and Cart Container -->
            <div class="flex-1 flex min-w-0">
                <!-- Main Content -->
                <el-main class="flex-1 min-w-0 p-0">
                    <div class="h-full py-6">

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
                                @input="debouncedSearch"
                            >
                            <svg v-if="!isLoading" class="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div>
                            <el-button class="bg-primary text-white" @click="resetSession()">reset</el-button>
                        </div>
                        <!-- Featured Item -->
                        <div class="mb-6">
                            <el-skeleton v-if="isLoading" animated>
                                <template #template>
                                    <el-skeleton-item variant="rect" style="width: 100%; height: 200px; border-radius: 12px;" />
                                </template>
                            </el-skeleton>
                            <WoosooCarouselMenu v-else :data="featureItems" />
                        </div>

                        <!-- Filter Tabs -->
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
                                        'px-4 py-2 rounded-lg font-medium transition-colors text-responsive-sm whitespace-nowrap flex-shrink-0',
                                        activeFilter === filter
                                            ? 'bg-primary text-white'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    ]"
                                    @click="handleFilterChange(filter)"
                                    :disabled="isFilterLoading"
                                >
                                    {{ filter.charAt(0).toUpperCase() + filter.slice(1) }}
                                </button>
                            </template>
                        </div>

                        <!-- Menu Grid Skeleton -->
                        <div v-if="isLoading || isFilterLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                            :data="menuItems"
                            @add-to-cart="addToCart"
                        />
                    </div>
                </el-main>

                <!-- Cart Aside -->
                <el-aside width="23vw" class="flex-shrink-0">
                    <div
                        v-if="cartItems.length > 0"
                        class="bg-white border-l border-gray-200 h-full"
                    >
                        <el-skeleton v-if="isLoading" animated class="p-6">
                            <template #template>
                                <!-- Cart header -->
                                <el-skeleton-item variant="h3" style="margin-bottom: 24px;" />

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
                                <div class="mt-6 pt-4 border-t border-gray-200">
                                    <el-skeleton-item variant="text" style="width: 100%;" />
                                    <el-skeleton-item variant="button" style="width: 100%; height: 48px;" />
                                </div>
                            </template>
                        </el-skeleton>

                        <WoosooCartMenu v-else />
                    </div>
                </el-aside>
            </div>
        </div>

        <WoosooOrderProgressViewer />
    </el-container>
</template>

<script setup>
import { debounce } from 'lodash-es'
import { useMenuStore } from '@/stores/Menu'
import { useCartStore } from '@/stores/Cart'
import { useCategoryStore } from '@/stores/Category'

const menuStore = useMenuStore()
const cartStore = useCartStore()
const categoryStore = useCategoryStore()

const { cartItems } = storeToRefs(cartStore)
const { menuItems, featureItems } = storeToRefs(menuStore)
const { categories } = storeToRefs(categoryStore)

const isLoading = ref(true)
const isFilterLoading = ref(false)

const searchQuery = ref('')
const activeFilter = ref(CategoryFilter.ALL)

onMounted(async () => {
    try {
        isLoading.value = true
        await Promise.all([
            menuStore.exampleData(),
            menuStore.getAllMenus(),
        ])

        setTimeout(() => {
            isLoading.value = false
        }, 1000)
    } catch (error) {
        console.error('Error loading initial data:', error)
        isLoading.value = false
    }
})

const filters = computed(() => {
    if (isLoading.value) return []
    return [
        CategoryFilter.ALL,
        ...categories.value.map(item => item.name),
    ]
})

const handleFilterChange = async (newFilter) => {
    if (newFilter === activeFilter.value) return

    try {
        isFilterLoading.value = true
        activeFilter.value = newFilter
        searchQuery.value = ''

        if (newFilter === CategoryFilter.ALL) {
            await menuStore.getAllMenus()
        } else {
            await menuStore.getMenuByCategory(newFilter)
        }
    } catch (error) {
        console.error('Error filtering by category:', error)
    } finally {
        isFilterLoading.value = false
    }
}

const handleSearch = async (query) => {
    try {
        isFilterLoading.value = true

        if (!query || query.trim() === '') {
            if (activeFilter.value === CategoryFilter.ALL) {
                await menuStore.getAllMenus()
            } else {
                await menuStore.getMenuByCategory(activeFilter.value)
            }
        } else {
            await menuStore.searchMenus(query.trim())
        }
    } catch (error) {
        console.error('Error searching menus:', error)
    } finally {
        isFilterLoading.value = false
    }
}

const resetSession = () => {
    cartStore.clearCart()
    navigateTo('/')
}

const debouncedSearch = debounce((event) => {
    const query = event.target.value
    handleSearch(query)
}, 300)

const addToCart = (item) => {
    cartStore.addToCart({
        ...item
    })
}
</script>
