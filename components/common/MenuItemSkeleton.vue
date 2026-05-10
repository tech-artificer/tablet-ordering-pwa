<template>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div v-for="i in count" :key="i" class="animate-pulse space-y-2">
            <div class="h-32 bg-white/10 rounded-lg" />
            <div class="h-3 bg-white/10 rounded w-3/4" />
            <div class="h-2.5 bg-white/10 rounded w-1/2" />
        </div>
    </div>
</template>

<script setup lang="ts">
defineProps<{
  count?: number
}>()
</script>
