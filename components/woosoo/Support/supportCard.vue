<template>
    <div class="p-2 flex flex-col items-center w-full px-8">
        <div
            class="flex flex-col items-center justify-center w-full bg-white text-black hover:text-white rounded-lg cursor-pointer hover:bg-primary transition-colors"
            @click="handleSupport"
        >
            <CommonImage
                :src="image"
                :alt="title"
                :style-class="'w-16 h-16'"
            />
            <span class="font-medium">{{ title }}</span>
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
