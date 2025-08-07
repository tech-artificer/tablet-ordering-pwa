<template>
    <div
        class="flex items-center space-x-3"
    >
        <img
            :src="image"
            :alt="name || 'Order item'"
            class="w-6 h-6 object-cover rounded-lg"
            loading="lazy"
            @error="$event.target.src = '/images/'+CustomLogo.LOGO_2"
        >
        <div class="flex-1">
            <h4 class="font-medium">{{ name }}</h4>
            <p class="text-sm text-gray-500">{{ description }}</p>
        </div>
        <div class="text-right">
            <span class="font-medium">₱{{ (price * quantity).toFixed(2) }}</span>
        </div>
        <div class="text-center">
            <p class="text-xs text-gray-500">x {{ quantity }}</p>
        </div>
    </div>
</template>

<script setup>
defineProps({
    name: {
        type: String,
        default: null
    },
    description: {
        type: String,
        default: null
    },
    image: {
        type: String,
        default: null
    },
    price: {
        type: Number,
        default: 0
    },
    quantity: {
        type: Number,
        default: 0
    }
})
</script>
