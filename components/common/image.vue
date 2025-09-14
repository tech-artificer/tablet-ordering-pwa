<template>
  <img
    :src="src"
    :alt="alt"
    class="floating-image-responsive"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
defineProps<{
  src: string;
  alt: string;
}>();
</script>

<style scoped>
.floating-image-responsive {
  @apply object-cover rounded-lg shadow-sm;
}
</style>