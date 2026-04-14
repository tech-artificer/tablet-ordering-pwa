<script setup lang="ts">
import { computed } from 'vue'
import Button from '../ui/Button.vue'

defineOptions({ inheritAttrs: false })

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

const mappedVariant = computed(() => (props.type === 'light' ? 'secondary' : 'primary'))

const handleClick = (event: MouseEvent) => {
  if (!props.disabled) {
    emit('click', event);
  }
};
</script>

<template>
  <Button
    v-bind="$attrs"
    :variant="mappedVariant"
    :size="size"
    :full-width="fullWidth"
    :disabled="disabled"
    @click="handleClick"
  >
    <slot />
  </Button>
</template>
