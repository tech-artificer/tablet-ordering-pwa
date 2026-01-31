<script setup lang="ts">
import { computed } from 'vue';
import { formatCurrency } from '../../utils/formats';
import type { CartItem } from '../../types';
import { Plus, Minus } from 'lucide-vue-next';

const props = defineProps<{
  item: CartItem;
  maxQuantity?: number;
  unlimitedCap?: number;
}>();

const emit = defineEmits<{
  'updateQuantity': [quantity: number];
  'remove': [];
}>();

const effectiveMax = computed(() => {
  return props.item.isUnlimited 
    ? (props.unlimitedCap || 5) 
    : (props.maxQuantity || 99);
});

const canIncrement = computed(() => props.item.quantity < effectiveMax.value);

const handleDecrement = () => {
  if (props.item.quantity <= 1) {
    // Remove item when quantity would go to 0
    emit('remove');
  } else {
    emit('updateQuantity', props.item.quantity - 1);
  }
};

const handleIncrement = () => {
  if (props.item.quantity < effectiveMax.value) {
    emit('updateQuantity', props.item.quantity + 1);
  }
};
</script>

<template>
  <div class="bg-white/5 border border-white/10 rounded-xl p-2 transition-all duration-150">
    <div class="flex items-center gap-2">
      <NuxtImg
        v-if="item.img_url"
        :src="item.img_url"
        :alt="item.name || 'Cart item'"
        class="w-10 h-10 object-cover rounded-lg flex-shrink-0"
        loading="lazy"
        sizes="40px"
        format="webp"
        @error="(e) => (e.target as HTMLImageElement).src = '/images/placeholder.jpg'"
      />
      <div v-else class="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xs text-white/60">
        🍽️
      </div>
      
      <p class="text-white font-medium text-xs truncate flex-1 min-w-0">{{ item.name }}</p>
      
      <div class="flex items-center gap-1 flex-shrink-0">
        <button
          class="touch-btn-circle !min-w-[44px] !min-h-[44px] w-11 h-11 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          :class="item.quantity <= 1 ? 'bg-red-500/20 text-red-400' : 'bg-white/10'"
          @click.stop="handleDecrement"
          aria-label="Decrease quantity or remove">
          <Minus class="w-3 h-3" />
        </button>

        <span class="text-white text-center text-xs font-medium w-5">{{ item.quantity }}</span>

        <button
          class="touch-btn-circle !min-w-[44px] !min-h-[44px] w-11 h-11 bg-white/10 text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          @click.stop="handleIncrement"
          :disabled="!canIncrement"
          aria-label="Increase quantity">
          <Plus class="w-3 h-3" />
        </button>
      </div>
    </div>
  </div>
</template>
