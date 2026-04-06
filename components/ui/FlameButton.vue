<script setup lang="ts">
import { computed } from 'vue'
import Button from './Button.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  variant: { type: String, default: 'primary' },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' }
})

const mappedVariant = computed(() => (props.variant === 'primary' ? 'primary' : 'secondary'))
</script>

<template>
  <Button
    v-bind="$attrs"
    :variant="mappedVariant"
    :disabled="disabled"
    :type="type as any"
  >
    <slot />
  </Button>
</template>
