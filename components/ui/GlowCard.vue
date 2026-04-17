<template>
  <div 
    :class="[
      'rounded-2xl overflow-hidden backdrop-blur-md',
      'border border-primary/30 ',
      'bg-gradient-to-br from-primary/10 to-primary/5',
      'shadow-glow transition-all duration-300',
      'hover:shadow-lg hover:border-primary/60',
      $attrs.class
    ]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
defineOptions({ inheritAttrs: false })
</script>
