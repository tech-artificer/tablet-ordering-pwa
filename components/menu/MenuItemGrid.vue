<script setup lang="ts">
import { formatCurrency } from '../../utils/formats';
import type { MenuItem, Modifier } from '../../types';
import { ElButton, ElEmpty } from 'element-plus';

type CategoryType = 'meats' | 'sides' | 'alacartes' | 'desserts' | 'beverages' ;

const props = defineProps<{
  items: (MenuItem | Modifier)[];
  categoryType: CategoryType;
  isUnlimitedCategory: boolean;
  getItemQuantity: (id: number) => number;
  maxQuantity?: number;
  loading?: boolean;
  isRefillMode?: boolean;
  isCategoryLocked?: boolean;
  lockedReason?: string;
}>();

const emit = defineEmits<{
  'addItem': [item: MenuItem | Modifier];
}>();

const isLocked = () => Boolean(props.isRefillMode && props.isCategoryLocked)

const addItem = (item: MenuItem | Modifier) => {
  if (isLocked()) return
  emit('addItem', item);
};

const isAddDisabled = (item: MenuItem | Modifier) => {
  if (isLocked()) return true
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
        (isAvailable(item) ? 'cursor-pointer active:scale-95 hover:bg-white/10' : 'cursor-not-allowed opacity-60'),
        (isLocked() ? 'cursor-not-allowed opacity-60 grayscale' : '')
      ]"
      :title="isLocked() ? (props.lockedReason || 'Locked during refill mode') : ''"
      @click="isAvailable(item) && addItem(item)">
      
      <!-- Quantity Badge -->
      <div v-if="getItemQuantity(item.id) > 0" class="absolute -top-2 -right-2 bg-primary text-secondary text-sm font-bold w-8 h-8 rounded-full shadow-lg flex items-center justify-center z-20 animate-bounce-in">
        {{ getItemQuantity(item.id) }}
      </div>

      <!-- Unlimited Badge (for meats and sides) -->
      <div v-if="isUnlimitedCategory" class="absolute top-2 left-2 z-20">
        <div class="unlimited-badge">
          <span class="unlimited-dot" aria-hidden="true"></span>
          UNLIMITED
        </div>
      </div>

      <div class="relative h-40 overflow-hidden">
        <NuxtImg
          v-if="item.img_url"
          :src="item.img_url"
          :alt="item.name || 'Menu item'"
          class="w-full h-full object-cover"
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 33vw"
          format="webp"
          @error="(e) => ((e.target as HTMLImageElement).src = '/images/placeholder.jpg')"
        />
        
        <div v-else class="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
          <span class="text-2xl">🍽️</span>
        </div>

        <div v-if="!isAvailable(item)" class="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <span class="text-white font-semibold text-lg">Unavailable</span>
        </div>

        <div v-if="isLocked()" class="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div class="text-center text-white/90">
            <div class="text-2xl">🔒</div>
            <div class="text-sm font-semibold">Locked in Refill</div>
          </div>
        </div>

        <!-- Price badge with gradient -->
        <div v-if="item.price > 0" class="absolute bottom-2 right-2 bg-white text-secondary px-3 py-1.5 rounded-full text-sm font-bold shadow-lg">
          {{ formatCurrency(item.price) }}
        </div>
      </div>

      <div class="p-4">
        <h3 class="text-white font-semibold text-lg mb-1 truncate">{{ item.name }}</h3>
        <p v-if="item.description" class="text-gray-300 text-sm line-clamp-2">{{ item.description }}</p>
        
        <!-- Add to order button -->
        <button
          :disabled="isAddDisabled(item) || !isAvailable(item)"
          @click.stop="addItem(item)"
          :aria-disabled="isAddDisabled(item) || !isAvailable(item)"
          class="mt-3 w-full bg-primary text-secondary font-semibold py-2 px-4 rounded-lg transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary min-h-[44px]">
          <span v-if="isLocked()">Locked in Refill</span>
          <span v-else-if="!isAvailable(item)">Unavailable</span>
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

.unlimited-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #052e16;
  background: linear-gradient(135deg, #22c55e, #4ade80);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.45);
  text-transform: uppercase;
}

.unlimited-dot {
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: #052e16;
  animation: pulse-dot 1.2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.4); opacity: 1; }
}
</style>
