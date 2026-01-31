<template>
  <div class="grid grid-cols-3 gap-4">
    <div v-for="i in count" :key="i" class="animate-pulse space-y-2">
      <div class="h-20 bg-white/10 rounded-lg"></div>
      <div class="h-4 bg-white/10 rounded w-3/4"></div>
      <div class="h-4 bg-white/10 rounded w-1/2"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  count?: number
}>()
</script>
