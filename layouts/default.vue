<template>
    <div>
        <CommonSlideDown
            :show-notification="showNotification"
            :is-online="isOnline"
        />
        <main :class="{ 'mt-16': showNotification }">
            <slot />
        </main>
        <CommonSlideUp
            :is-online="isOnline"
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
    isOnline
} = storeToRefs(connectionStatus)

const {
    updateOnlineStatus,
    startOfflineProgress,
    stopOfflineProgress
} = connectionStatus

onMounted(() => {
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    if (!isOnline.value) {
        startOfflineProgress()
    }
})

onUnmounted(() => {
    window.removeEventListener('online', updateOnlineStatus)
    window.removeEventListener('offline', updateOnlineStatus)
    stopOfflineProgress()
})
</script>
