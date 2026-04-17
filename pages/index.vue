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
const KEYPAD_DIGITS = ['1','2','3','4','5','6','7','8','9'] as const
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
    try { deviceStore.clearAuth() } catch (e) { logger.debug('clearDeviceAuth: clearAuth failed', e) }
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
    <div v-if="showPinModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xl backdrop-brightness-75 transition-opacity">
      <div
        class="bg-slate-900/90 text-white shadow-2xl shadow-black/40 ring-1 ring-white/10 rounded-2xl p-6 w-full max-w-sm space-y-3 border-t-2 border-primary/60">
        <h3 class="text-lg font-semibold">Enter Settings PIN</h3>
        <p class="text-xs text-white/60">Enter staff PIN to access Settings.</p>

        <!-- PIN dot indicators -->
        <div class="flex items-center justify-center gap-3 py-3" role="status" aria-live="polite" :aria-label="`${pinInput.length} of ${MAX_PIN_LENGTH} digits entered`">
          <div
            v-for="i in MAX_PIN_LENGTH"
            :key="i"
            :class="[
              'w-3.5 h-3.5 rounded-full transition-all duration-200',
              i <= pinInput.length
                ? 'bg-primary scale-110 shadow-md shadow-primary/40'
                : 'bg-white/15 border border-white/20'
            ]"
          />
        </div>

        <!-- Keypad grid -->
        <div class="grid grid-cols-3 gap-2.5 mt-2">
          <button
            v-for="digit in KEYPAD_DIGITS"
            :key="digit"
            @click.prevent="appendDigit(digit)"
            :aria-label="`Digit ${digit}`"
            class="keypad-btn text-xl"
          >{{ digit }}</button>
          <button @click.prevent="backspace()" aria-label="Delete last digit" class="keypad-btn text-xl">⌫</button>
          <button @click.prevent="appendDigit('0')" aria-label="Digit 0" class="keypad-btn text-xl">0</button>
          <button @click.prevent="clearPin()" aria-label="Clear all digits" class="keypad-btn text-base">Clear</button>
        </div>

        <p v-if="pinError" role="alert" class="text-xs text-red-300 bg-red-500/10 rounded-lg px-3 py-1.5">{{ pinError }}</p>
        <div class="flex items-center justify-end gap-2">
          <button @click="closePinModal()" class="px-4 py-2.5 text-sm rounded-lg bg-white/15 hover:bg-white/25 min-h-[44px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Cancel</button>
          <button @click.prevent="verifyPin()"
            class="px-4 py-2.5 text-sm font-semibold rounded-lg bg-primary text-slate-950 hover:bg-primary/90 min-h-[44px] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Enter</button>
        </div>
      </div>
    </div>

    <!-- Connection Status Indicator -->
    <div class="absolute top-4 left-4 z-50 flex items-center gap-2.5 glass-card px-3.5 py-2" role="status" aria-live="polite">
      <div class="flex items-center gap-2">
        <div :class="[
          'w-2.5 h-2.5 rounded-full transition-all duration-300',
          isWebSocketConnected ? 'bg-green-500 shadow-md shadow-green-500/50' : 'bg-red-500 shadow-md shadow-red-500/40'
        ]" :aria-hidden="true"></div>
        <span class="text-xs font-medium" :class="isWebSocketConnected ? 'text-green-400' : 'text-red-400'">
          {{ isWebSocketConnected ? 'Connected' : 'Offline' }}
        </span>
      </div>
      <template v-if="channelStatus.device || channelStatus.deviceControl">
        <div class="w-px h-4 bg-white/15"></div>
        <div class="flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5 text-primary/80" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
          <span class="text-xs text-primary/80 font-medium">
            {{ (channelStatus.device ? 1 : 0) + (channelStatus.deviceControl ? 1 : 0) + (channelStatus.order ? 1 : 0) +
              (channelStatus.serviceRequest ? 1 : 0) }}ch
          </span>
        </div>
      </template>
    </div>

    <!-- Exit/Settings Button -->
    <button @click="openSettings"
      class="icon-btn absolute top-4 right-4 z-50 w-12 h-12 text-white/60 hover:text-white"
      aria-label="Open settings"
      title="Settings">
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
            <span class="font-bold text-primary"> and the feast awaits.</span>
          </h2>
        </div>
      </div>

      <div class="flex flex-col items-center gap-3">
        <PrimaryButton :disabled="!deviceStore.isAuthenticated" size="lg"
          class="!px-14 !py-5 !text-lg !rounded-full !font-kanit" @click="start()">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path
              d="M12.378 1.602a.75.75 0 00-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03zM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 00.372-.648V7.93zM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 00.372.648l8.628 5.033z" />
          </svg>
          Start Order
        </PrimaryButton>
        <p v-if="!deviceStore.isAuthenticated" class="text-sm text-white/60 mt-3 text-center">
          Device is not registered. You must register the device in Settings before starting an order.
          <button type="button"
            class="underline ml-2 text-primary hover:text-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
            @click.prevent="openSettings">
            Open Settings
          </button>
        </p>

        <div v-if="!deviceStore.isAuthenticated" class="mt-4 text-sm text-white/60 text-center">
          <!-- <div>Registered: <span class="text-red-400">No</span></div> -->
          <div v-if="deviceStore.device && deviceStore.device.value" class="mt-1 font-mono text-xs">
            ID: {{ deviceStore.device.value.id || '—' }} &nbsp; Code: {{ deviceStore.device.value.code || '—' }}
          </div>
          <!-- <div class="mt-3">
            <button @click.prevent="clearDeviceAuth" class="px-3 py-2 rounded bg-white/10">Reset Device Auth</button>
          </div> -->
        </div>
        <p class="text-white/80 text-sm font-kanit text-center mt-4">
          Tap to begin your <span class="font-bold text-primary">Ultimate K-BBQ experience</span>
        </p>
      </div>
    </div>
  </div>
</template>