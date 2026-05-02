<script setup lang="ts">
const logoSrc = new URL("../../assets/images/logo/woosoo-icon-color.png", import.meta.url).href

defineProps<{
  visible: boolean
}>()

const dots = [0, 1, 2]
</script>

<template>
    <Transition name="splash-fade" appear>
        <div
            v-if="visible"
            class="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[#0F0F0F]"
            role="status"
            aria-live="polite"
            aria-label="Loading Wooserve"
        >
            <div class="absolute inset-0 splash-grid" />
            <div class="absolute inset-0 splash-noise opacity-30" />
            <div class="absolute -left-20 top-[-10%] h-72 w-72 rounded-full bg-[#F6B56D]/10 blur-3xl" />
            <div class="absolute -right-24 bottom-[-12%] h-96 w-96 rounded-full bg-[#F6B56D]/12 blur-3xl" />

            <div class="relative flex flex-col items-center gap-6 px-6 text-center">
                <div class="relative flex h-36 w-36 items-center justify-center">
                    <div class="absolute inset-0 rounded-full border border-[#F6B56D]/20" />
                    <div class="absolute inset-3 rounded-full border border-[#F6B56D]/10 splash-orbit" />
                    <div class="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(246,181,109,0.22)_0%,rgba(246,181,109,0)_68%)] splash-pulse" />
                    <img
                        :src="logoSrc"
                        alt="Wooserve"
                        class="relative h-24 w-24 object-contain drop-shadow-[0_0_32px_rgba(246,181,109,0.25)]"
                    >
                </div>

                <div class="space-y-2">
                    <p class="text-xs font-semibold uppercase tracking-[0.45em] text-[#F6B56D]/75">
                        Wooserve
                    </p>
                    <h1 class="font-raleway text-4xl font-extrabold tracking-[0.08em] text-white">
                        Welcome to the Grill
                    </h1>
                    <p class="font-kanit text-base tracking-[0.2em] text-white/55 uppercase">
                        Korean BBQ Ordering
                    </p>
                </div>

                <div class="flex items-center gap-3">
                    <span
                        v-for="dot in dots"
                        :key="dot"
                        class="h-2.5 w-2.5 rounded-full bg-[#F6B56D] splash-dot"
                        :style="{ animationDelay: `${dot * 0.16}s` }"
                    />
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.splash-fade-enter-active,
.splash-fade-leave-active {
  transition: opacity 0.6s ease;
}

.splash-fade-enter-from,
.splash-fade-leave-to {
  opacity: 0;
}

.splash-grid {
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at center, black 40%, transparent 85%);
}

.splash-noise {
  background-image: radial-gradient(rgba(255, 255, 255, 0.08) 0.6px, transparent 0.6px);
  background-size: 16px 16px;
}

.splash-orbit {
  animation: splash-spin 16s linear infinite;
}

.splash-pulse {
  animation: splash-pulse 2.2s ease-in-out infinite;
}

.splash-dot {
  animation: splash-dot 0.9s ease-in-out infinite;
}

@keyframes splash-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes splash-pulse {
  0%,
  100% {
    transform: scale(0.94);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.04);
    opacity: 1;
  }
}

@keyframes splash-dot {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  40% {
    transform: translateY(-7px);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .splash-orbit,
  .splash-pulse,
  .splash-dot {
    animation: none;
  }
}
</style>
