<template>
    <div class="relative rounded-2xl overflow-hidden w-50 h-48">
        <!-- Background Image -->
        <div
            class="absolute inset-0 bg-cover bg-center"
            :style="{
                backgroundImage: image ? `url(${image})` : 'white'
            }"
            @error="handleImageError"
        />

        <!-- Orange Gradient Overlay -->
        <div class="absolute inset-0 bg-gradient-to-r from-orange-300 to-orange-0" />

        <!-- Content Layer -->
        <div class="relative flex flex-col justify-end text-white p-8">
            <p class="text-sm opacity-90 mb-2 font-light tracking-wide">{{ category || 'Product of the day' }}</p>
            <h1 class="text-4xl font-bold mb-2 text-gray-800">{{ name }}</h1>
            <p class="text-lg font-light mt-10">₱{{ price }}</p>
        </div>
    </div>
</template>

<script setup>
defineProps({
name: {
    type: String,
    default: 'Beef Bulgogi'
},
price: {
    type: Number,
    default: 299
},
category: {
    type: String,
    default: 'Product of the day'
},
image: {
    type: String,
    default: '/images/logo/logo2.png'
}
})
const handleImageError = (event) => {
    event.target.src = '/images/logo/logo2.png'
}
</script>
