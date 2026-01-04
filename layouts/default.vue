<script setup lang="ts">
// Smooth page transitions are handled by CSS in main.css
import NetworkIndicator from '~/components/NetworkIndicator.vue'
</script>

<template>
  <div class="min-h-screen min-w-screen flex items-center justify-center overflow-hidden bg-with-overlay">
    <NetworkIndicator />
    <Transition name="slide-left" mode="out-in" appear>
      <div :key="$route.path" class="h-screen w-screen z-10 overflow-hidden relative bg-gray-950/80 backdrop-blur-sm safe-area-top safe-area-bottom">
        <slot />
      </div>
    </Transition>

    <!-- Ambient flame effect -->
    <div class="absolute inset-0 pointer-events-none">
      <img src="/gif/flame.gif" alt="" class="absolute opacity-40 p-0 m-0 w-full h-50" aria-hidden="true" />
    </div>
  </div>
</template>

<style>
.bg-with-overlay {
  background-image: url('/images/cover.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}
</style>