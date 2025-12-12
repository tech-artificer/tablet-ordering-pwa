<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDeviceStore } from '~/stores/device'
import { useBroadcasts } from '~/composables/useBroadcasts'
import { useNetworkStatus } from '~/composables/useNetworkStatus'
import { logger } from '~/utils/logger'
import NetworkStatus from '~/components/ui/NetworkStatus.vue'

const router = useRouter()
const deviceStore = useDeviceStore()
const { initializeBroadcasts, cleanup } = useBroadcasts()

// Initialize network status monitoring
useNetworkStatus()

const PUBLIC_ROUTES = ['/', '/settings', '/auth/register']

async function checkAuthentication(): Promise<void> {
  const currentRoute = router.currentRoute.value.path
  
  // Skip auth check for public routes
  if (PUBLIC_ROUTES.includes(currentRoute)) {
    return
  }
  
  // Check if already authenticated
  if (deviceStore.isAuthenticated) {
    logger.debug('[Auth] Already authenticated')
    return
  }
  
  // Attempt authentication
  logger.debug('[Auth] Not authenticated, attempting login...')
  const isAuthenticated = await deviceStore.authenticate()
  
  if (isAuthenticated) {
    logger.debug('[Auth] Authentication successful')
    return
  }
  
  // Redirect to settings PIN if authentication failed (middleware-aligned)
  logger.debug('[Auth] Authentication failed, redirecting to settings PIN')
  await router.replace('/settings?requirePin=1')
}

onMounted(async () => {
  await checkAuthentication()
  
  // Initialize WebSocket broadcasts after authentication
  if (deviceStore.isAuthenticated) {
    setTimeout(() => {
      initializeBroadcasts()
    }, 1000) // Small delay to ensure Echo is ready
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <NuxtLayout name="kiosk">
    <!-- Network status indicator -->
    <NetworkStatus />
    
    <NuxtPage />
  </NuxtLayout>
</template>