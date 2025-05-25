<template>
    <p :class="['text-text-', type]">
        <slot/>
    </p>
</template>
<script setup>
defineProps({
    type: {
        type: String,
        default: 'primary'
    }
})
</script>
