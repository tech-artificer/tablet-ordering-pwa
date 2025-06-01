<template>
    <button class="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-lightGreen active:bg-lightGreen text-black hover:text-white active:text-white">
        <slot/>
        <span>{{ name }}</span>
    </button>
</template>
<script setup>
defineProps({
    name: {
        type: String,
        default: 'please add name example: name="clean"'
    }
})
</script>
