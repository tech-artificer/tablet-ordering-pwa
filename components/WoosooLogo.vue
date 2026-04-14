<script setup lang="ts">
const logoSrc = new URL('../assets/images/logo/woosoo-icon-color.png', import.meta.url).href

const showLogoImage = ref(true)
</script>

<template>
    <div class="rounded-full flex items-center justify-center p-2">
        <img
            v-if="showLogoImage"
            :src="logoSrc"
            alt="Woosoo Logo"
            class="w-32 h-auto object-cover"
            @error="showLogoImage = false"
        />
        <div
            v-else
            class="px-4 py-2 rounded-full bg-white/10 border border-white/20 text-white font-bold tracking-wide"
        >
            WOOSOO
        </div>
    </div>
</template>