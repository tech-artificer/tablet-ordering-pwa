<template>
  <div class="glass-card rounded-2xl overflow-hidden animate-pulse">
    <div class="aspect-video bg-gradient-to-r from-white/5 via-white/10 to-white/5 animate-shimmer"></div>
    <div class="p-4 space-y-3">
      <div class="h-6 bg-white/10 rounded animate-shimmer"></div>
      <div class="h-4 w-2/3 bg-white/10 rounded animate-shimmer" style="animation-delay: 0.1s"></div>
      <div class="flex gap-2 mt-4">
        <div class="flex-1 h-10 bg-white/10 rounded-lg animate-shimmer" style="animation-delay: 0.2s"></div>
        <div class="w-10 h-10 bg-white/10 rounded-lg animate-shimmer" style="animation-delay: 0.15s"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0%, 100% {
    background-position: -1000px 0;
  }
  50% {
    background-position: 1000px 0;
  }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
  background-size: 200% 100%;
  background-image: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}
</style>
