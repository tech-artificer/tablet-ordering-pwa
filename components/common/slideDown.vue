<template>
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
</template>

<script setup>
defineProps({
    showNotification: {
        type: Boolean,
        required: true
    },
    isOnline: {
        type: Boolean,
        required: true
    }
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
