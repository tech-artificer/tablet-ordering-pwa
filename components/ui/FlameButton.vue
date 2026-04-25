<template>
  <button
    :class="[
      'font-semibold transition-all duration-200 rounded-xl min-h-12 min-w-12 flex items-center justify-center gap-2 relative overflow-hidden',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary-dark',
      'active:scale-95',
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      sizeClass,
      variantClass,
    ]"
    :disabled="disabled"
    @click="handleClick"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
    v-bind="$attrs"
  >
    <!-- Ripple effect -->
    <div
      v-if="showRipple && variant === 'primary'"
      class="absolute inset-0 pointer-events-none"
      :style="rippleStyle"
    ></div>
    
    <slot />
  </button>
</template>

<script setup lang="ts">
// Disable automatic $attrs inheritance so v-bind="$attrs" below is the
// sole binding point — prevents double-application and keeps onClick in $attrs
// so the parent's @click handler fires as a native DOM event (not via emit).
defineOptions({ inheritAttrs: false })

const props = defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  disabled: { type: Boolean, default: false }
})

const isHovering = ref(false)
const showRipple = ref(false)
const rippleStyle = ref({})

const sizeClass = computed(() => {
  return {
    'sm': 'px-3 py-2 text-sm',
    'md': 'px-6 py-3 text-base',
    'lg': 'px-8 py-4 text-lg',
  }[props.size] || 'px-6 py-3 text-base'
})

const variantClass = computed(() => {
  const variants = {
    'primary': 'bg-gradient-to-r from-primary to-primary-dark text-secondary hover:from-primary-dark hover:to-primary-dark/90 shadow-glow hover:shadow-glow-lg focus:ring-primary',
    'secondary': 'bg-surface-20 text-white border border-white/20 hover:bg-surface-10 hover:border-primary/60 focus:ring-white/40 transition-colors',
    'danger': 'bg-error/20 text-error border border-error/40 hover:bg-error/30 hover:border-error/60 focus:ring-error/40 transition-colors',
    'outline': 'border-2 border-primary text-primary hover:bg-primary/10 hover:border-primary focus:ring-primary transition-all',
  }
  return variants[props.variant] || variants['primary']
})

const handleClick = (event: MouseEvent) => {
  // Ripple effect only — parent's @click fires natively via $attrs (no emit needed)
  if (props.disabled) return
  if (props.variant === 'primary') {
    showRipple.value = true
    const button = event.currentTarget as HTMLButtonElement
    const rect = button.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = event.clientX - rect.left - size / 2
    const y = event.clientY - rect.top - size / 2
    rippleStyle.value = {
      width: `${size}px`,
      height: `${size}px`,
      left: `${x}px`,
      top: `${y}px`,
    }
    setTimeout(() => { showRipple.value = false }, 600)
  }
}
</script>

<style scoped>
button { 
  transform: translateZ(0);
  -webkit-tap-highlight-color: transparent;
}

/* Ripple animation */
[style] {
  animation: ripple 0.6s ease-out;
}

@keyframes ripple {
  0% {
    transform: scale(0);
    opacity: 0.8;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* Enhanced shadow for primary on hover */
:deep(.shadow-glow-lg) {
  box-shadow: 0 0 30px rgba(246, 181, 109, 0.5),
              0 0 60px rgba(246, 181, 109, 0.25);
}
</style>
