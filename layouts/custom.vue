<script setup>
import { storeToRefs } from 'pinia'
import { useConnectionStatus } from "@/stores/ConnectionStatus"
// import { useCategoryStore } from '@/stores/Category'
// import { useGuestStore } from '@/stores/Guest'
// import { useOrderStore } from '@/stores/Order'
import ServiceRequest from '~/components/ServiceRequest.vue'

// console.log('order', useOrderStore().current_order?.order)

// PWA Setup
useHead({
    title: 'Woosoo',
    meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0 viewport-fit=cover' },
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
    class: 'scroll-smooth'
})

const connectionStatus = useConnectionStatus()
const route = useRoute()

const {
    showNotification,
    isReallyOnline
} = storeToRefs(connectionStatus)

const {
    updateOnlineStatus,
    stopOfflineProgress
} = connectionStatus

// Navigation direction detection
const direction = ref('forward')
const routeHistory = ref([])

// Track navigation direction
watch(() => route.fullPath, (newPath, oldPath) => {
    if (!oldPath) {
        direction.value = 'forward'
        return
    }

    // Check if this is a back navigation
    const historyIndex = routeHistory.value.indexOf(newPath)
    if (historyIndex !== -1 && historyIndex < routeHistory.value.length - 1) {
        direction.value = 'back'
        // Remove routes after the current one from history
        routeHistory.value = routeHistory.value.slice(0, historyIndex + 1)
    } else {
        direction.value = 'forward'
        // Add new route to history if it's not already there
        if (!routeHistory.value.includes(newPath)) {
            routeHistory.value.push(newPath)
        }
    }
})

// Page transition configuration
const pageTransition = computed(() => ({
    name: direction.value === 'forward' ? 'slide-left' : 'slide-right',
    mode: 'out-in'
}))

const deviceIsMobile = ref(false)
// const categoryStore = useCategoryStore()

onMounted(() => {
    // categoryStore.getStaticCategories()
    // deviceIsMobile.value = window.innerWidth < 480

    // Initialize route history
    routeHistory.value = [route.fullPath]

    // Handle browser back button
    window.addEventListener('popstate', () => {
        direction.value = 'back'
    })

    window.addEventListener('resize', () => {
        // deviceIsMobile.value = window.innerWidth < 480
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
    window.removeEventListener('popstate', () => { })
    stopOfflineProgress()
})
</script>

<template>
    <div class="min-h-screen min-w-screen">
        <CommonSlideDown :show-notification="showNotification" :is-really-online="isReallyOnline" />
        
        <main :class="{ 'mt-16': showNotification }" class="relative overflow-hidden">
            <NuxtPage :transition="pageTransition" />
        </main>
        <!-- <ServiceRequest /> -->
  
    </div>

</template>



<style scoped>
/* Slide Left Animation (Forward Navigation) */
.slide-left-enter-active,
.slide-left-leave-active {
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease;
}

.slide-left-enter-from {
    transform: translateX(100%);
    opacity: 0;
}

.slide-left-enter-to {
    transform: translateX(0);
    opacity: 1;
}

.slide-left-leave-from {
    transform: translateX(0);
    opacity: 1;
}

.slide-left-leave-to {
    transform: translateX(-100%);
    opacity: 0;
}

/* Slide Right Animation (Back Navigation) */
.slide-right-enter-active,
.slide-right-leave-active {
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s ease;
}

.slide-right-enter-from {
    transform: translateX(-100%);
    opacity: 0;
}

.slide-right-enter-to {
    transform: translateX(0);
    opacity: 1;
}

.slide-right-leave-from {
    transform: translateX(0);
    opacity: 1;
}

.slide-right-leave-to {
    transform: translateX(100%);
    opacity: 0;
}

/* Ensure smooth hardware acceleration */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
    backface-visibility: hidden;
    will-change: transform, opacity;
    transform-style: preserve-3d;
}


/* Custom scrollbar for webkit browsers */
::-webkit-scrollbar {
    width: 8px;
}

::-webkit-scrollbar-track {
    @apply bg-gray-100 dark:bg-gray-800;
}

::-webkit-scrollbar-thumb {
    @apply bg-gray-400 dark:bg-gray-600 rounded-lg;
}

::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-500 dark:bg-gray-500;
}

/* Smooth transitions */
* {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
}



</style>
