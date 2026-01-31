<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import NetworkIndicator from '~/components/NetworkIndicator.vue'
import SessionTimerBanner from '~/components/common/SessionTimerBanner.vue'
import SessionCompletionOverlay from '~/components/common/SessionCompletionOverlay.vue'
import { useOrderStore } from '~/stores/order'
import { useSessionStore } from '~/stores/session'

const orderStore = useOrderStore()
const sessionStore = useSessionStore()
const router = useRouter()

const showCompletionOverlay = ref(false)
let completionTimeoutId: number | null = null

const orderStatus = computed(() => orderStore.currentOrder?.order?.status || orderStore.currentOrder?.status)

const acknowledgeCompletion = async () => {
  if (completionTimeoutId) {
    try { clearTimeout(completionTimeoutId) } catch (e) { /* ignore */ }
    completionTimeoutId = null
  }
  showCompletionOverlay.value = false
  sessionStore.end()
  await router.replace('/')
}

const triggerCompletionOverlay = () => {
  showCompletionOverlay.value = true
  if (completionTimeoutId) {
    try { clearTimeout(completionTimeoutId) } catch (e) { /* ignore */ }
    completionTimeoutId = null
  }
  completionTimeoutId = window.setTimeout(() => {
    acknowledgeCompletion()
  }, 2000)
}

watch(orderStatus, (status) => {
  if (status === 'completed') {
    triggerCompletionOverlay()
  }
})

onBeforeUnmount(() => {
  if (completionTimeoutId) {
    try { clearTimeout(completionTimeoutId) } catch (e) { /* ignore */ }
    completionTimeoutId = null
  }
})
</script>

<template>
  <div class="min-h-screen min-w-screen flex items-center justify-center overflow-hidden bg-with-overlay">
    <NetworkIndicator />
    <Transition name="slide-left" mode="out-in" appear>
      <div :key="$route.path" class="h-screen w-screen z-10 overflow-hidden relative bg-gray-950/80 backdrop-blur-sm safe-area-top safe-area-bottom">
        <SessionTimerBanner />
        <slot />
      </div>
    </Transition>

    <SessionCompletionOverlay :visible="showCompletionOverlay" @acknowledge="acknowledgeCompletion" />

    <!-- Ambient flame effect -->
    <div class="absolute inset-0 pointer-events-none">
      <img src="/gif/flame.gif" alt="" class="absolute opacity-40 p-0 m-0 w-full h-50" aria-hidden="true" />
    </div>
  </div>
</template>

<style>
.bg-with-overlay {
  background-image: url('/images/cover.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  position: relative;
}
</style>