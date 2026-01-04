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

const isWebSocketConnected = ref(false);

// PIN modal state for settings access
const showPinModal = ref(false)
const pinInput = ref('')
const pinError = ref('')
const PIN_STORAGE_KEY = 'settings.pin'
const storedPin = ref<string | null>(null)
const DEFAULT_PIN = '0711'

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
  logger.debug('Start clicked - checking network and Reverb connectivity');

  // Check online status
  if (!navigator.onLine) {
    ElMessageBox.alert(
      'Network connection required to process orders.',
      'No Network Connection',
      { type: 'error' }
    );
    return;
  }

  // Check Reverb/WebSocket connection
  if (!isWebSocketConnected.value) {
    ElMessageBox.alert(
      'Broadcasting service connection required. Please wait or restart the app.',
      'Connection Unavailable',
      { type: 'error' }
    );
    return;
  }

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

const openSettings = () => {
  // Load stored PIN or use default
  storedPin.value = (typeof localStorage !== 'undefined' && localStorage.getItem(PIN_STORAGE_KEY)) || DEFAULT_PIN
  showPinModal.value = true
}

const closePinModal = () => {
  showPinModal.value = false
  pinInput.value = ''
  pinError.value = ''
  storedPin.value = (typeof localStorage !== 'undefined' && localStorage.getItem(PIN_STORAGE_KEY)) || DEFAULT_PIN
}

const verifyPin = () => {
  pinError.value = ''
  storedPin.value = (typeof localStorage !== 'undefined' && localStorage.getItem(PIN_STORAGE_KEY)) || DEFAULT_PIN

  if (pinInput.value === storedPin.value) {
    closePinModal()
    router.push('/settings')
    return
  }
  pinError.value = 'Incorrect PIN'
}

// Calculator-style keypad helpers
const maskedPin = computed(() => '•'.repeat(pinInput.value.length))
const MAX_PIN_LENGTH = 6
const appendDigit = (d: string) => {
  if (pinInput.value.length >= MAX_PIN_LENGTH) return
  pinInput.value = (pinInput.value || '') + d
  pinError.value = ''
}
const backspace = () => {
  pinInput.value = (pinInput.value || '').slice(0, -1)
  pinError.value = ''
}
const clearPin = () => {
  pinInput.value = ''
  pinError.value = ''
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

    <!-- PIN modal overlay -->
    <div v-if="showPinModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div class="bg-white/5 rounded-lg border border-white/10 p-6 w-full max-w-md">
        <h3 class="text-xl font-semibold mb-3">Enter Settings PIN</h3>
        <p class="text-sm text-white/60 mb-4">Enter staff PIN to access Settings.</p>

        <!-- Readonly masked display prevents virtual keyboard from opening -->
        <div class="mb-4">
          <input readonly :value="maskedPin" placeholder="Enter PIN"
            class="w-full px-4 py-2 rounded bg-white/5 text-xl tracking-widest text-center" />
        </div>

        <div class="grid grid-cols-3 gap-2 mb-3">
          <button @click.prevent="appendDigit('1')" class="px-4 py-3 rounded bg-white/10 text-xl">1</button>
          <button @click.prevent="appendDigit('2')" class="px-4 py-3 rounded bg-white/10 text-xl">2</button>
          <button @click.prevent="appendDigit('3')" class="px-4 py-3 rounded bg-white/10 text-xl">3</button>
          <button @click.prevent="appendDigit('4')" class="px-4 py-3 rounded bg-white/10 text-xl">4</button>
          <button @click.prevent="appendDigit('5')" class="px-4 py-3 rounded bg-white/10 text-xl">5</button>
          <button @click.prevent="appendDigit('6')" class="px-4 py-3 rounded bg-white/10 text-xl">6</button>
          <button @click.prevent="appendDigit('7')" class="px-4 py-3 rounded bg-white/10 text-xl">7</button>
          <button @click.prevent="appendDigit('8')" class="px-4 py-3 rounded bg-white/10 text-xl">8</button>
          <button @click.prevent="appendDigit('9')" class="px-4 py-3 rounded bg-white/10 text-xl">9</button>
          <button @click.prevent="backspace()" class="px-4 py-3 rounded bg-white/10 text-xl">⌫</button>
          <button @click.prevent="appendDigit('0')" class="px-4 py-3 rounded bg-white/10 text-xl">0</button>
          <button @click.prevent="clearPin()" class="px-4 py-3 rounded bg-white/10 text-xl">Clear</button>
        </div>

        <p v-if="pinError" class="text-sm text-red-400 mb-2">{{ pinError }}</p>
        <div class="flex items-center justify-end gap-3">
          <button @click="closePinModal()" class="px-3 py-2 rounded bg-white/10">Cancel</button>
          <button @click.prevent="verifyPin()" class="px-3 py-2 rounded bg-primary/20">Enter</button>
        </div>
      </div>
    </div>

    <!-- Connection Status Indicator -->
    <div class="absolute top-4 left-4 z-50 flex items-center gap-3 glass-card px-4 py-2.5">
      <div class="flex items-center gap-2">
        <div :class="[
          'w-3 h-3 rounded-full transition-all',
          isWebSocketConnected ? 'bg-green-500 animate-pulse shadow-lg shadow-green-500/50' : 'bg-red-500'
        ]"></div>
        <span class="text-sm font-medium" :class="isWebSocketConnected ? 'text-green-400' : 'text-red-400'">
          {{ isWebSocketConnected ? 'Connected' : 'Offline' }}
        </span>
      </div>
      <div v-if="channelStatus.device || channelStatus.deviceControl" class="text-white/30 text-sm">|</div>
      <div v-if="channelStatus.device || channelStatus.deviceControl" class="flex items-center gap-1.5">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
        <span class="text-sm text-primary font-medium">
          {{ (channelStatus.device ? 1 : 0) + (channelStatus.deviceControl ? 1 : 0) + (channelStatus.order ? 1 : 0) +
            (channelStatus.serviceRequest ? 1 : 0) }} channels
        </span>
      </div>
    </div>

    <!-- Exit/Settings Button - Enhanced touch target -->
    <button @click="openSettings"
      class="icon-btn absolute top-4 right-4 z-50 !w-12 !h-12 text-white/60 hover:text-white" title="Settings">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    </button>

    <div class="flex-1 flex justify-center gap-6 flex-col items-center">
      <div class="z-10 flex flex-col justify-center items-center gap-4 text-center">
        <WoosooLogo />
        <div class="space-y-3">
          <h2
            class="text-4xl lg:text-5xl font-extrabold font-raleway tracking-tight text-white flex flex-col leading-tight">
            <span>The grill is hot,</span>
            <span>the meat is marinated,</span>
            <span>and the feast awaits.</span>
          </h2>
        </div>
      </div>

      <div class="flex flex-col items-center gap-3">
        <PrimaryButton class="!px-12 !py-4 !text-lg ripple" :disabled="!deviceStore.isAuthenticated"
          :class="!deviceStore.isAuthenticated ? 'opacity-60 cursor-not-allowed' : ''" @click="start()">
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