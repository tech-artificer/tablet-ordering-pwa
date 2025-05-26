<template>
    <div>
        <CommonLabel v-if="label" :for="label">
            {{ label.charAt(0).toUpperCase() + label.slice(1) }}
        </CommonLabel>
        <div class="flex justify-center gap-2">
            <div>
                <NuxtLink :to="to">{{ name }}</NuxtLink>
            </div>
        </div>
    </div>
</template>

<script setup>
defineProps({
    label: {
        type: String,
        default: null
    },
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
