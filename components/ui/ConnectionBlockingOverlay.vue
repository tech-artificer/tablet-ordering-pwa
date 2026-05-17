<script setup lang="ts">
import { computed } from "vue"
import { useConnectionStore } from "~/stores/Connection"
import { ERROR_MESSAGES } from "~/constants/errorMessages"

const connectionStore = useConnectionStore()

const isVisible = computed(() => connectionStore.blocking)

const overlayContent = computed(() => {
    const phase = connectionStore.phase as any

    if (phase === "escalated") {
        return {
            icon: "⚠️",
            title: "Unable to Connect",
            message: ERROR_MESSAGES.CONNECTIVITY_LOST_ESCALATED,
            subtitle: "Please ask a staff member for assistance.",
        }
    }

    if (!connectionStore.online) {
        return {
            icon: "📡",
            title: "No Internet Connection",
            message: ERROR_MESSAGES.NO_INTERNET_CONNECTION,
            subtitle: "Trying to reconnect…",
        }
    }

    return {
        icon: "🔄",
        title: "Reconnecting",
        message: ERROR_MESSAGES.RECONNECTING_TO_SYSTEM,
        subtitle: `Attempt ${connectionStore.reconnectAttempt}…`,
    }
})
</script>

<template>
    <Teleport to="body">
        <Transition name="fade">
            <div
                v-if="isVisible"
                class="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm"
                role="status"
                aria-live="polite"
                aria-label="Connection overlay"
            >
                <!-- Content wrapper -->
                <div class="text-center px-8 pointer-events-none">
                    <!-- Icon -->
                    <div class="text-6xl mb-6 animate-pulse">
                        {{ overlayContent.icon }}
                    </div>

                    <!-- Title -->
                    <h1 class="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
                        {{ overlayContent.title }}
                    </h1>

                    <!-- Message -->
                    <p class="text-lg md:text-xl text-white/80 mb-2">
                        {{ overlayContent.message }}
                    </p>

                    <!-- Subtitle -->
                    <p class="text-sm md:text-base text-white/60">
                        {{ overlayContent.subtitle }}
                    </p>

                    <!-- Loading indicator for reconnecting phase -->
                    <div v-if="(connectionStore.phase as any) === 'reconnecting'" class="mt-8 flex justify-center gap-1">
                        <div class="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style="animation-delay: 0s" />
                        <div class="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style="animation-delay: 0.15s" />
                        <div class="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style="animation-delay: 0.3s" />
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-bounce {
  animation: bounce 1.4s infinite;
}

@keyframes bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
</style>
