<template>
    <!-- Void State -->
    <div class="order-void">
        <div class="flex justify-center">
            <CommonLogo />
        </div>

        <h2 class="text-2xl font-bold mt-10">{{ title }}</h2>
        <p class="text-center"> {{  description  }}</p>
    </div>
</template>
<script setup>
defineProps({
    title: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
})
</script>
<style scope>

</style>
