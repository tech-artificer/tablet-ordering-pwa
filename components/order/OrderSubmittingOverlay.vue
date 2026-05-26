<script setup lang="ts">
import { Hourglass } from "lucide-vue-next"

withDefaults(defineProps<{
  title?: string
  subtitle?: string
  cancellable?: boolean
}>(), {
    title: "Placing Order",
    subtitle: "Sending to grill station…",
    cancellable: true,
})

defineEmits<{ cancel: [] }>()
</script>

<template>
    <Transition name="overlay-fade" appear>
        <div
            class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="placing-order-title"
            aria-describedby="placing-order-subtitle"
        >
            <div class="relative flex flex-col items-center gap-5 px-12 py-10 rounded-2xl border border-primary/25 bg-secondary shadow-2xl shadow-primary/20 max-w-md w-[min(420px,calc(100vw-2rem))]">
                <!-- Halo + icon -->
                <div class="relative flex items-center justify-center w-20 h-20">
                    <span class="absolute inset-0 rounded-full border-2 border-primary/40" />
                    <span class="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin-slow" />
                    <Hourglass class="w-9 h-9 text-primary animate-pulse-soft" stroke-width="1.75" />
                </div>

                <!-- Title -->
                <h2
                    id="placing-order-title"
                    class="text-xl font-extrabold font-raleway uppercase tracking-[0.22em] text-primary text-center"
                >
                    {{ title }}
                </h2>

                <!-- Subtitle -->
                <p
                    id="placing-order-subtitle"
                    class="text-sm text-white/55 text-center -mt-1"
                >
                    {{ subtitle }}
                </p>

                <!-- Cancel -->
                <button
                    v-if="cancellable"
                    type="button"
                    class="mt-2 px-7 py-2.5 rounded-lg border border-primary/40 text-primary font-semibold text-sm font-raleway tracking-wide hover:bg-primary/10 active:scale-[0.97] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    @click="$emit('cancel')"
                >
                    Cancel
                </button>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.22s ease;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

@keyframes spin-slow {
  to { transform: rotate(360deg); }
}
.animate-spin-slow {
  animation: spin-slow 1.6s linear infinite;
}

@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}
.animate-pulse-soft {
  animation: pulse-soft 1.8s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-spin-slow,
  .animate-pulse-soft {
    animation: none;
  }
}
</style>
