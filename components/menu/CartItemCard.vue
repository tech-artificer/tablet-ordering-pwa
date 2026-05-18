<script setup lang="ts">
import { Plus, Minus, Trash2 } from "lucide-vue-next"
import { formatCurrency } from "../../utils/formats"
import type { CartItem } from "../../types"

const props = defineProps<{
  item: CartItem;
  maxQuantity?: number;
  unlimitedCap?: number;
}>()

const emit = defineEmits<{
  "updateQuantity": [quantity: number];
  "remove": [];
}>()

const effectiveMax = computed(() => {
    return props.item.isUnlimited
        ? (props.unlimitedCap || 5)
        : (props.maxQuantity || 99)
})

const canIncrement = computed(() => props.item.quantity < effectiveMax.value)

const handleDecrement = () => {
    if (props.item.quantity <= 1) {
        emit("remove")
    } else {
        emit("updateQuantity", props.item.quantity - 1)
    }
}

const handleIncrement = () => {
    if (props.item.quantity < effectiveMax.value) {
        emit("updateQuantity", props.item.quantity + 1)
    }
}

// Category-aware fallback emoji
const fallbackEmoji = computed(() => {
    const cat = (props.item as any).category || (props.item as any).group || ""
    if (cat === "meats" || cat === "PORK" || cat === "BEEF" || cat === "CHICKEN") { return "🥩" }
    if (cat === "sides" || cat === "SIDE") { return "🥗" }
    if (cat === "drinks" || cat === "DRINK") { return "🥤" }
    if (cat === "desserts") { return "🍮" }
    return "🍽️"
})
</script>

<template>
    <div
        class="cart-item group border border-white/10 rounded-2xl overflow-hidden transition-all duration-200 hover:border-primary/25 hover:bg-white/[0.04]"
        style="background: linear-gradient(135deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.02) 100%)"
    >
        <div class="flex items-center gap-3 p-2.5">
            <!-- Thumbnail -->
            <div
                class="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden"
                style="background: linear-gradient(135deg, #2a2a2a 0%, #1c1c1c 100%)"
            >
                <NuxtImg
                    v-if="item.img_url"
                    :src="item.img_url"
                    :alt="item.name || 'Cart item'"
                    class="w-full h-full object-cover"
                    loading="lazy"
                    width="64"
                    height="64"
                    format="webp"
                    @error="(e: Event) => { const el = e.target as HTMLImageElement; el.style.display='none'; el.nextElementSibling?.classList.remove('hidden') }"
                />
                <div
                    class="fallback-icon w-full h-full flex items-center justify-center text-2xl"
                    :class="item.img_url ? 'hidden' : ''"
                >
                    {{ fallbackEmoji }}
                </div>

                <!-- Unlimited indicator -->
                <div
                    v-if="item.isUnlimited"
                    class="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-400"
                />
            </div>

            <!-- Name + Price -->
            <div class="flex-1 min-w-0">
                <p class="text-white font-semibold text-[13px] leading-snug line-clamp-2 mb-0.5">
                    {{ item.name }}
                </p>
                <div class="flex items-center gap-2">
                    <span v-if="(item as any).price > 0" class="text-primary text-xs font-bold tabular-nums">
                        {{ formatCurrency((item as any).price) }}
                    </span>
                    <span v-else class="text-emerald-400 text-xs font-bold">Free</span>
                    <span
                        v-if="item.isUnlimited"
                        class="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80"
                    >∞ unlimited</span>
                </div>
            </div>

            <!-- Qty Stepper as compact pill -->
            <div
                class="flex-shrink-0 flex items-center rounded-xl overflow-hidden border border-white/10"
                style="background: rgba(255,255,255,0.06)"
            >
                <button
                    class="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 transition-colors"
                    :class="item.quantity <= 1
                        ? 'text-red-400 hover:bg-red-500/20 active:bg-red-500/30'
                        : 'text-white/60 hover:bg-white/10 active:bg-white/15'"
                    :aria-label="item.quantity <= 1 ? 'Remove item' : 'Decrease quantity'"
                    @click.stop="handleDecrement"
                >
                    <component :is="item.quantity <= 1 ? Trash2 : Minus" class="w-3.5 h-3.5" />
                </button>

                <span class="text-white font-bold text-sm min-w-[1.75rem] text-center tabular-nums select-none">
                    {{ item.quantity }}
                </span>

                <button
                    class="flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 text-primary hover:bg-primary/20 active:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    :disabled="!canIncrement"
                    aria-label="Increase quantity"
                    @click.stop="handleIncrement"
                >
                    <Plus class="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    </div>
</template>
