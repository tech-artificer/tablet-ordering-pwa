<script setup lang="ts">
import { ref } from 'vue'
import type { MenuItem, Menu } from '../../types'


const activeCategory = ref()

const props = defineProps<{
    menus: Menu[]
}>()

import { logger } from '../../utils/logger'
logger.debug(props.menus)

const emit = defineEmits<{
  (e: 'select', value: string): void
}>()

function selectCategory(id: string) {

//   activeCategory.value  = cat
    // emit('select', id)
}
</script>

<template>
  <div class="flex gap-3 overflow-x-auto no-scrollbar font-inter font-bold text-white"  v-for="menu in props.menus" >
    <button
      :key="menu.id"
      @click="selectCategory(menu.id)"
      class="px-4 py-1 rounded-lg text-lg font-medium whitespace-nowrap"
      :class="menu.is_active ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'"
    >
      {{ menu.category }}
    </button>

  </div>

   
</template>
