<script setup lang="ts">
type MenuCategory = 'meats' | 'sides' | 'alacartes' | 'desserts' | 'beverages';

interface Category {
  id: MenuCategory;
  label: string;
  icon: string;
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
      'px-4 pt-3 z-10 bg-gradient-to-r from-secondary via-secondary-dark to-secondary backdrop-blur-sm',
      sticky ? 'sticky top-0 shadow-lg' : ''
    ]">
    <div class="max-w-7xl mx-auto">
      <div class="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <button
          v-for="category in categories"
          :key="category.id"
          @click="selectCategory(category.id)"
          :disabled="isCategoryLocked(category.id)"
          :aria-disabled="isCategoryLocked(category.id)"
          :title="isCategoryLocked(category.id) ? 'Locked during refill mode' : ''"
          :class="[
            'relative px-5 py-3 rounded-t-xl font-medium text-sm transition-all duration-150 whitespace-nowrap flex items-center gap-2 min-h-[48px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
            activeCategory === category.id
              ? 'bg-primary/20 text-primary shadow-lg border-b-2 border-primary'
              : 'bg-white/5 text-white/70 border-b-2 border-transparent active:bg-white/15 active:scale-[0.98]',
            isCategoryLocked(category.id) ? 'opacity-50 cursor-not-allowed grayscale' : ''
          ]">
          <span class="text-xl">{{ category.icon }}</span>
          <span>{{ category.label }}</span>
          <span v-if="isCategoryLocked(category.id)" class="text-xs text-white/70">🔒</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>

