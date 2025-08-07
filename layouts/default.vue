<template>
    <!DOCTYPE html>
    <html lang="en" class="!scroll-smooth">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0 viewport-fit=cover">
        <title>Woosoo - Tablet</title>
    </head>
    <body>
        <div v-if="deviceIsMobile" class="bg-white text-center">
            <CommonLogo />
            <p class="text-xl font-semibold pt-28"> Mobile Device Not allowed </p>
        </div>
        <div v-else>
            <CommonSlideDown
                :show-notification="showNotification"
                :is-really-online="isReallyOnline"
            />
            <main :class="{ 'mt-16': showNotification }">
                <slot />
            </main>
        </div>
    </body>
    </html>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useConnectionStatus } from "@/stores/ConnectionStatus"
import { useCategoryStore } from '@/stores/Category'
import { useMyDeviceStore } from '@/stores/Device'
import { useCartStore } from '@/stores/Cart'
import { useOrderStore } from '@/stores/Order'

// PWA Setup
useHead({
    title: 'Woosoo',
    meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        { name: 'description', content: 'Woosoo is a web application that allows users to order food from restaurants.' },
    ],
    link: [
        // Manifest
        { rel: 'manifest', href: 'manifest.webmanifest' },
        // Icons
        { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/icons/android-launchericon-48-48.png' },
        { rel: 'icon', type: 'image/png', sizes: '72x72', href: '/icons/android-launchericon-72-72.png' },
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/icons/android-launchericon-96-96.png' },
        { rel: 'icon', type: 'image/png', sizes: '144x144', href: '/icons/android-launchericon-144-144.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/android-launchericon-192-192.png' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/icons/android-launchericon-512-512.png' },
        { rel: 'apple-touch-icon', href: '/icons/android-launchericon-192-192.png' },
    ],
})

const connectionStatus = useConnectionStatus()

const {
    showNotification,
    isReallyOnline
} = storeToRefs(connectionStatus)

const {
    updateOnlineStatus,
    stopOfflineProgress
} = connectionStatus

const deviceIsMobile = ref(false)
const categoryStore = useCategoryStore()
const orderStore = useOrderStore()


onMounted(() => {
    categoryStore.getStaticCategories()
    deviceIsMobile.value = window.innerWidth < 480
    window.addEventListener('resize', () => {
        deviceIsMobile.value = window.innerWidth < 480
    })
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    if (navigator.onLine) {
        updateOnlineStatus()
    }
})

onUnmounted(() => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
    stopOfflineProgress()
})
</script>
