<template>
    <div class="p-2 flex flex-col items-center w-full">
        <div
            class="flex flex-col items-center justify-center w-full rounded-lg cursor-pointer transition-colors"
            :class="isActive ? 'bg-primary text-white' : 'bg-white text-black'"
            @click="handleSupport"
        >
            <CommonImage
                :src="image"
                :alt="title"
                :style-class="'w-8 h-8 max-h-8 max-w-8'"
            />
            <span class="font-medium text-sm text-center">{{ title }}</span>
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
        },
        isActive: {
            type: Boolean,
            default: false
        }
    })

    const emit = defineEmits(['handleSupport'])

    const handleSupport = () => {
        emit('handleSupport')
    }
</script>
