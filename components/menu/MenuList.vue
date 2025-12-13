<template>
  <div class="space-y-4">
    <h2 class="text-2xl font-bold text-kbbqGold">{{ title }}</h2>
    <div class="grid grid-cols-1 gap-4">
      <MenuItemCard v-for="i in items" :key="i.id" :item="i" @add="$emit('add', $event)" @view="$emit('view', $event)" />
    </div>
  </div>
</template>

<script setup>
import MenuItemCard from './MenuItemCard.vue'
const props = defineProps({ title: String, items: Array })
</script>
