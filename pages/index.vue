<template>
  <div class="relative h-screen w-screen flex flex-col overflow-hidden">
    <!-- Warm gradient background with subtle texture -->
    <div class="absolute inset-0 bg-gradient-to-br from-secondary-dark via-secondary to-accent-warm opacity-90"></div>
    
    <!-- Premium flame effect (subtle) -->
    <div v-if="showFlame" class="absolute inset-0 pointer-events-none z-0">
      <img
        :src="flameSrc"
        alt=""
        role="presentation"
        class="absolute opacity-20 p-0 m-0 w-full h-full object-cover"
        aria-hidden="true"
      />
    </div>

    <!-- Content Layer -->
    <div class="relative z-10 flex flex-col h-full items-center justify-center px-6">
      <!-- PIN modal -->
      <div
        v-if="showPinModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity"
      >
        <div class="bg-gradient-to-br from-secondary to-secondary-dark text-white shadow-2xl ring-1 ring-primary/30 rounded-2xl p-8 w-full max-w-xs space-y-6 border-t-2 border-primary">
          <div class="text-center">
            <h3 class="text-2xl font-bold text-primary">Settings</h3>
            <p class="text-sm text-white/60 mt-2">Enter your PIN</p>
          </div>

          <input
            readonly
            aria-live="polite"
            :value="maskedPin"
            placeholder="••••"
            class="w-full px-4 py-4 rounded-xl bg-white/5 ring-1 ring-white/20 text-3xl tracking-[0.5em] text-center text-white placeholder-white/30 font-mono"
          />

          <div class="grid grid-cols-3 gap-2">
            <button v-for="n in 9" :key="n" @click.prevent="appendDigit(String(n))" class="h-12 text-lg font-semibold rounded-lg bg-white/10 hover:bg-primary/20 active:scale-95 transition">{{ n }}</button>
            <button @click.prevent="appendDigit('0')" class="h-12 text-lg font-semibold rounded-lg bg-white/10 hover:bg-primary/20 active:scale-95 transition col-start-2">0</button>
            <button @click.prevent="backspace()" class="h-12 text-lg font-semibold rounded-lg bg-error/20 hover:bg-error/30 active:scale-95 transition col-start-3">⌫</button>
          </div>

          <p v-if="pinError" class="text-sm text-error bg-error/20 ring-1 ring-error/40 rounded-lg px-4 py-3 text-center font-medium">{{ pinError }}</p>
          
          <div class="flex gap-3">
            <FlameButton variant="secondary" size="md" class="flex-1" @click="closePinModal">Cancel</FlameButton>
            <FlameButton variant="primary" size="md" class="flex-1" @click="verifyPin">Verify</FlameButton>
          </div>
        </div>
      </div>

      <!-- Status Bar - Top -->
      <div class="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <!-- Connection Status -->
        <div class="flex items-center gap-3 bg-surface-20 backdrop-blur-md ring-1 ring-white/10 rounded-full px-4 py-2">
          <div 
            :class="[
              'w-2.5 h-2.5 rounded-full transition-all',
              isWebSocketConnected ? 'bg-success animate-pulse' : 'bg-error'
            ]"
          ></div>
          <span class="text-xs font-medium" :class="isWebSocketConnected ? 'text-success' : 'text-error'">
            {{ isWebSocketConnected ? 'Online' : 'Offline' }}
          </span>
        </div>

        <!-- Settings Button -->
        <button
          @click="openSettings"
          class="flex items-center justify-center w-10 h-10 rounded-full bg-surface-20 hover:bg-surface-15 ring-1 ring-white/10 text-white/70 hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
          title="Settings"
          aria-label="Settings"
        >
          <Settings :size="20" stroke-width="2" />
        </button>
      </div>

      <!-- Main Content -->
      <div class="flex flex-col items-center gap-10 text-center">
        <!-- Logo & Welcome -->
        <div class="space-y-6">
          <div class="flex justify-center">
            <div class="relative">
              <div class="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-full blur-2xl"></div>
              <WoosooLogo />
            </div>
          </div>
          
          <div class="space-y-2">
            <p class="text-xs tracking-[0.3em] uppercase font-semibold text-primary/80">Premium Korean BBQ</p>
            <h1 class="text-5xl font-bold font-raleway text-white leading-tight">
              <span class="block">The Grill</span>
              <span class="block">Awaits</span>
            </h1>
            <p class="text-white/60 font-kanit text-lg tracking-wide mt-4">
              gather • grill • savor
            </p>
          </div>
        </div>

        <!-- CTA Button -->
        <div class="space-y-4">
          <FlameButton 
            :disabled="!deviceStore.isAuthenticated"
            variant="primary"
            size="lg"
            class="shadow-glow text-lg"
            @click="start"
          >
            <Package :size="20" stroke-width="2" />
            <span>Start Your Order</span>
          </FlameButton>

          <!-- Auth Status Message -->
          <transition name="fade-in">
            <div v-if="!deviceStore.isAuthenticated" class="bg-warning/20 ring-1 ring-warning/40 rounded-lg px-6 py-3 max-w-sm">
              <p class="text-sm text-warning">Device not registered</p>
              <button
                type="button"
                @click="openSettings"
                class="mt-2 text-primary hover:text-primary/80 font-semibold text-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                Register in Settings →
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDeviceStore } from '~/stores/Device';
import { useSessionStore } from '~/stores/Session'
import { useBroadcasts } from '~/composables/useBroadcasts';
import { Settings, Package } from 'lucide-vue-next';
import { recoverActiveOrderState } from '~/composables/useActiveOrderRecovery'
import { logger } from '../utils/logger'
import flameSrc from '~/assets/images/flame.gif'

const session = useSessionStore();
const deviceStore = useDeviceStore();
const router = useRouter();
const { channelStatus } = useBroadcasts();

const isWebSocketConnected = ref(false);
const showFlame = ref(true);

// PIN modal state
const showPinModal = ref(false)
const pinInput = ref('')
const pinError = ref('')
const PIN_STORAGE_KEY = 'settings.pin'
const storedPin = ref<string | null>(null)
const DEFAULT_PIN = '0711'

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
  const interval = setInterval(checkWebSocketStatus, 3000);
  
  if ((window as any).Echo?.connector?.pusher) {
    (window as any).Echo.connector.pusher.connection.bind('state_change', (states: any) => {
      isWebSocketConnected.value = states.current === 'connected';
    });
  }
  
  onUnmounted(() => clearInterval(interval));
});

const start = () => {
  const timestamp = new Date().toISOString()
  console.log(`[🎬 Session START] Welcome screen → Start button clicked at ${timestamp}`)
  
  if (!deviceStore.isAuthenticated) {
    console.log(`[⚠️ Device Auth Failed] Redirecting to Settings at ${timestamp}`)
    router.replace({ path: '/settings', query: { requirePin: '1' } })
    return
  }
  
  console.log(`[✅ Device Ready] Starting session at ${timestamp}`)
  session.start()
  router.replace('/order/start')
}

const openSettings = () => {
  storedPin.value = (typeof localStorage !== 'undefined' && localStorage.getItem(PIN_STORAGE_KEY)) || DEFAULT_PIN
  showPinModal.value = true
}

const closePinModal = () => {
  showPinModal.value = false
  pinInput.value = ''
  pinError.value = ''
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

const maskedPin = computed(() => '•'.repeat(pinInput.value.length))
const appendDigit = (d: string) => {
  if (pinInput.value.length >= 6) return
  pinInput.value += d
  pinError.value = ''
}
const backspace = () => {
  pinInput.value = pinInput.value.slice(0, -1)
  pinError.value = ''
}
</script>

<style scoped>
.fade-in-enter-active, .fade-in-leave-active {
  transition: opacity 0.3s ease;
}

.fade-in-enter-from, .fade-in-leave-to {
  opacity: 0;
}
</style>
