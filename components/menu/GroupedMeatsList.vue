<script setup lang="ts">
import  { computed } from 'vue';
import type { MenuItem, Modifier } from '../../types';
import MenuItemGrid from './MenuItemGrid.vue';
import { ElBadge, ElEmpty } from 'element-plus';

const props = defineProps<{
  meats: Modifier[];
  getItemQuantity: (id: number) => number;
  maxQuantity?: number;
}>();

const emit = defineEmits<{
  'addItem': [item: MenuItem | Modifier];
}>();

const addItem = (item: MenuItem | Modifier) => {
  emit('addItem', item);
};

// Group meats by category
const groupedMeats = computed(() => {
  const groups: Record<string, Modifier[]> = {};
  props.meats.forEach((meat: Modifier) => {
    const category = meat.group || 'OTHER';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(meat);
  });
  return groups;
});

const groupsArray = computed(() => {
  return Object.entries(groupedMeats.value).map(([category, items]) => ({
    category,
    items
  }));
});
</script>

<template>
  <div v-if="groupsArray.length > 0" class="space-y-8">
    <div v-for="group in groupsArray" :key="group.category" class="space-y-4">
      <!-- Section header -->
      <div class="flex items-center gap-3">
        <h3 class="text-xl font-bold text-white uppercase tracking-wide">{{ group.category }} (<small class="text-primary font-semibold">{{ group.items.length }}</small>)</h3>
      </div>

      <!-- Items grid -->
      <menu-item-grid
        :items="group.items"
        category-type="meats"
        :is-unlimited-category="true"
        :get-item-quantity="getItemQuantity"
        :max-quantity="maxQuantity"
        @add-item="addItem" />
    </div>
  </div>

  <!-- Empty state -->
  <el-empty v-else description="No meats available" class="py-20">
    <template #image>
      <div class="text-6xl">🥩</div>
    </template>
  </el-empty>
</template>
