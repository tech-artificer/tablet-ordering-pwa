<template>
    <div class="p-2 flex flex-col items-center w-full">
        <div
            class="flex flex-col items-center justify-center w-full bg-white text-black hover:text-white rounded-lg cursor-pointer hover:bg-primary transition-colors"
            @click="handleSupport"
        >
            <CommonImage
                :src="image"
                :alt="title"
                :style-class="'w-8 h-8 max-h-8 max-w-8'"
            />
            <span class="font-medium text-sm tex-center">{{ title }}</span>
        </div>
    </div>
</template>

<script setup>
    defineProps({
        title: {
            type: String,
            required: true
        },
        image: {
            type: String,
            required: true
        }
    })
    const emit = defineEmits(['handleSupport'])
    const handleSupport = () => {
        emit('handleSupport')
    }
</script>

<style>

</style>
