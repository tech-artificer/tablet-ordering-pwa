<script setup>
import { useAppControl } from '@/composables/useAppControl'
import { FullScreen } from '@element-plus/icons-vue';
const { isFullscreen, toggleFullscreen } = useFullscreen();
// import { useSessionStore } from '@/stores/Session'
import { useConnectionStatus } from "@/stores/ConnectionStatus"
import { useDeviceStore } from '~/stores/Device'
import { useErrorDialogStore } from '~/stores/ErrorDialog'  
// import ServiceRequest from '~/components/ServiceRequest.vue'
// import ErrorDialog from '@/components/ErrorDialog.vue'

const { device } = useDeviceStore()
// console.log('order', useOrderStore().order)
const deviceId = device?.id
const { isVisible, message, title } = useErrorDialogStore()
useAppControl(deviceId)
// PWA Setup
useHead({
    title: 'Wooserve',
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

const handleClose = () => {
    errorDialog.isVisible = false
}

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
   toggleFullscreen();
// const deviceIsMobile = ref(false)
// const categoryStore = useCategoryStore()

onMounted(() => {
    
    // if( !isFullscreen ) {
     
    // }
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
    <!-- <!DOCTYPE html>
    <html lang="en" class="!scroll-smooth">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0 viewport-fit=cover">
        <title>Woosoo - Tablet</title>
    </head>
    <body> -->
    <!-- <div v-if="deviceIsMobile" class="bg-white text-center">
            <CommonLogo />
            <p class="text-xl font-semibold pt-28"> Mobile Device Not allowed </p>
        </div>
        <div v-else>
            <CommonSlideDown
                :show-notification="showNotification"
                :is-really-online="isReallyOnline"
            />
            <main :class="{ 'mt-16': showNotification }" class="relative overflow-hidden">
                <NuxtPage :transition="pageTransition" />
            </main>
        </div> -->

    <div class="min-h-screen min-w-screen z-0 bg-black relative">
        <DeviceInfoBar />
        <div>
        <button @click="toggleFullscreen" class="absolute flex justify-center align-center top-2 left-2 z-20 p-0 bg-white hover:bg-opacity-75 transition">
             <el-icon><FullScreen /></el-icon>
        </button>
        </div> 

        <div class="absolute inset-0 pointer-events-none">
            <img src="/gif/flame.gif" alt="flames" class="absolute opacity-40 p-0 m-0 w-full h-full" />
        </div>
        <!-- Floating food items -->
        <div class="absolute inset-0 pointer-events-none">
            <!-- Top left sushi -->
            <!-- <div class="floating-food absolute animate-float-slow top-left">
                <CommonImage :src="CustomImage.IMAGE_1" alt="sushi rolls" class="floating-image-responsive" />
            </div> -->
            <!-- Top right meat -->
            <!-- <div class="floating-food absolute animate-float-slow top-right">
                <CommonImage :src="CustomImage.IMAGE_4" alt="sushi rolls" class="floating-image-responsive" />
            </div> -->
            <!-- Bottom left fried item -->
            <!-- <div class="floating-food absolute animate-float-slow bottom-left">
                <CommonImage :src="CustomImage.IMAGE_3" alt="sushi rolls" class="floating-image-responsive" />
            </div> -->
            <!-- Bottom right rolled item -->
            <!-- <div class="floating-food absolute animate-float-slow bottom-right">
                <CommonImage :src="CustomImage.IMAGE_2" alt="sushi rolls" class="floating-image-responsive" />
            </div> -->
        </div>

        <div>
           
            <CommonSlideDown :show-notification="showNotification" :is-really-online="isReallyOnline" />
        </div>
        <main :class="{ 'mt-16': showNotification }" class="relative overflow-hidden">
            <NuxtPage :transition="pageTransition" />
        </main>
        <div>
         <el-dialog
            v-model="isVisible"
            :title="title"
            width="30%"
            :before-close="handleClose"
            >
            <span>{{ message }}</span>
            
            <template #footer>
                <span class="dialog-footer">
                <el-button @click="handleClose">OK</el-button>
                </span>
            </template>
            </el-dialog>
        </div>
    </div>

     <!-- <ServiceRequest />  -->
    
    <!-- </body>
    </html> -->
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

@keyframes float-slow {

    0%,
    100% {
        transform: translateY(0px) rotate(0deg);
    }

    50% {
        transform: translateY(-20px) rotate(2deg);
    }
}

@keyframes float-medium {

    0%,
    100% {
        transform: translateY(0px) rotate(12deg);
    }

    50% {
        transform: translateY(-15px) rotate(8deg);
    }
}

@keyframes float-fast {

    0%,
    100% {
        transform: translateY(0px) rotate(-6deg);
    }

    50% {
        transform: translateY(-25px) rotate(-10deg);
    }
}

.animate-float-slow {
    animation: float-slow 6s ease-in-out infinite;
}

.animate-float-medium {
    animation: float-medium 4s ease-in-out infinite;
}

.animate-float-fast {
    animation: float-fast 5s ease-in-out infinite;
}

.floating-food {
    filter: drop-shadow(0 25px 25px rgba(0, 0, 0, 0.5));
}

.floating-food:hover {
    filter: drop-shadow(0 35px 35px rgba(0, 0, 0, 0.7));
}

.floating-image-responsive {
    /* Responsive sizing that works with forced landscape */
    @apply w-24 h-24;
    /* Mobile: 48px */
    @apply sm:w-32 sm:h-32;
    /* Large mobile: 64px */
    @apply md:w-40 md:h-40;
    /* Tablet (forced landscape): 80px */
    @apply lg:w-48 lg:h-48;
    /* Desktop: 96px */
    @apply xl:w-56 xl:h-56;
    /* Large desktop: 112px */
    @apply 2xl:w-64 2xl:h-64;
    /* XL desktop: 128px */

    /* Common properties */
    @apply object-cover transform hover:scale-110 transition-transform duration-300;
    @apply rounded-lg shadow-sm;
    /* Optional styling */
}

.top-left {
    top: clamp(5%, 8vh, 12%);
    left: clamp(5%, 8vw, 12%);
}

.top-right {
    top: clamp(5%, 8vh, 12%);
    right: clamp(5%, 8vw, 12%);
}

.bottom-left {
    bottom: clamp(5%, 8vh, 12%);
    left: clamp(5%, 8vw, 12%);
}

.bottom-right {
    bottom: clamp(5%, 8vh, 12%);
    right: clamp(5%, 8vw, 12%);
}

/* Corrected the values to fit the class names */

/* Special handling for forced landscape tablets */
@media screen and (min-width: 768px) and (max-width: 1024px) {
    .floating-image-responsive {
        /* Use viewport units for rotated screens */
        width: clamp(120px, 14vh, 180px);
        height: clamp(120px, 14vh, 180px);
    }

    .top-left {
        top: 8%;
        left: 6%;
    }

    .top-right {
        top: 8%;
        right: 6%;
    }

    .bottom-left {
        bottom: 8%;
        left: 6%;
    }

    .bottom-right {
        bottom: 8%;
        right: 6%;
    }


}
</style>
