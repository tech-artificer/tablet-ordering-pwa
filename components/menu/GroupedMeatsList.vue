<script setup lang="ts">
import { computed, ref } from 'vue'
import type { MenuItem, Modifier } from '../../types';
import MenuItemGrid from './MenuItemGrid.vue';
import { ElBadge, ElEmpty } from 'element-plus';

const props = defineProps<{
  meats: Modifier[];
  getItemQuantity: (id: number) => number;
  maxQuantity?: number;
  loading?: boolean;
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

// Sub-category filter
const activeGroup = ref<string | null>(null)
const availableGroups = computed(() => Object.keys(groupedMeats.value))
const filteredGroups = computed(() => {
  if (!activeGroup.value) return groupsArray.value
  return groupsArray.value.filter(g => g.category === activeGroup.value)
})
</script>

<template>
  <div v-if="props.loading" class="space-y-6">
    <menu-item-grid
      :items="[]"
      category-type="meats"
      :is-unlimited-category="true"
      :get-item-quantity="getItemQuantity"
      :max-quantity="maxQuantity"
      :loading="true"
    />
  </div>

  <div v-else-if="groupsArray.length > 0" class="space-y-6">

    <!-- Sub-group filter tabs -->
    <div v-if="availableGroups.length > 1"
      class="flex items-center gap-2 flex-wrap"
      role="group"
      aria-label="Filter by meat type">
      <!-- All filter -->
      <button
        @click="activeGroup = null"
        :class="[
          'sub-filter-pill',
          activeGroup === null ? 'sub-filter-pill--active' : 'sub-filter-pill--inactive'
        ]"
        :aria-pressed="activeGroup === null">
        All
      </button>
      <!-- Per-group filters -->
      <button
        v-for="group in availableGroups"
        :key="group"
        @click="activeGroup = group"
        :class="[
          'sub-filter-pill',
          activeGroup === group ? 'sub-filter-pill--active' : 'sub-filter-pill--inactive'
        ]"
        :aria-pressed="activeGroup === group">
        {{ group }}
      </button>
    </div>

    <!-- Filtered groups -->
    <div v-for="group in filteredGroups" :key="group.category" class="space-y-4">
      <!-- Section header (only show when not filtered to one group) -->
      <div v-if="!activeGroup" class="flex items-center gap-3">
        <span class="w-1 h-6 rounded-full bg-gradient-to-b from-primary to-primary/50 flex-shrink-0" aria-hidden="true"></span>
        <h3 class="text-xs font-black text-white/90 uppercase tracking-[0.18em] font-kanit">{{ group.category }}</h3>
        <span class="bg-primary/15 text-primary text-xs font-bold px-2 py-0.5 rounded-full border border-primary/20">
          {{ group.items.length }}
        </span>
        <span class="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" aria-hidden="true"></span>
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

<style scoped>
.sub-filter-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  min-height: 36px;
  cursor: pointer;
  transition: all 0.15s ease;
  outline: none;
  border: 1.5px solid transparent;
  -webkit-tap-highlight-color: transparent;
}

.sub-filter-pill--active {
  background: linear-gradient(135deg, #F6B56D 0%, #C78B45 100%);
  color: #1A1A1A;
  border-color: transparent;
  box-shadow: 0 4px 14px rgba(246, 181, 109, 0.35);
}

.sub-filter-pill--inactive {
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.55);
  border-color: rgba(255, 255, 255, 0.1);
}

.sub-filter-pill--inactive:hover {
  background: rgba(255, 255, 255, 0.11);
  color: rgba(255, 255, 255, 0.85);
  border-color: rgba(246, 181, 109, 0.3);
}

.sub-filter-pill--inactive:active {
  transform: scale(0.96);
}
</style>
