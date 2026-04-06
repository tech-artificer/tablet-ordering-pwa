<script setup lang="ts">
import { useDeviceStore } from '~/stores/Device'
import { useBroadcasts } from '~/composables/useBroadcasts'
import { useNetworkStatus } from '~/composables/useNetworkStatus'
import { logger } from '~/utils/logger'

const router = useRouter()
const nuxtApp = useNuxtApp()
const deviceStore = useDeviceStore()
const { initializeBroadcasts, cleanup } = useBroadcasts()
const isLoading = ref(true)
let broadcastTimer: ReturnType<typeof setTimeout> | null = null

// Initialize network status monitoring
useNetworkStatus()

const PUBLIC_ROUTES = ['/', '/settings', '/auth/register']

async function checkAuthentication(): Promise<void> {
  const currentRoute = router.currentRoute.value.path

  if (PUBLIC_ROUTES.includes(currentRoute)) {
    return
  }

  if (deviceStore.isAuthenticated) {
    logger.debug('[Auth] Already authenticated')
    return
  }

  logger.debug('[Auth] Not authenticated, attempting login...')
  const isAuthenticated = await deviceStore.authenticate()

  if (isAuthenticated) {
    logger.debug('[Auth] Authentication successful')
    return
  }

  logger.debug('[Auth] Authentication failed, redirecting to settings PIN')
  await router.replace('/settings?requirePin=1')
}

async function silentlyAuthenticateWelcomeRoute(): Promise<boolean> {
  if (deviceStore.isAuthenticated) {
    logger.debug('[Auth] Welcome route already authenticated')
    return true
  }

  if (deviceStore.token) {
    try {
      logger.debug('[Auth] Welcome route refresh attempt')
      const refreshed = await deviceStore.refresh()
      if (refreshed && deviceStore.isAuthenticated) {
        logger.debug('[Auth] Welcome route refresh successful')
        return true
      }
    } catch (error) {
      logger.warn('[Auth] Welcome route refresh failed', error)
    }
  }

  try {
    logger.debug('[Auth] Welcome route silent login attempt')
    const authenticated = await deviceStore.authenticate()
    if (authenticated && deviceStore.isAuthenticated) {
      logger.debug('[Auth] Welcome route silent login successful')
      return true
    }
  } catch (error) {
    logger.warn('[Auth] Welcome route silent login failed', error)
  }

  logger.debug('[Auth] Welcome route remains unauthenticated')
  return false
}

async function resolveAuthenticationState(): Promise<boolean> {
  const currentRoute = router.currentRoute.value.path

  if (currentRoute === '/') {
    return silentlyAuthenticateWelcomeRoute()
  }

  if (PUBLIC_ROUTES.includes(currentRoute)) {
    return deviceStore.isAuthenticated
  }

  await checkAuthentication()
  return deviceStore.isAuthenticated
}

function scheduleBroadcastInitialization(): void {
  if (!deviceStore.isAuthenticated) {
    return
  }

  if (broadcastTimer) {
    clearTimeout(broadcastTimer)
  }

  broadcastTimer = setTimeout(() => {
    initializeBroadcasts()
  }, 1000)
}

onMounted(async () => {
  try {
    const authenticated = await resolveAuthenticationState()
    await nuxtApp.callHook('app:auth-ready', { authenticated })

    if (authenticated) {
      scheduleBroadcastInitialization()
    }
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (broadcastTimer) {
    clearTimeout(broadcastTimer)
  }

  cleanup()
})
</script>

<template>
  <SplashScreen :visible="isLoading" />

  <NuxtLayout name="kiosk">
    <NetworkStatus />

    <Transition name="page-fade" mode="out-in">
      <NuxtPage :key="$route.path" />
    </Transition>
  </NuxtLayout>
</template>