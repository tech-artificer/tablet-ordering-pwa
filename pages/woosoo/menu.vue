<template>
    <div class="min-h-screen bg-gray-50 flex">
        <!-- Sidebar -->
        <WoosooSidebarMenu />
        <!-- Main Content -->
        <div class="flex-1 flex">
            <!-- Menu Section -->
            <div class="flex-1 p-6">
                <!-- Search Bar -->
                <div class="relative mb-6">
                    <input
                        v-model="searchQuery"
                        type="text"
                        placeholder="Search"
                        class="w-full px-4 py-3 pr-12 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                    <svg class="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <!-- Featured Item -->
                <div class="mb-8">
                    <WoosooCarouselMenu :data="featureItems" />
                </div>
                <!-- Filter Tabs -->
                <div class="flex overflow-x-auto space-x-4 w-full mb-6">
                    <button
                        v-for="filter in filters"
                        :key="filter"
                        :class="[
                            'px-4 py-2 rounded-lg font-medium transition-colors',
                            activeFilter === filter
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        ]"
                        @click="activeFilter = filter"
                    >
                        {{ filter.charAt(0).toUpperCase() + filter.slice(1) }}
                    </button>
                </div>
                <!-- Menu Grid -->
                <WoosooProductMenu
                    :data="filteredMenuItems"
                    @add-to-cart="addToCart"
                />
            </div>
            <!-- Order Summary -->
            <WoosooCartMenu
                :items="cartItems"
                @update-quantity="updateQuantity"
            />
        </div>
    </div>
</template>

<script setup>
    import { useMenuStore } from '@/stores/Menu'
    import { useCartStore } from '@/stores/Cart'

    const menuStore = useMenuStore()
    const cartStore = useCartStore()

    const { cartItems } = storeToRefs(cartStore)
    const { menuItems, featureItems } = storeToRefs(menuStore)

    menuStore.exampleData()

    const searchQuery = ref('')
    const activeFilter = ref(CategoryFilter.ALL)

    const filters = [CategoryFilter.ALL, ...new Set(menuItems.value.map(item => item.category))]

    const filteredMenuItems = computed(() => {
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
</script>
