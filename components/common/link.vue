<template>
    <div class="flex justify-center gap-2">
        <div>
            <NuxtLink :to="to">{{ name }}</NuxtLink>
        </div>
    </div>
</template>

<script setup>
defineProps({
    to: {
        type: String,
        default: '/'
    },
    name: {
        type: String,
        default: 'Link'
    }
})
</script>
