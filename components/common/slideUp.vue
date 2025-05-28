<template>
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
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useConnectionStatus } from "@/stores/ConnectionStatus"

const connectionStatus = useConnectionStatus()
const { offlineProgress } = storeToRefs(connectionStatus)

defineProps({
    isOnline: {
        type: Boolean,
        required: true
    }
})
</script>

<style scoped>
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
