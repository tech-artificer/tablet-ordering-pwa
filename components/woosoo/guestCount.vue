<template>
    <div>
        <div class="relative">
            <input
                v-model="vModel"
                type="number"
                placeholder="Number of guest"
                class="w-full px-6 py-4 rounded-md bg-white text-gray-800 text-lg font-bold text-center focus:outline-none focus:ring-4 focus:ring-orange-500/50 transition-all duration-300"
                min="1"
                max="20"
            >
            <div class="absolute right-4 top-1/2 transform -translate-y-1/2 flex space-x-2">
                <button
                    class="w-6 h-6 bg-gray-300 rounded-full text-white"
                    @click="vModel > 1 ? vModel-- : null"
                >
                    -
                </button>
                <button
                    class="w-6 h-6 bg-orange-500 rounded-full text-white"
                    @click="vModel < 20 ? vModel++ : null"
                >
                    +
                </button>
            </div>
        </div>
    </div>
</template>
<script setup>
const vModel = defineModel('v-model', {
    type: Number,
    default: 1
})
</script>
