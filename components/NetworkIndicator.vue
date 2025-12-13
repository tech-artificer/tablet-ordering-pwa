<script setup lang="ts">
import { computed } from 'vue'
import { useNetworkStatus } from '~/composables/useNetworkStatus'

const { isOnline, wasOffline } = useNetworkStatus()

const statusText = computed(() => isOnline.value ? (wasOffline.value ? 'Back online' : 'Online') : 'Offline')
</script>

<template>
  <div v-if="!isOnline.value || wasOffline.value" class="fixed top-4 left-1/2 -translate-x-1/2 z-50">
    <div :class="['px-4 py-2 rounded-full text-sm font-semibold shadow-lg', isOnline.value ? 'bg-green-600 text-white' : 'bg-red-600 text-white']">
      <span v-if="!isOnline.value">⚠️ Offline</span>
      <span v-else>✅ Back online</span>
    </div>
  </div>
</template>

<style scoped>
.shadow-lg { box-shadow: 0 8px 24px rgba(0,0,0,0.45); }
</style>
