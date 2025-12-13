<template>
  <button
    :class="[
      'px-5 py-2.5 rounded-xl font-semibold shadow-md min-h-[44px] transition-all duration-150',
      variantClass,
      disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.97]'
    ]"
    :disabled="disabled"
    @click="!disabled && $emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps({
  variant: { type: String, default: 'primary' },
  disabled: { type: Boolean, default: false }
})
const variantClass = computed(() => {
  return props.variant === 'primary'
    ? 'bg-primary text-secondary font-bold border border-primary hover:shadow-lg hover:shadow-primary/20'
    : 'bg-secondary text-primary font-bold border border-primary/30 hover:bg-secondary-light hover:border-primary/50'
})
</script>

<style scoped>
button { 
  transform: translateZ(0);
  -webkit-tap-highlight-color: transparent;
}
</style>
