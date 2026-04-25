<template>
    <button class="btn-primary ui-hover-lift" :aria-label="name">
        {{ name }}
    </button>
</template>

<script setup>
    defineProps({
        name: {
            type: String,
            default: 'Test'
        },
        type: {
            type: String,
            default: 'primary'
        },
        plain: {
            type: Boolean,
            default: false
        },
        round: {
            type: Boolean,
            default: false
        }
    })
</script>
