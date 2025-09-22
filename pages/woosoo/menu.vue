<template>
    <div class="w-full h-screen overflow-hidden">
        <!-- prevent page scrolling; only the center column will scroll -->
       
        <el-container class="w-full h-full">

            <div class="min-h-screen w-full flex">

                <el-aside class="bg-white shadow-lg flex flex-col max-w-[100px]">
                    <WoosooSidebarMenu />
                </el-aside> 

                <!-- Main Content and Cart Container -->
                <div class="flex-1 flex min-w-0 h-full">
                    <!-- Main Content -->
                    <el-main class="flex-1 min-w-0 p-0 overflow-auto">
                        <!-- <el-scrollbar ref="scrollbarRef" class="w-full h-full" always @scroll="scroll"> -->
                        <div class="h-full py-6">
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
                                        v-for="filter in mainFilter"
                                        :key="filter"
                                        :class="[
                                            'px-4 py-2 rounded-lg font-medium transition-colors text-responsive-sm whitespace-nowrap flex-shrink-0',
                                            activeFilter === filter
                                                ? 'bg-primary text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        ]"
                                        @click="handleFilterChange(filter)"
                                    >

                                    <div class="font-medium">{{ filter.charAt(0).toUpperCase() + filter.slice(1) }}</div>
                                        <!-- {{ filter.MEATS }} -->
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
                                :data="filteredMainMenuItems"
                                @add-to-cart="addToCart"
                            />
                        </div>
                        <!-- </el-scrollbar> -->
                    </el-main>

                    <!-- Cart Aside -->
                    <!-- Cart Aside (independent scroll) -->
                      <el-aside class="h-full overflow-auto">
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
                                    <div class="mt-6 pt-4 border-gray-200">
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
      
    </div>

</template>

<script setup lang="ts">
definePageMeta({
    layout: false,
    middleware: [
        function (to, from) {
            // Custom inline middleware
        },
        'order',
    ],
});
import { useMenuStore } from '@/stores/Menu'
import { useCartStore } from '@/stores/Cart'
import { usePackageStore } from '@/stores/Package'
import { useOrderStore } from '@/stores/Order'



const menuStore = useMenuStore()
const cartStore = useCartStore()
const packageStore = usePackageStore()
const orderStore = useOrderStore()

const { cartItems } = storeToRefs(cartStore)
const { menuItems, featureItems } = storeToRefs(menuStore)
const { sideList, desertList, beverageList, packageList } = storeToRefs(packageStore)

const isLoading = ref(true)
const searchQuery = ref('')
const activeFilter = ref('')
const showMainFilter = ref(true)
const mainFilterTabs = ref([
    CategoryFilter.MEATS,
    CategoryFilter.SIDES_BANCHAN,
    CategoryFilter.A_LA_CARTE,
    CategoryFilter.DESSERT,
    CategoryFilter.BEVERAGE,
])


// Helper function to extract value from reactive objects
const extractValue = (item: any) => {
    return item?._custom?.value || item
}

onMounted(async () => {

    console.log('cartstore', cartStore.cartItems)

    activeFilter.value = showMainFilter.value ? 'MEATS' : 'CURRENT PACKAGE'
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
    // if (!orderStore.current_order) {
    //     navigateTo('/')
    // }
})

const mainFilter = computed(() => {
    return mainFilterTabs.value.map(filter => filter.toUpperCase())
})

const filteredMainMenuItems = computed(() => {
    if (!menuItems.value) return []
    let filtered = [] as any
    if (activeFilter.value.toLowerCase() === CategoryFilter.MEATS.toLowerCase()) {
        // console.log(cartItems)
        // filtered = menuItems.value.map(item => extractValue(item))
        filtered = orderStore.order.orderedPackage?.items || []
    }
    if (activeFilter.value.toLowerCase() === CategoryFilter.SIDES_BANCHAN.toLowerCase()) {
        console.log('sides')
        filtered = sideList.value
    }
    if (activeFilter.value.toLowerCase() === CategoryFilter.DESSERT.toLowerCase()) {
        console.log('desert')
        filtered = desertList.value
    }
    if (activeFilter.value.toLowerCase() === CategoryFilter.BEVERAGE.toLowerCase()) {
        console.log('beverage')
        filtered = beverageList.value
    }
    return filtered
})

const handleFilterChange = (newFilter: string) => {
    if (newFilter === activeFilter.value) return
    activeFilter.value = newFilter
    searchQuery.value = ''
}

const addToCart = (item: any) => {
    if (!item || !item.price) item.price = 0
    if (!item || !item.quantity) item.quantity = 1
    cartStore.addToCart({
        ...item
    })
}
</script>
