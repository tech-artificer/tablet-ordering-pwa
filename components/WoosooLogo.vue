<script setup lang="ts">
const logoSrc = new URL("../assets/images/logo/woosoo-icon-color.png", import.meta.url).href
const showLogoImage = ref(true)
</script>

<template>
    <div class="flex items-center justify-center">
        <img
            v-if="showLogoImage"
            :src="logoSrc"
            alt="Woosoo Logo"
            width="128"
            height="128"
            class="w-32 h-auto object-contain"
            @error="showLogoImage = false"
        >
        <div
            v-else
            class="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white font-bold tracking-wide"
        >
            WOOSOO
        </div>
    </div>
</template>
