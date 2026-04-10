<script setup lang="ts">
import { formatCurrency } from '../../utils/formats';
import type { MenuItem, Modifier } from '../../types';
import { ElEmpty } from 'element-plus';

type CategoryType = 'meats' | 'sides' | 'desserts' | 'beverages';

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
      :class="[
        'menu-card group relative rounded-2xl overflow-hidden transition-all duration-200 shadow-xl border',
        isAvailable(item) && !isLocked()
          ? 'border-white/10 cursor-pointer hover:border-primary/40 hover:shadow-primary/20 hover:shadow-2xl active:scale-[0.97]'
          : 'border-white/5 cursor-not-allowed opacity-55'
      ]"
      :title="isLocked() ? (props.lockedReason || 'Locked during refill mode') : ''"
      @click="isAvailable(item) && !isLocked() && addItem(item)">

      <!-- Quantity Badge -->
      <div
        v-if="getItemQuantity(item.id) > 0"
        class="qty-badge absolute top-2.5 right-2.5 z-30 bg-primary text-secondary text-sm font-black w-8 h-8 rounded-full shadow-xl flex items-center justify-center animate-bounce-in tabular-nums">
        {{ getItemQuantity(item.id) }}
      </div>

      <!-- Unlimited / Locked badge -->
      <div class="absolute top-2.5 left-2.5 z-30 flex gap-1.5">
        <div v-if="isUnlimitedCategory && !isLocked()" class="unlimited-badge">
          <span class="unlimited-dot" aria-hidden="true"></span>
          UNLIMITED
        </div>
        <div v-if="isLocked()" class="locked-badge">
          <svg class="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>
          LOCKED
        </div>
      </div>

      <!-- Image area — taller, with name overlay -->
      <div class="relative h-44 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900">
        <NuxtImg
          v-if="item.img_url"
          :src="item.img_url"
          :alt="item.name || 'Menu item'"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 33vw"
          format="webp"
          @error="(e: Event) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; el.closest('.img-wrap')?.classList.add('img-error') }"
        />
        <div v-if="!item.img_url" class="w-full h-full flex flex-col items-center justify-center gap-2"
          style="background: linear-gradient(135deg, #2a2218 0%, #1a1510 100%)">
          <svg class="w-12 h-12 text-primary/25" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 20 C8 20 12 14 24 14 C36 14 40 20 40 20"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 24 H42"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M14 24 L14 36 M24 24 L24 36 M34 24 L34 36"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 36 H38"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 10 C18 8 20 6 20 6 C20 6 19 9 21 10"/>
            <path stroke-linecap="round" stroke-linejoin="round" d="M24 8 C24 6 26 4 26 4 C26 4 25 7 27 8"/>
          </svg>
        </div>

        <!-- Gradient overlay at bottom -->  
        <div class="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>

        <!-- Unavailable overlay -->
        <div v-if="!isAvailable(item)" class="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center">
          <span class="text-white/80 font-semibold text-sm tracking-wide uppercase">Unavailable</span>
        </div>

        <!-- Locked overlay -->
        <div v-if="isLocked()" class="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center">
          <span class="text-white/70 font-semibold text-sm tracking-wide uppercase">Locked</span>
        </div>
      </div>

      <!-- Card footer: price + description chip + add button -->
      <div class="px-3 pt-2 pb-3 bg-gradient-to-b from-[#1e1e1e] to-[#141414]">
        <!-- Item name — always visible, primary source of truth -->
        <p class="text-white font-semibold text-sm leading-snug mb-1 truncate">
          {{ (item as any).name || (item as any).receipt_name || (item as any).kitchen_name || (item as any).item_name || (item as any).label || '—' }}
        </p>
        <!-- Description (if available) -->
        <p v-if="(item as any).description"
          class="text-white/45 text-[11px] leading-snug line-clamp-2 mb-2">
          {{ (item as any).description }}
        </p>

        <div class="flex items-center justify-between gap-2">
          <!-- Price + category chip -->
          <div class="flex flex-col gap-1">
            <span v-if="item.price > 0" class="text-primary font-black text-base tabular-nums leading-none">
              {{ formatCurrency(item.price) }}
            </span>
            <span v-else class="text-[#4ade80] text-xs font-bold uppercase tracking-wide leading-none">Free</span>
            <!-- Flavor/category chip -->
            <span
              v-if="categoryType"
              class="text-[10px] font-bold uppercase tracking-wider leading-none"
              :class="{
                'text-primary/70': categoryType === 'meats',
                'text-success/80': categoryType === 'sides',
                'text-primary-light/70': categoryType === 'desserts',
                'text-white/40': categoryType === 'beverages',
              }"
            >{{ categoryType }}</span>
          </div>

          <!-- Add button -->
          <button
            :disabled="isAddDisabled(item) || !isAvailable(item) || isLocked()"
            @click.stop="addItem(item)"
            :aria-disabled="isAddDisabled(item) || !isAvailable(item)"
            :class="[
              'add-btn flex items-center justify-center gap-1 px-3.5 py-2.5 rounded-xl font-bold text-sm transition-all duration-150 shadow-md min-h-[44px] min-w-[80px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              isAddDisabled(item) || !isAvailable(item) || isLocked()
                ? 'bg-white/10 text-white/30 cursor-not-allowed'
                : 'bg-primary text-secondary active:scale-95 hover:bg-primary-light'
            ]">
            <svg v-if="!isAddDisabled(item) && isAvailable(item) && !isLocked()" class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            <span>
              <span v-if="isLocked()">Locked</span>
              <span v-else-if="!isAvailable(item)">N/A</span>
              <span v-else-if="isAddDisabled(item)">Max</span>
              <span v-else>Add</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.menu-card {
  background: linear-gradient(160deg, #1f1f1f 0%, #141414 100%);
  transform: translateZ(0);
  -webkit-tap-highlight-color: transparent;
}

.menu-card:hover .add-btn:not(:disabled) {
  box-shadow: 0 0 16px rgba(246, 181, 109, 0.4);
}

.qty-badge {
  box-shadow: 0 4px 12px rgba(246, 181, 109, 0.5);
}

.locked-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  color: #fff;
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(255,255,255,0.15);
  backdrop-filter: blur(4px);
  text-transform: uppercase;
}

.unlimited-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 9px;
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.07em;
  color: #052e16;
  background: linear-gradient(135deg, #22c55e, #4ade80);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
  text-transform: uppercase;
}

.unlimited-dot {
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  background: #052e16;
  animation: pulse-dot 1.2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { transform: scale(1); opacity: 0.85; }
  50% { transform: scale(1.5); opacity: 1; }
}

@keyframes bounce-in {
  0% { transform: scale(0); }
  55% { transform: scale(1.25); }
  100% { transform: scale(1); }
}

.animate-bounce-in {
  animation: bounce-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
