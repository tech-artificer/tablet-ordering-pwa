<script setup lang="ts">
import type { MenuItem } from '~/types/menu'
const menuStore = useMenuStore()

const activeCategory = ref('meats')

const props = defineProps<{
    categories: {
        label: string
        value: string
        items: MenuItem[]
    }[]
}>()

const emit = defineEmits<{
  (e: 'select', value: string): void
}>()

function selectCategory(cat: string) {
  activeCategory.value  = cat
  emit('select', cat)
}
</script>

<template>
  <div class="flex gap-3 overflow-x-auto no-scrollbar font-inter font-bold">
    <button
      v-for="cat in categories"
      :key="cat.value"
      @click="selectCategory(cat.value)"
      class="px-4 py-1 rounded-lg text-lg font-medium whitespace-nowrap"
      :class="activeCategory === cat.value ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'"
    >
      {{ cat.label }}
    </button>
  </div>
</template>
