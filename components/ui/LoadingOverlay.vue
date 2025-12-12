<script setup lang="ts">
defineProps<{
  visible: boolean
  message?: string
  fullScreen?: boolean
}>()
</script>

<template>
  <Transition name="fade">
    <div 
      v-if="visible"
      :class="[
        'flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-sm z-50',
        fullScreen ? 'fixed inset-0' : 'absolute inset-0 rounded-2xl'
      ]"
    >
      <!-- Animated spinner -->
      <div class="relative">
        <div class="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <div class="w-6 h-6 rounded-full bg-primary/30 animate-pulse"></div>
        </div>
      </div>
      
      <!-- Message -->
      <p v-if="message" class="text-white/80 text-sm font-medium animate-pulse">
        {{ message }}
      </p>
    </div>
  </Transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
