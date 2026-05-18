<script setup lang="ts">
import { useKioskFullscreen } from "~/composables/useKioskFullscreen"

const props = defineProps<{
  icon: string
  title: string
  message: string
  orderNumber?: string | null
  countdown: number
  isFinalizing: boolean
}>()

const emit = defineEmits<{ returnHome: [] }>()

const { isFullscreen, recover } = useKioskFullscreen()
</script>

<template>
    <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8">
        <Transition name="fade-up" appear>
            <div class="flex flex-col items-center gap-6 max-w-lg w-full text-center">
                <div class="text-7xl" aria-hidden="true">
                    {{ icon }}
                </div>

                <h1 class="text-4xl font-bold tracking-tight font-raleway">
                    {{ title }}
                </h1>

                <p v-if="orderNumber" class="text-lg text-white/60">
                    Order {{ orderNumber }}
                </p>

                <p class="text-xl text-white/80 leading-relaxed">
                    {{ message }}
                </p>

                <div v-if="isFinalizing" class="text-white/50 text-sm mt-2">
                    Finalizing session...
                </div>

                <div v-else class="flex flex-col items-center gap-4 mt-4 w-full">
                    <p class="text-white/50 text-sm">
                        Returning to welcome screen in {{ countdown }}s
                    </p>

                    <button
                        class="w-full max-w-xs py-4 px-8 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 transition-transform text-white font-semibold text-lg border border-white/20 font-raleway"
                        @click="emit('returnHome')"
                    >
                        Back to Welcome Now
                    </button>

                    <!-- Fullscreen recovery button (shown when not in fullscreen) -->
                    <button
                        v-if="!isFullscreen"
                        class="w-full max-w-xs py-3 px-6 rounded-xl bg-primary/20 hover:bg-primary/30 active:scale-95 transition-transform text-primary font-medium text-base border border-primary/30 font-raleway flex items-center justify-center gap-2"
                        @click="recover"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            stroke-width="2"
                        >
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                        Restore Kiosk Mode
                    </button>
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.fade-up-enter-active {
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(24px);
}

@media (prefers-reduced-motion: reduce) {
  .fade-up-enter-active { transition: opacity 0.3s ease; }
  .fade-up-enter-from { transform: none; }
}
</style>
