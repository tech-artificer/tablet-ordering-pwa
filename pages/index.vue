<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useDeviceStore } from '~/stores/Device';
import { useSessionStore } from '~/stores/Session'
import WoosooLogo from '~/components/WoosooLogo.vue';
import PrimaryButton from '~/components/common/PrimaryButton.vue';
import { ElMessageBox } from 'element-plus';
import { useBroadcasts } from '~/composables/useBroadcasts';
import { recoverActiveOrderState } from '~/composables/useActiveOrderRecovery'
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

onMounted(async () => {
  const recovery = await recoverActiveOrderState('index')
  if (recovery.hasActiveOrder) {
    await router.replace('/menu')
    return
  }

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
  const timestamp = new Date().toISOString()
  console.log(`[🎬 Session START] Welcome screen → Start button clicked at ${timestamp}`)
  console.log(`[📋 Device Status] authenticated=${deviceStore.isAuthenticated} device_id=${deviceStore.device?.id} table_id=${(deviceStore.table as any)?.id}`)
  
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
    console.log(`[⚠️ Device Auth Failed] Not authenticated, redirecting to Settings at ${timestamp}`)
    logger.debug('Not authenticated, redirecting to Settings (PIN)')
    // Redirect to Settings and require staff PIN before revealing registration
    router.replace({ path: '/settings', query: { requirePin: '1' } })
    return
  }
  
  console.log(`[✅ Device Ready] Starting session at ${timestamp}`)
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
    <div
      v-if="showPinModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl backdrop-brightness-75 transition-opacity"
    >
      <div class="bg-slate-900/90 text-white shadow-2xl shadow-black/40 ring-1 ring-white/10 rounded-2xl p-8 w-full max-w-md space-y-4 border-t-2 border-primary/60">
        <h3 class="text-xl font-semibold">Enter Settings PIN</h3>
        <p class="text-sm text-white/60">Enter staff PIN to access Settings.</p>

        <!-- Readonly masked display prevents virtual keyboard from opening -->
        <div>
          <input
            readonly
            aria-live="polite"
            :value="maskedPin"
            placeholder="Enter PIN"
            class="w-full px-4 py-3 rounded-xl bg-white/10 ring-1 ring-white/15 text-2xl tracking-[0.35em] text-center"
          />
        </div>

        <div class="grid grid-cols-3 gap-3">
          <button @click.prevent="appendDigit('1')" class="h-14 text-2xl font-semibold rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">1</button>
          <button @click.prevent="appendDigit('2')" class="h-14 text-2xl font-semibold rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">2</button>
          <button @click.prevent="appendDigit('3')" class="h-14 text-2xl font-semibold rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">3</button>
          <button @click.prevent="appendDigit('4')" class="h-14 text-2xl font-semibold rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">4</button>
          <button @click.prevent="appendDigit('5')" class="h-14 text-2xl font-semibold rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">5</button>
          <button @click.prevent="appendDigit('6')" class="h-14 text-2xl font-semibold rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">6</button>
          <button @click.prevent="appendDigit('7')" class="h-14 text-2xl font-semibold rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">7</button>
          <button @click.prevent="appendDigit('8')" class="h-14 text-2xl font-semibold rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">8</button>
          <button @click.prevent="appendDigit('9')" class="h-14 text-2xl font-semibold rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">9</button>
          <button @click.prevent="backspace()" class="h-14 text-2xl font-semibold rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">⌫</button>
          <button @click.prevent="appendDigit('0')" class="h-14 text-2xl font-semibold rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">0</button>
          <button @click.prevent="clearPin()" class="h-14 text-2xl font-semibold rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">Clear</button>
        </div>

        <p v-if="pinError" class="text-sm text-red-300 bg-red-500/10 rounded-lg px-3 py-2">{{ pinError }}</p>
        <div class="flex items-center justify-end gap-3">
          <button @click="closePinModal()" class="px-4 py-3 rounded-xl bg-white/15 hover:bg-white/25">Cancel</button>
          <button @click.prevent="verifyPin()" class="px-4 py-3 rounded-xl bg-primary text-slate-950 hover:bg-primary/90">Enter</button>
        </div>
      </div>
    </div>

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
            <span class="font-bold text-primary"> and the feast awaits.</span>
          </h2>
        </div>
      </div>
      
      <div class="flex flex-col items-center gap-3">
        <button
          :disabled="!deviceStore.isAuthenticated"
          :class="[
            'px-14 py-5 text-lg font-semibold rounded-full transition-all duration-200 flex items-center gap-2',
            deviceStore.isAuthenticated 
              ? 'bg-gradient-to-r from-primary to-primary/85 text-white shadow-lg shadow-primary/40 hover:from-primary/95 hover:to-primary/80 active:scale-98' 
              : 'bg-transparent border-2 border-primary/40 text-primary/50 cursor-not-allowed'
          ]"
          @click="start()"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.378 1.602a.75.75 0 00-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03zM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 00.372-.648V7.93zM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 00.372.648l8.628 5.033z" />
          </svg>
          Start Order
        </button>
        <p v-if="!deviceStore.isAuthenticated" class="text-sm text-white/60 mt-3 text-center">
          Device is not registered. You must register the device in Settings before starting an order.
          <button
            type="button"
            class="underline ml-2 text-primary hover:text-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
            @click.prevent="openSettings"
          >
            Open Settings
          </button>
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
        <p class="text-white/80 text-sm font-kanit text-center mt-4">
          Tap to begin your <span class="font-bold text-primary">Ultimate K-BBQ experience</span>
        </p>
      </div>
    </div>
  </div>
</template>