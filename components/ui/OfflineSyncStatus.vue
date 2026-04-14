<script setup lang="ts">
import { computed } from 'vue'
import { CloudOff, RefreshCw } from 'lucide-vue-next'
import { useNetworkStatus } from '../../composables/useNetworkStatus'
import { useOfflineSyncStore } from '../../stores/OfflineSync'

const { isOnline } = useNetworkStatus()
const syncStore = useOfflineSyncStore()

const showBanner = computed(() => {
  if (!isOnline.value) return true
  if (Boolean(syncStore.isSyncing) || Number(syncStore.pendingCount) > 0) return true
  return false
})

const bannerText = computed(() => {
  if (!isOnline.value) {
    return 'Connection Lost. Orders will be saved locally and synced automatically.'
  }

  if (Boolean(syncStore.isSyncing) || Number(syncStore.pendingCount) > 0) {
    const count = Number(syncStore.pendingCount)
    return `Syncing ${count > 0 ? count : ''} order${count !== 1 ? 's' : ''}...`.replace(/  +/g, ' ')
  }

  return ''
})
</script>

<template>
  <Transition name="slide-down">
    <div
      v-if="showBanner"
      :class="[
        'fixed top-0 left-0 right-0 z-40 flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold',
        !isOnline ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white',
      ]"
    >
      <CloudOff v-if="!isOnline" :size="16" />
      <RefreshCw v-else :size="16" class="animate-spin" />
      <span>{{ bannerText }}</span>
    </div>
  </Transition>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
