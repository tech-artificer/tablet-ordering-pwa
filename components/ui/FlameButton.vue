<template>
  <button
    :class="[
      'font-semibold transition-all duration-200 min-h-12 min-w-12 flex items-center justify-center',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'active:scale-95',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      sizeClass,
      variantClass,
    ]"
    :disabled="disabled"
    @click="!disabled && $emit('click')"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
const props = defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  disabled: { type: Boolean, default: false }
})

const sizeClass = computed(() => {
  return {
    'sm': 'px-3 py-2 text-sm',
    'md': 'px-6 py-3 text-base',
    'lg': 'px-8 py-4 text-lg',
  }[props.size] || 'px-6 py-3 text-base'
})

const variantClass = computed(() => {
  const variants = {
    'primary': 'bg-gradient-to-r from-primary to-primary-dark text-secondary hover:from-primary-dark hover:to-primary-dark/90 shadow-glow focus:ring-primary focus:ring-offset-secondary',
    'secondary': 'bg-surface-20 text-white border border-white/20 hover:bg-surface-20 hover:border-primary/40 focus:ring-white/40',
    'danger': 'bg-error/20 text-error border border-error/40 hover:bg-error/30 focus:ring-error/40',
    'outline': 'border-2 border-primary text-primary hover:bg-primary/10 focus:ring-primary',
  }
  return variants[props.variant] || variants['primary']
})
</script>

<style scoped>
button { 
  transform: translateZ(0);
  -webkit-tap-highlight-color: transparent;
}
</style>
