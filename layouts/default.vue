<template>
    <div v-if="deviceIsMobile" class="bg-white text-center">
        <CommonImage
            src="/logo/logo2.png"
            alt="Logo"
            class="w-24 h-24 mx-auto pt-24"
        />
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
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useConnectionStatus } from "@/stores/ConnectionStatus"
import { useCategoryStore } from '@/stores/Category'
import { useMyDeviceStore } from '@/stores/Device'
import { useCartStore } from '@/stores/Cart'

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
const deviceStore = useMyDeviceStore()
const categoryStore = useCategoryStore()
const cartStore = useCartStore()

onMounted(() => {
    if (!categoryStore.categories.length && !categoryStore.courseTypes.length && !categoryStore.menuGroups.length) {
        categoryStore.getStaticCategories()
        categoryStore.getAllMenuGroups()
    }

    deviceIsMobile.value = window.innerWidth < 480

    window.addEventListener('resize', () => {
        deviceIsMobile.value = window.innerWidth < 480
    })

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    if (navigator.onLine) {
        updateOnlineStatus()
    }

    const handleOrderCreated = (order) => {
        console.log('New order received:', order)
        console.log('Current cart status:', cartStore.cartStatus)

        if (order) {
            cartStore.cartStatus = true
            cartStore.orderStatus = order.status
            console.log('Updated cart status:', cartStore.cartStatus)
        }
    }

    const handleOrderCompleted = (order) => {
        console.log('New order received:', order)
        console.log('Current cart status:', cartStore.cartStatus)

        if (order) {
            cartStore.cartStatus = false
            cartStore.orderStatus = order.status
            console.log('Updated cart status:', cartStore.cartStatus)
        }
    }

    if (window.Echo && deviceStore.device?.device?.id) {
        const deviceId = deviceStore.device.device.id
        console.log('Kitchen Display. Attempting to listen for orders on device:', deviceId)
        console.log('Device store:', deviceStore.device)

            window.Echo.private(`orders.${deviceId}`)
                .listen('.order.created', handleOrderCreated)
                .listen('.order.completed', handleOrderCompleted)
                .error((error) => {
                    console.error('Display.vue: Error connecting to device-specific channel:', error)
                })

            if (window.Echo.connector?.socket) {
                window.Echo.connector.socket.on('connect', () => {
                    console.log('Connected to WebSocket')
                })

                window.Echo.connector.socket.on('disconnect', () => {
                    console.log('Disconnected from WebSocket')
                })
            }

        } else {
            console.error('Display.vue: window.Echo is not available or device ID is missing.')
            console.log('Echo available:', !!window.Echo)
            console.log('Device ID:', deviceStore.device?.device?.id)
        }
})

onUnmounted(() => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
    stopOfflineProgress()
    window.Echo.leave('orders')
})
</script>
