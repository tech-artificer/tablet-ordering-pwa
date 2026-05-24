<script setup lang="ts">
import { ElEmpty } from "element-plus"
import { Lock, EyeOff, Plus } from "lucide-vue-next"
import { formatCurrency } from "../../utils/formats"
import type { MenuItem, Modifier } from "../../types"

type CategoryType = "meats" | "sides" | "desserts" | "drinks";

const props = defineProps<{
  items:((MenuItem | Modifier) & { disabled?: boolean })[];
  categoryType: CategoryType;
  isUnlimitedCategory: boolean;
  getItemQuantity: (id: number) => number;
  maxQuantity?: number;
  loading?: boolean;
  isRefillMode?: boolean;
  isCategoryLocked?: boolean;
  lockedReason?: string;
}>()

const emit = defineEmits<{
  "addItem": [item: MenuItem | Modifier];
}>()

const isLocked = () => Boolean(props.isRefillMode && props.isCategoryLocked)

const addItem = (item: any) => {
    if (isLocked() || item.disabled || !isAvailable(item)) { return }
    emit("addItem", item)
}

const isAddDisabled = (item: any) => {
    if (isLocked() || item.disabled) { return true }
    if (props.isUnlimitedCategory) {
        return props.getItemQuantity(item.id) >= (props.maxQuantity || 5)
    }
    return false
}

// helper to determine availability: default to available when flag missing
const isAvailable = (item: any) => {
    if (item == null) { return false }
    if (!Object.prototype.hasOwnProperty.call(item, "is_available")) { return true }
    return Boolean(item.is_available)
}

// Distinguishes upgrade-locked (not in package) from runtime-unavailable
const isUpgradeLocked = (item: any) => Boolean(item?.disabled) && isAvailable(item)
const isRuntimeUnavailable = (item: any) => !isAvailable(item)
</script>

<template>
    <!-- Loading Skeleton -->
    <div v-if="props.loading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div v-for="n in 8" :key="n" class="bg-surface-10 rounded-xl overflow-hidden animate-pulse">
            <div class="h-32 bg-gray-700" />
            <div class="p-3 space-y-2">
                <div class="h-3 bg-gray-700 rounded w-3/4" />
                <div class="h-2.5 bg-gray-700 rounded w-full" />
                <div class="h-2.5 bg-gray-700 rounded w-2/3" />
            </div>
        </div>
    </div>

    <!-- Empty state when not loading and no items -->
    <div v-else-if="(!props.items || props.items.length === 0)" class="flex items-center justify-center py-16">
        <el-empty description="No items available" />
    </div>

    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <div
            v-for="item in items"
            :key="item.id"
            :class="[
                'menu-card group relative rounded-2xl overflow-hidden transition-all duration-200 shadow-xl border',
                isAvailable(item) && !isLocked() && !item.disabled
                    ? 'border-white/10 cursor-pointer hover:border-primary/40 hover:shadow-primary/20 hover:shadow-2xl active:scale-[0.97]'
                    : isRuntimeUnavailable(item)
                        ? 'border-white/5 cursor-not-allowed opacity-40'
                        : 'border-white/5 cursor-not-allowed opacity-65'
            ]"
            :aria-disabled="(item.disabled || isRuntimeUnavailable(item)) ? 'true' : undefined"
            :title="isRuntimeUnavailable(item) ? 'Out of stock' : item.disabled ? 'Upgrade your package to add this item' : isLocked() ? (props.lockedReason || 'Locked during refill mode') : ''"
            @click="isAvailable(item) && !isLocked() && !item.disabled && addItem(item)"
        >
            <!-- Quantity Badge -->
            <div
                v-if="getItemQuantity(item.id) > 0"
                class="qty-badge absolute top-2.5 right-2.5 z-30 bg-primary text-secondary text-sm font-black w-8 h-8 rounded-full shadow-xl flex items-center justify-center animate-bounce-in tabular-nums"
            >
                {{ getItemQuantity(item.id) }}
            </div>

            <!-- Unlimited / Locked badge -->
            <div class="absolute top-2.5 left-2.5 z-30 flex gap-1.5">
                <div v-if="isUnlimitedCategory && !isLocked() && !isRuntimeUnavailable(item)" class="unlimited-badge">
                    <span class="unlimited-dot" aria-hidden="true" />
                    UNLIMITED
                </div>
                <div v-if="isLocked()" class="locked-badge">
                    <Lock class="w-2.5 h-2.5" />
                    LOCKED
                </div>
            </div>

            <!-- Image area -->
            <div class="relative h-32 overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 rounded-t-2xl">
                <NuxtImg
                    v-if="item.img_url"
                    :src="item.img_url"
                    :alt="item.name || 'Menu item'"
                    class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    format="webp"
                    @error="(e: Event) => { const el = e.target as HTMLImageElement; el.style.display = 'none'; el.closest('.img-wrap')?.classList.add('img-error') }"
                />
                <div
                    v-if="!item.img_url"
                    class="w-full h-full flex flex-col items-center justify-center gap-2"
                    style="background: linear-gradient(135deg, #2a2218 0%, #1a1510 100%)"
                >
                    <svg
                        class="w-12 h-12 text-primary/25"
                        viewBox="0 0 48 48"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.5"
                        aria-hidden="true"
                    >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 20 C8 20 12 14 24 14 C36 14 40 20 40 20" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 24 H42" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M14 24 L14 36 M24 24 L24 36 M34 24 L34 36" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 36 H38" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18 10 C18 8 20 6 20 6 C20 6 19 9 21 10" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M24 8 C24 6 26 4 26 4 C26 4 25 7 27 8" />
                    </svg>
                </div>

                <!-- Gradient overlay at bottom -->
                <div class="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

                <!-- Upgrade-locked overlay: subtle, image still visible -->
                <div v-if="isUpgradeLocked(item)" class="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span class="upgrade-pill">
                        <Lock class="w-3 h-3" />
                        UPGRADE
                    </span>
                </div>

                <!-- Runtime unavailable overlay: heavier, more obviously inactive -->
                <div v-if="isRuntimeUnavailable(item)" class="absolute inset-0 bg-secondary/85 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1.5">
                    <EyeOff class="w-5 h-5 text-white/55" />
                    <span class="text-white/75 font-semibold text-[11px] tracking-[0.18em] uppercase">Unavailable</span>
                </div>

                <!-- Refill-mode locked overlay -->
                <div v-if="isLocked() && !isUpgradeLocked(item) && !isRuntimeUnavailable(item)" class="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center">
                    <span class="text-white/70 font-semibold text-sm tracking-wide uppercase">Locked</span>
                </div>
            </div>

            <!-- Card footer: code/category + name + price + add button -->
            <div class="px-2.5 pt-1.5 pb-2.5 bg-gradient-to-b from-[#1e1e1e] to-[#141414] rounded-b-2xl">
                <!-- Item code + category row -->
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-white/25 text-[9px] font-bold tracking-wider uppercase">
                        M{{ (item as any).id }}
                    </span>
                    <span
                        class="text-[9px] font-bold uppercase tracking-wider"
                        :class="{
                            'text-primary/60': categoryType === 'meats',
                            'text-primary-light/60': categoryType === 'sides' || categoryType === 'desserts',
                            'text-white/35': categoryType === 'drinks',
                        }"
                    >{{ isUnlimitedCategory ? 'UNLIMITED' : categoryType }}</span>
                </div>
                <!-- Item name -->
                <p class="text-white font-semibold text-xs leading-tight mb-1 line-clamp-2">
                    {{ (item as any).name || (item as any).receipt_name || (item as any).kitchen_name || (item as any).item_name || (item as any).label || '—' }}
                </p>

                <div class="flex items-center justify-between gap-1.5 mt-2 min-h-[32px]">
                    <!-- Price (hidden when free; slot reserved so ADD doesn't shift) -->
                    <div class="min-h-[18px]">
                        <span v-if="item.price > 0" class="text-primary font-black text-sm tabular-nums leading-tight">
                            {{ formatCurrency(item.price) }}
                        </span>
                    </div>

                    <!-- Add button -->
                    <button
                        :disabled="isAddDisabled(item) || !isAvailable(item) || isLocked()"
                        :aria-disabled="isAddDisabled(item) || !isAvailable(item)"
                        :class="[
                            'add-btn inline-flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-full font-bold text-[11px] tracking-wide transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.96]',
                            isAddDisabled(item) || !isAvailable(item) || isLocked()
                                ? 'bg-white/8 text-white/35 cursor-not-allowed'
                                : 'bg-primary text-secondary hover:bg-primary-light shadow-md hover:shadow-lg hover:shadow-primary/30'
                        ]"
                        @click.stop="addItem(item)"
                    >
                        <Plus class="w-3 h-3" stroke-width="3" />
                        <span>ADD</span>
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
  transition: all 0.200s cubic-bezier(0.4, 0, 0.2, 1);
}

.menu-card:hover {
  transform: translateY(-2px);
}

.menu-card:hover .add-btn:not(:disabled) {
  box-shadow: 0 0 20px rgba(246, 181, 109, 0.5);
  transform: scale(1.02);
}

.menu-card:active {
  transform: translateY(0) scale(0.98);
}

.qty-badge {
  box-shadow: 0 4px 12px rgba(246, 181, 109, 0.5);
}

.locked-badge,
.upgrade-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #F9D0A1;
  background: rgba(20, 16, 12, 0.78);
  border: 1px solid rgba(246, 181, 109, 0.35);
  backdrop-filter: blur(4px);
  text-transform: uppercase;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
}

.locked-badge {
  padding: 3px 9px;
  font-size: 0.65rem;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: none;
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
  color: #1A1A1A;
  background: linear-gradient(135deg, #F6B56D, #C78B45);
  box-shadow: 0 4px 12px rgba(246, 181, 109, 0.35);
  text-transform: uppercase;
}

.unlimited-dot {
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  background: #1A1A1A;
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
