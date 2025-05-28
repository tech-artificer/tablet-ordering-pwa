<template>
    <div>
        <Transition name="slide-down">
            <div
                v-if="showNotification"
                :class="[
                    'fixed top-0 left-0 right-0 z-50 p-4 text-white text-center transition-all duration-500',
                    isOnline ? 'bg-green-500' : 'bg-red-500'
                ]"
            >
                {{ isOnline ? '🟢 Connected to internet' : '🔴 You are offline' }}
            </div>
        </Transition>
        <main :class="{ 'mt-16': showNotification }">
            <slot />
        </main>
        <Transition name="slide-up">
            <div
            v-if="!isOnline"
            class="fixed bottom-0 left-0 right-0 bg-red-500 h-2 z-40"
            >
                <div
                    class="h-full bg-red-300 animate-pulse"
                    :style="`width: ${offlineProgress}%`"
                />
            </div>
        </Transition>
    </div>
    </template>

<script setup>
    const isOnline = ref(navigator.onLine)
    const showNotification = ref(false)
    const offlineProgress = ref(0)
    let progressInterval = null
    const updateOnlineStatus = () => {
        const wasOffline = !isOnline.value
        isOnline.value = navigator.onLine
        showNotification.value = true
        setTimeout(() => {
            showNotification.value = false
        }, 3000)
        if (!isOnline.value) {
            startOfflineProgress()
        } else {
            stopOfflineProgress()
            if (wasOffline) {
                showConnectedNotification()
            }
            if (wasOffline) {
                showConnectedNotification()
            }
        }
    }
    const startOfflineProgress = () => {
        offlineProgress.value = 0
        progressInterval = setInterval(() => {
            offlineProgress.value = (offlineProgress.value + 1) % 101
        }, 100)
    }
    const stopOfflineProgress = () => {
        if (progressInterval) {
            clearInterval(progressInterval)
            progressInterval = null
        }
        offlineProgress.value = 0
    }
    const showConnectedNotification = () => {
        showNotification.value = true
        setTimeout(() => {
            showNotification.value = false
        }, 3000)
    }
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

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
    transition: transform 0.5s ease;
}
.slide-down-enter-from {
    transform: translateY(-100%);
}
.slide-down-leave-to {
    transform: translateY(-100%);
}
.slide-up-enter-active,
.slide-up-leave-active {
    transition: transform 0.3s ease;
}
.slide-up-enter-from {
    transform: translateY(100%);
}
.slide-up-leave-to {
    transform: translateY(100%);
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.7;
    }
}
.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
