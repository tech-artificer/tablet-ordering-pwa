<script setup lang="ts">
import { useKioskFullscreen } from '~/composables/useKioskFullscreen'

const { showRecovery, recover } = useKioskFullscreen()
</script>

<template>
  <Teleport to="body">
    <Transition name="fs-fade">
      <div
        v-if="showRecovery"
        class="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none cursor-pointer"
        style="background: rgba(10, 7, 4, 0.97);"
        @click="recover"
        @touchstart.prevent="recover"
        role="dialog"
        aria-modal="true"
        aria-label="Session paused — tap to resume"
      >
        <div class="text-center px-10 pointer-events-none">
          <!-- Icon -->
          <div class="w-20 h-20 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center mx-auto mb-8">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 text-primary/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>

          <p class="text-white text-3xl font-bold tracking-tight mb-3">Session Paused</p>
          <p class="text-white/45 text-base leading-relaxed max-w-xs mx-auto">
            Tap anywhere to return to your dining session
          </p>

          <!-- Tap hint pulse -->
          <div class="mt-10 flex justify-center">
            <div class="w-12 h-12 rounded-full border-2 border-primary/40 animate-ping" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fs-fade-enter-active,
.fs-fade-leave-active {
  transition: opacity 0.25s ease;
}
.fs-fade-enter-from,
.fs-fade-leave-to {
  opacity: 0;
}
</style>
