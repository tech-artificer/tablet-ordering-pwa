<template>
    <Transition name="slide-down">
        <div
            v-if="showNotification"
            :class="[
                'fixed top-0 left-0 right-0 z-50 p-4 text-white text-center transition-all duration-500',
                isReallyOnline ? 'bg-green-500' : 'bg-red-500'
            ]"
        >
            {{ isReallyOnline ? '🟢 Connected to internet' : '🔴 No internet connection' }}
        </div>
    </Transition>
</template>

<script setup>
defineProps({
    showNotification: {
        type: Boolean,
        required: true
    },
    isReallyOnline: {
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
</style>
