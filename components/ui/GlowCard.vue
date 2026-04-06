<template>
  <div 
    :class="[
      'rounded-2xl overflow-hidden backdrop-blur-md',
      'border border-primary/30 ',
      'bg-gradient-to-br from-primary/10 to-primary/5',
      'shadow-glow transition-all duration-300',
      'hover:shadow-lg hover:border-primary/60',
      className
    ]"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = defineProps({ 
  className: { type: String, default: '' } 
})
</script>

<style scoped>
/* Warm glow effect for cards */
</style>
