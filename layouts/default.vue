<script setup lang="ts">
// Smooth page transitions are handled by CSS in main.css
import flameSrc from '~/assets/images/flame.gif'
const showFlame = ref(true)
const route = useRoute()
</script>

<template>
  <div class="min-h-screen min-w-screen flex items-center justify-center overflow-hidden bg-with-overlay">
    <NetworkIndicator />
    <Transition name="slide-left" mode="out-in" appear>
      <div :key="route.path" class="h-screen w-screen z-10 overflow-hidden relative bg-gray-950/80 backdrop-blur-sm safe-area-top safe-area-bottom">
        <slot />
      </div>
    </Transition>

    <!-- Ambient flame effect (z-20 = above page content; pointer-events-none = non-interactive) -->
    <div class="absolute inset-0 pointer-events-none z-20">
      <img
        v-if="showFlame"
        :src="flameSrc"
        alt=""
        class="absolute opacity-25 p-0 m-0 w-full h-full object-cover mix-blend-screen"
        aria-hidden="true"
        @error="showFlame = false"
      />
    </div>
  </div>
</template>

<style>
.bg-with-overlay {
  background-color: #0D0D0D;
  background-image:
    repeating-linear-gradient(rgba(255, 255, 255, 0.04) 0px, transparent 1px, transparent 40px),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0px, transparent 1px, transparent 40px),
    radial-gradient(ellipse at top, rgba(55, 65, 81, 0.65), rgba(17, 24, 39, 0.92));
  background-size: auto;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}
</style>