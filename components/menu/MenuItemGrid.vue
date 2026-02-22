<script setup lang="ts">
import { formatCurrency } from '../../utils/formats';
import type { MenuItem, Modifier } from '../../types';
import { ElButton, ElEmpty } from 'element-plus';

type CategoryType = 'meats' | 'sides' | 'desserts' | 'beverages';

const props = defineProps<{
  items: (MenuItem | Modifier)[];
  categoryType: CategoryType;
  isUnlimitedCategory: boolean;
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

const isAddDisabled = (item: MenuItem | Modifier) => {
  if (props.isUnlimitedCategory) {
    return props.getItemQuantity(item.id) >= (props.maxQuantity || 5);
  }
  return false;
};

// helper to determine availability: default to available when flag missing
const isAvailable = (item: any) => {
  if (item == null) return false
  if (!Object.prototype.hasOwnProperty.call(item, 'is_available')) return true
  return Boolean(item.is_available)
}
</script>

<template>
  <!-- Loading Skeleton -->
  <div v-if="props.loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div v-for="n in 6" :key="n" class="bg-surface-10 rounded-xl overflow-hidden animate-pulse">
      <div class="h-40 bg-gray-700"></div>
      <div class="p-4 space-y-3">
        <div class="h-4 bg-gray-700 rounded w-3/4"></div>
        <div class="h-3 bg-gray-700 rounded w-full"></div>
        <div class="h-3 bg-gray-700 rounded w-2/3"></div>
      </div>
    </div>
  </div>

  <!-- Empty state when not loading and no items -->
  <div v-else-if="(!props.items || props.items.length === 0)" class="flex items-center justify-center py-16">
    <el-empty description="No items available" />
  </div>

  <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <div
      v-for="item in items"
      :key="item.id"
      v-bind:class="[
        'relative bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-200 border border-white/10 shadow-lg',
        (isAvailable(item) ? 'cursor-pointer active:scale-95 hover:bg-white/10' : 'cursor-not-allowed opacity-60')
      ]"
      @click="isAvailable(item) && addItem(item)">
      
      <!-- Quantity Badge -->
      <div v-if="getItemQuantity(item.id) > 0" class="absolute -top-2 -right-2 bg-primary text-secondary text-sm font-bold w-8 h-8 rounded-full shadow-lg flex items-center justify-center z-20 animate-bounce-in">
        {{ getItemQuantity(item.id) }}
      </div>

      <!-- Unlimited Badge (for meats and sides) -->
      <div v-if="isUnlimitedCategory" class="absolute top-2 left-2 bg-primary/90 text-secondary px-2.5 py-1 rounded-full text-xs font-bold shadow-lg z-10">
        Unlimited
      </div>

      <div class="relative h-40 overflow-hidden">
        <img 
          :src="item.img_url" 
          :alt="item.name"
          class="w-full h-full object-cover"
          @error="(e) => (e.target as HTMLImageElement).src = '/images/placeholder.jpg'" />
        
        <div v-if="!isAvailable(item)" class="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <span class="text-white font-semibold text-lg">Unavailable</span>
        </div>

        <!-- Price badge with gradient -->
        <div v-if="item.price > 0" class="absolute bottom-2 right-2 bg-white text-secondary px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
          {{ formatCurrency(item.price) }}
        </div>
      </div>

      <div class="p-4">
        <h3 class="text-white font-semibold text-lg mb-1 truncate">{{ item.name || (item as any).receipt_name || (item as any).kitchen_name }}</h3>
        <p v-if="item.description" class="text-gray-300 text-sm line-clamp-2">{{ item.description }}</p>
        
        <!-- Add to order button -->
        <button
          :disabled="isAddDisabled(item) || !isAvailable(item)"
          @click.stop="addItem(item)"
          class="mt-3 w-full bg-primary text-secondary font-semibold py-2 px-4 rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md">
          <span v-if="!isAvailable(item)">Unavailable</span>
          <span v-else-if="!isAddDisabled(item)" class="flex items-center justify-center gap-1">
            <span>+</span>
            <span>Add to Order</span>
          </span>
          <span v-else>Limit Reached</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@keyframes bounce-in {
  0% {
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}

.animate-bounce-in {
  animation: bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.active\:scale-95:active {
  transform: scale(0.95);
}
</style>
