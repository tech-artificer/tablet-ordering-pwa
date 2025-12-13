<template>
  <div class="kbbq-glow p-6 rounded-3xl" :class="className">
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = defineProps({ className: { type: String, default: '' } })
</script>
