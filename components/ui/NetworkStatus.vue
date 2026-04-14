<script setup lang="ts">
import { WifiOff, Wifi } from 'lucide-vue-next'
import { useNetworkStatus } from '../../composables/useNetworkStatus'

const { isOnline, wasOffline } = useNetworkStatus()

const showBanner = computed(() => !isOnline.value || wasOffline.value)
const bannerText = computed(() => {
  if (!isOnline.value) return 'You are offline'
  if (wasOffline.value) return 'Back online'
  return ''
})
</script>

<template>
  <Transition name="slide-down">
    <div 
      v-if="showBanner"
      :class="[
        'fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-sm font-semibold',
        isOnline ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      ]"
    >
      <Wifi v-if="isOnline" :size="16" />
      <WifiOff v-else :size="16" />
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
