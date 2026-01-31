<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

type Props = {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  fullWidth: false,
  disabled: false,
  type: 'button'
})

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const sizeClasses: Record<Size, string> = {
  sm: 'py-2 px-4 text-sm min-h-[40px]',
  md: 'py-3 px-6 text-base min-h-[48px]',
  lg: 'py-4 px-8 text-lg min-h-[56px]'
}

const variantClasses = computed(() => {
  switch (props.variant) {
    case 'secondary':
      return 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
    case 'ghost':
      return 'bg-transparent text-white/70 hover:text-white hover:bg-white/10'
    case 'danger':
      return 'bg-red-500/20 text-red-200 border border-red-500/40 hover:bg-red-500/30'
    case 'outline':
      return 'bg-transparent text-primary border border-primary/40 hover:bg-primary/10'
    default:
      return 'bg-primary text-slate-900 border border-primary/50 hover:bg-primary/90'
  }
})
</script>

<template>
  <button
    :type="props.type"
    :class="[
      'rounded-xl font-semibold transition-all duration-150 shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
      sizeClasses[props.size],
      variantClasses,
      props.fullWidth ? 'w-full' : '',
      props.disabled ? 'opacity-50 cursor-not-allowed' : 'active:scale-[0.97]'
    ]"
    :disabled="props.disabled"
    :aria-label="props.ariaLabel"
    @click="(e) => !props.disabled && emit('click', e)"
  >
    <span class="inline-flex items-center justify-center gap-2">
      <slot />
    </span>
  </button>
</template>
