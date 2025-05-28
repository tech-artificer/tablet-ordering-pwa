<template>
    <div>
        <CommonSlideDown
            :show-notification="showNotification"
            :is-really-online="isReallyOnline"
        />
        <main :class="{ 'mt-16': showNotification }">
            <slot />
        </main>
        <CommonSlideUp
            :is-really-online="isReallyOnline"
        />
    </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted } from 'vue'
import { useConnectionStatus } from "@/stores/ConnectionStatus"

const connectionStatus = useConnectionStatus()

const {
    showNotification,
    isReallyOnline
} = storeToRefs(connectionStatus)

const {
    updateOnlineStatus,
    stopOfflineProgress
} = connectionStatus

onMounted(() => {
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    // Check internet on initial load
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
