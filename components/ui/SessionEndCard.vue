<script setup lang="ts">
import { PartyPopper } from "lucide-vue-next"
import { computed } from "vue"
import { useKioskFullscreen } from "~/composables/useKioskFullscreen"

const props = defineProps<{
  icon: string
  title: string
  message: string
  orderNumber?: string | null
  countdown: number
  isFinalizing: boolean
}>()

defineEmits<{ returnHome: [] }>()

const { isFullscreen, recover } = useKioskFullscreen()

const progressPercent = computed(() => {
    if (props.isFinalizing) { return 0 }
    return Math.max(0, Math.min(100, (props.countdown / 5) * 100))
})
</script>

<template>
    <div class="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8">
        <Transition name="fade-up" appear>
            <div class="flex flex-col items-center gap-8 max-w-2xl w-full text-center">
                <!-- Circular gold disc with party popper -->
                <div class="flex items-center justify-center w-28 h-28 rounded-full bg-primary">
                    <PartyPopper class="w-12 h-12 text-secondary" />
                </div>

                <!-- Caption -->
                <p class="text-xs font-bold text-primary tracking-[0.3em] uppercase">
                    Until Next Time
                </p>

                <!-- Hero text -->
                <div class="space-y-2">
                    <h1 class="text-6xl font-serif italic text-primary">
                        {{ title }}
                    </h1>
                    <p class="text-5xl font-bold font-raleway text-white">
                        {{ message }}
                    </p>
                </div>

                <!-- Subtitle -->
                <div class="text-white/55 text-sm leading-relaxed max-w-md">
                    <p v-if="orderNumber" class="mb-2">
                        Order #{{ orderNumber }}
                    </p>
                    <p v-if="!isFinalizing">
                        Returning to the welcome screen…
                    </p>
                </div>

                <!-- Progress bar or finalizing text -->
                <div v-if="!isFinalizing" class="w-[280px]">
                    <div class="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                            class="h-full bg-primary rounded-full transition-all"
                            :style="{ width: `${progressPercent}%` }"
                            style="transition-duration: 1000ms; transition-timing-function: linear"
                        />
                    </div>
                </div>

                <p v-else class="text-white/40 text-sm">
                    Finalizing…
                </p>

                <!-- Restore Kiosk Mode button (only when not fullscreen) -->
                <button
                    v-if="!isFullscreen"
                    class="mt-8 py-3 px-8 rounded-lg border border-primary text-primary font-medium font-raleway hover:bg-primary/10 active:scale-95 transition-transform"
                    @click="recover"
                >
                    Restore Kiosk Mode
                </button>
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
