<template>
    <div class="w-full min-h-[200px]">
        <!-- Logo Section -->
        <div class="p-6 border-b flex justify-center">
            <NuxtLink to="/" >
                <CommonLogo />
            </NuxtLink>
        </div>
        <!-- Staff Menu -->
        <WoosooSupportMenu />
    </div>
</template>

<script setup>
const isLoading = ref(true)

onMounted(async () => {
    try {
        setTimeout(() => {
            isLoading.value = false
        }, 1500)
    } catch (error) {
        console.error('Error loading orders:', error)
        isLoading.value = false
    }
})
</script>
