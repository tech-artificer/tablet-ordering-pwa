<script setup lang="ts">
interface Props {
  showIcon?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'dark' | 'light';
  size?: 'sm' | 'md' | 'lg';
}

const props = withDefaults(defineProps<Props>(), {
  showIcon: true,
  fullWidth: false,
  disabled: false,
  type: 'dark',
  size: 'md'
});

const emit = defineEmits<{
  click: [event: MouseEvent]
}>();

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event);
  }
};

// Size classes for consistent touch targets
const sizeClasses = {
  sm: 'py-2.5 px-6 text-sm min-h-[40px]',
  md: 'py-3.5 px-8 text-base min-h-[48px]',
  lg: 'py-4 px-12 text-lg min-h-[56px]'
};
</script>

<template>
  <button
    :class="[
      'rounded-xl transition-all duration-150 shadow-lg font-kanit font-bold',
      sizeClasses[size],
      fullWidth ? 'w-full' : '',
      // Dark variant (default)
      type === 'dark' ? [
        'bg-primary text-secondary',
        disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:shadow-xl hover:shadow-primary/25 active:scale-[0.97] active:shadow-md'
      ] : [],
      // Light variant
      type === 'light' ? [
        'bg-primary/15 text-primary border border-primary/30 backdrop-blur-sm',
        disabled 
          ? 'opacity-40 cursor-not-allowed' 
          : 'hover:bg-primary/25 hover:border-primary/50 active:scale-[0.97]'
      ] : []
    ]"
    :disabled="disabled"
    @click="handleClick"
  >
    <span class="flex flex-row gap-2 justify-center items-center">
      <slot />
    </span>
  </button>
</template>
