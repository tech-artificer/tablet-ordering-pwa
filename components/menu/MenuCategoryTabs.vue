<script setup lang="ts">
import type { Component } from 'vue';

type MenuCategory = 'meats' | 'sides' | 'alacartes' | 'desserts' | 'beverages';

interface Category {
  id: MenuCategory;
  label: string;
  icon: Component;
}

const props = defineProps<{
  categories: readonly Category[];
  activeCategory: MenuCategory;
  sticky?: boolean;
  isRefillMode?: boolean;
  refillAllowedCategories?: readonly MenuCategory[];
}>();

const emit = defineEmits<{
  'select': [category: MenuCategory];
}>();

const getRefillAllowed = () => props.refillAllowedCategories ?? (['meats', 'sides'] as MenuCategory[])

const isCategoryLocked = (category: MenuCategory) => {
  return Boolean(props.isRefillMode && !getRefillAllowed().includes(category))
}

const selectCategory = (category: MenuCategory) => {
  if (isCategoryLocked(category)) return
  emit('select', category);
};
</script>

<template>
  <div
    :class="[
      'category-tabs-bar px-4 py-3 z-10',
      sticky ? 'sticky top-0 shadow-2xl' : ''
    ]">
    <div class="max-w-7xl mx-auto">
      <div role="tablist" class="flex gap-2 overflow-x-auto scrollbar-hide" aria-label="Menu categories">
        <button
          v-for="category in categories"
          :key="category.id"
          role="tab"
          :aria-selected="activeCategory === category.id"
          :aria-disabled="isCategoryLocked(category.id)"
          :disabled="isCategoryLocked(category.id)"
          :title="isCategoryLocked(category.id) ? 'Locked during refill mode' : category.label"
          @click="selectCategory(category.id)"
          :class="[
            'tab-pill group relative flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-200 min-h-[44px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            activeCategory === category.id
              ? 'tab-pill--active text-secondary shadow-lg'
              : 'bg-white/[0.06] text-white/60 hover:text-white/90 hover:bg-white/[0.11]',
            isCategoryLocked(category.id) ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer'
          ]">
          <!-- Active background -->
          <span
            v-if="activeCategory === category.id"
            class="tab-glow absolute inset-0 rounded-full bg-gradient-to-r from-primary to-primary-dark"
            aria-hidden="true"
          ></span>

          <component
            :is="category.icon"
            :size="18"
            stroke-width="2.2"
            class="relative z-10 flex-shrink-0 transition-transform duration-200"
            :class="activeCategory === category.id ? 'text-secondary' : 'text-white/50 group-hover:text-white/80'"
          />
          <span class="relative z-10">{{ category.label }}</span>

          <!-- Lock icon for locked categories -->
          <svg v-if="isCategoryLocked(category.id)" class="relative z-10 w-3.5 h-3.5 text-white/40 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category-tabs-bar {
  background: linear-gradient(to right, #1a1a1a 0%, #111111 50%, #1a1a1a 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
}

.tab-pill {
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  background: rgba(255, 255, 255, 0.06);
}

.tab-pill:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.11);
}

.tab-pill--active {
  box-shadow:
    0 4px 16px rgba(246, 181, 109, 0.35),
    0 1px 3px rgba(0, 0, 0, 0.4);
}

.tab-glow {
  background: linear-gradient(135deg, #F6B56D 0%, #E8963A 100%);
  transition: opacity 0.18s ease;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

