<template>
  <div class="grid grid-cols-2 gap-6">
    <div v-for="i in count" :key="i" class="animate-pulse space-y-4">
      <div class="h-48 bg-white/10 rounded-xl"></div>
      <div class="h-6 bg-white/10 rounded w-3/4"></div>
      <div class="h-4 bg-white/10 rounded w-1/2"></div>
      <div class="h-4 bg-white/10 rounded w-2/3"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  count?: number
}>()
</script>
