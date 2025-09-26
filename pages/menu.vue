<script setup lang="ts">
import { ref, watch } from 'vue'
import MenuCard from '~/components/MenuCard.vue'
import MenuFilters from '~/components/MenuFilters.vue'
import MenuCarousel from '~/components/MenuCarousel.vue'
import OrderPendingDetails from '~/components/OrderPendingDetails.vue'
import { useMenuStore } from '~/stores/Menu'
import { useOrderStore } from '~/stores/Order'
import { useCartStore } from '~/stores/Cart'

const { setupOrderListening } = useOrderListener()

const orderStore = useOrderStore()
const cart = useCartStore()

watch(
    () => orderStore.currentOrderId,
    (newId, oldId) => {
        if (newId && newId !== oldId) {
            //   cartStore.cartStatus = true
            //   cartStore.orderStatus = orderStore.current?.status ?? null
            setupOrderListening(Number(newId))
        }
    },
    { immediate: true }
)
// const { guestCount } = storeToRefs(cart)

const menuStore = useMenuStore()

if (!cart.packageSelected.id) {
    navigateTo('/')
}
// Fake demo data — replace with API calls later
// const featuredItems = menuStore.getFeaturedItems()

const activeCategory = ref('meats')


const categories = ref([
    { value: 'meats', label: 'Meats', items: menuStore.menuModifiers },
    { value: 'sides', label: 'Sides (Banchan)', items: menuStore.menuSides },
    { value: 'a la carte', label: 'A La Carte', items: [] },
    { value: 'dessert', label: 'Dessert', items: menuStore.menuDesserts },
    { value: 'beverage', label: 'Beverage', items: menuStore.menuBeverage },
])

const activeItems = computed(() => {
    return categories.value.find(category => category.value === activeCategory.value)?.items || []
})

const formatGroupName = (label: string) => {
    return label.charAt(0).toUpperCase() + label.slice(1).replace(/[-_]/g, ' ')
}

definePageMeta({
    middleware: [
        function (to, from) {
            // Custom inline middleware
        },
        'order',
    ],
    layout: 'custom',
});

// console.log('cart', useDeviceStore().authenticate())
</script>

<template>
    <div class="w-full h-screen overflow-hidden font-inter">
    
        <el-container class="w-full h-full">

            <div class="min-h-screen w-full flex">
                <!-- Left Side: Menu Content -->
                <el-aside class="bg-white shadow-lg flex flex-col max-w-[90px]">
                    <WoosooSidebarMenu />
                </el-aside>

                <!-- Middle Side: Menu Content -->
                <el-main class="flex-1 flex min-w-0 h-full">
                    <div class="flex-1 min-w-0 p-0 overflow-auto">
                        <!-- Carousel -->
                        <MenuCarousel />
                        <!-- Category Filters -->
                        <MenuFilters @select="activeCategory = $event" :categories="categories" />

                        <!-- Product Grid -->

                        <div class="group-section">
                            <div class="group-header py-4 px-2">
                                <h2 class="text-2xl font-bold text-gray-800 border-b-2 border-orange-400 pb-2">
                                    {{ formatGroupName(activeCategory) }}

                                    <span class="text-sm text-gray-500 ml-2">({{ activeItems.length }} items)</span>
                                </h2>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <MenuCard v-for="item in activeItems" :key="item.id ?? 0" :item="item" />
                            </div>

                            <div class="h-20"></div>
                        </div>
                    </div>
                </el-main>

                <!-- Right Side: Order Details -->
                <div class="shrink-0 min-w-[300px] border-l border-gray-200">
                    <!-- {{ cartItems }} -->
                    <OrderPendingDetails />
                </div>

            </div>

        </el-container>
    </div>
</template>
