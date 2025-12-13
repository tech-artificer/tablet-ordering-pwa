<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDeviceStore } from '~/stores/device';
import { useSessionStore } from '~/stores/session'
import WoosooLogo from '~/components/WoosooLogo.vue';
import PrimaryButton from '~/components/common/PrimaryButton.vue';
import { ElMessageBox } from 'element-plus';
import { useBroadcasts } from '~/composables/useBroadcasts';
import { logger } from '../utils/logger'

const session = useSessionStore();
const deviceStore = useDeviceStore();
const router = useRouter();
const { channelStatus } = useBroadcasts();

const SETTINGS_CODE = '1234'; // Static code for accessing settings

const isWebSocketConnected = ref(false);

// Check WebSocket connection status for Reverb/Pusher
const checkWebSocketStatus = () => {
  if (typeof window !== 'undefined' && (window as any).Echo) {
    const echo = (window as any).Echo;
    if (echo.connector?.pusher?.connection) {
      const state = echo.connector.pusher.connection.state;
      isWebSocketConnected.value = state === 'connected';
    }
  }
};

onMounted(() => {
  checkWebSocketStatus();
  // Check every 3 seconds
  const interval = setInterval(checkWebSocketStatus, 3000);
  
  // Also listen to Echo connection state changes
  if ((window as any).Echo?.connector?.pusher) {
    (window as any).Echo.connector.pusher.connection.bind('state_change', (states: any) => {
      isWebSocketConnected.value = states.current === 'connected';
    });
  }
  
  // Cleanup on unmount
  onUnmounted(() => clearInterval(interval));
});

const start = () => {
  logger.debug('Start clicked - Device Store:', {
    token: deviceStore.token,
    table: deviceStore.table,
    'table.value': deviceStore.table.value,
    'table?.id': (deviceStore.table as any)?.id,
    'table.value?.id': deviceStore.table.value?.id,
    isAuthenticated: deviceStore.isAuthenticated
  })
  
  // Use isAuthenticated computed property instead of manual checks
  if (!deviceStore.isAuthenticated) {
    logger.debug('Not authenticated, redirecting to Settings (PIN)')
    // Redirect to Settings and require staff PIN before revealing registration
    router.replace({ path: '/settings', query: { requirePin: '1' } })
    return
  }
  
  logger.debug('Starting session...')
  session.start()
  router.replace('/order/start')
}

const openSettings = async () => {
  try {
    const { value } = await ElMessageBox.prompt('Enter access code to continue', 'Settings Access', {
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      inputPattern: /^\d{4}$/,
      inputErrorMessage: 'Please enter a 4-digit code',
      inputType: 'password',
      customClass: 'settings-prompt'
    })
    
    if (value === SETTINGS_CODE) {
      router.push('/settings')
    } else {
      // ElMessage.error('Invalid access code')
    }
  } catch {
    // User cancelled
  }
}

const clearDeviceAuth = () => {
  try {
    // Clear Pinia persisted device store and in-memory state
    if (typeof localStorage !== 'undefined') localStorage.removeItem('device-store')
    try { deviceStore.clearAuth() } catch (e) { /* ignore */ }
    // reload to ensure UI reflects cleared state
    window.location.reload()
  } catch (e) {
    logger.error('Failed to clear device auth', e)
  }
}
</script>

<template>
  <div class="flex h-screen w-screen p-4 relative overflow-hidden">
    
    <!-- Connection Status Indicator -->
    <div class="absolute top-4 left-4 z-50 flex items-center gap-3 glass-card px-4 py-2.5">
      <div class="flex items-center gap-2">
        <div 
          :class="[
            'w-3 h-3 rounded-full transition-all',
            isWebSocketConnected ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-red-500'
          ]"
        ></div>
        <span class="text-sm font-medium" :class="isWebSocketConnected ? 'text-green-400' : 'text-red-400'">
          {{ isWebSocketConnected ? 'Connected' : 'Offline' }}
        </span>
      </div>
      <div v-if="channelStatus.device || channelStatus.deviceControl" class="text-white/30 text-sm">|</div>
      <div v-if="channelStatus.device || channelStatus.deviceControl" class="flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
        <span class="text-sm text-primary font-medium">
          {{ (channelStatus.device ? 1 : 0) + (channelStatus.deviceControl ? 1 : 0) + (channelStatus.order ? 1 : 0) + (channelStatus.serviceRequest ? 1 : 0) }} channels
        </span>
      </div>
    </div>

    <!-- Exit/Settings Button - Enhanced touch target -->
    <button
      @click="openSettings"
      class="icon-btn absolute top-4 right-4 z-50 !w-12 !h-12 text-white/60 hover:text-white"
      title="Settings"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>

    <div class="flex-1 flex justify-center gap-6 flex-col items-center">
      <div class="z-10 flex flex-col justify-center items-center gap-4 text-center">
        <WoosooLogo />
        <div class="space-y-3">
          <h2 class="text-4xl lg:text-5xl font-extrabold font-raleway tracking-tight text-white flex flex-col leading-tight">
            <span>The grill is hot,</span>
            <span>the meat is marinated,</span>
            <span>and the feast awaits.</span>
          </h2>
        </div>
      </div>
      
      <div class="flex flex-col items-center gap-3">
        <PrimaryButton
          class="!px-12 !py-4 !text-lg ripple"
          :disabled="!deviceStore.isAuthenticated"
          :class="!deviceStore.isAuthenticated ? 'opacity-60 cursor-not-allowed' : ''"
          @click="start()"
        >
          Start Order
        </PrimaryButton>
        <p v-if="!deviceStore.isAuthenticated" class="text-sm text-white/60 mt-3 text-center">
          Device is not registered. You must register the device in Settings before starting an order.
          <NuxtLink to="/settings?requirePin=1" class="underline ml-2">Open Settings</NuxtLink>
        </p>

        <div v-if="!deviceStore.isAuthenticated" class="mt-4 text-sm text-white/60 text-center">
          <div>Registered: <span class="text-red-400">No</span></div>
          <div v-if="deviceStore.device && deviceStore.device.value" class="mt-1 font-mono text-xs">
            ID: {{ deviceStore.device.value.id || '—' }} &nbsp; Code: {{ deviceStore.device.value.code || '—' }}
          </div>
          <div class="mt-3">
            <button @click.prevent="clearDeviceAuth" class="px-3 py-2 rounded bg-white/10">Reset Device Auth</button>
          </div>
        </div>
        <p class="text-white/80 text-sm font-kanit text-center">
          Tap to begin your <span class="font-bold text-primary">Ultimate K-BBQ experience</span>
        </p>
      </div>
    </div>
  </div>
</template>