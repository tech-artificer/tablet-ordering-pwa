<template>
    <CommonButton
        :name="name"
        type="primary"
    />
</template>
<script setup>
defineProps({
    name: {
        type: String,
        default: 'Woosoo-Button'
    }
})
</script>

