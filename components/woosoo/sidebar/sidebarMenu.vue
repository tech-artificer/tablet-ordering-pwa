<template>
    <div class="w-32 bg-white shadow-lg flex flex-col">
        <!-- Logo Section -->
        <div class="p-6 border-b flex justify-center">
            <NuxtLink to="/" >
                <CommonImage
                    src="/logo/logo2.png"
                    alt="logo"
                    class="w-24 h-24"
                />
            </NuxtLink>
        </div>
        <!-- Staff Menu -->
        <WoosooSupportMenu />
    </div>
</template>

<script setup lang="ts">
import { useOrderStore } from '@/stores/Order'

const orderStore = useOrderStore()

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
