<template>
  <div class="relative h-screen w-screen flex flex-col overflow-hidden">
    <!-- Warm gradient background -->
    <div class="absolute inset-0 bg-gradient-to-br from-secondary-dark via-secondary to-accent-warm opacity-90"></div>

    <!-- Radial glow at center -->
    <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(246,181,109,0.06) 0%, transparent 70%)"></div>

    <!-- CSS atmospheric glow (replaces flame.gif - no image bleed, no 9.8MB load) -->
    <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <!-- Warm amber pulse at bottom-center -->
      <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] rounded-full bg-primary/10 blur-3xl animate-pulse-glow"></div>
      <!-- Subtle cool-dark vignette at corners -->
      <div class="absolute inset-0" style="background: radial-gradient(ellipse 120% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)"></div>
    </div>

    <!-- Subtle Branded Accent (bottom, decorative) -->
    <div class="absolute bottom-0 left-0 right-0 z-0 pointer-events-none flex justify-center" aria-hidden="true">
      <svg width="320" height="64" viewBox="0 0 320 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-[80vw] max-w-xl h-16 opacity-20">
        <ellipse cx="160" cy="32" rx="150" ry="20" fill="url(#accentGradient)" />
        <defs>
          <linearGradient id="accentGradient" x1="0" y1="32" x2="320" y2="32" gradientUnits="userSpaceOnUse">
            <stop stop-color="#F6B56D" stop-opacity="0.5" />
            <stop offset="0.5" stop-color="#F6B56D" stop-opacity="0.2" />
            <stop offset="1" stop-color="#F6B56D" stop-opacity="0.5" />
          </linearGradient>
        </defs>
      </svg>
    </div>

    <!-- Content Layer -->
    <div class="relative z-10 flex flex-col h-full items-center justify-center px-6">
      <!-- PIN modal -->
      <div
        v-if="showPinModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity"
      >
        <div class="bg-gradient-to-br from-secondary to-secondary-dark text-white shadow-2xl ring-1 ring-primary/30 rounded-2xl p-8 w-full max-w-xs space-y-6 border-t-2 border-primary animate-modal-enter">
          <div class="text-center">
            <h3 class="text-2xl font-bold text-primary">Settings</h3>
            <p class="text-sm text-white/60 mt-2">Enter your PIN</p>
          </div>

          <input
            readonly
            aria-live="polite"
            :value="maskedPin"
            placeholder="••••"
            class="w-full px-4 py-4 rounded-xl bg-white/5 ring-1 ring-white/20 text-3xl tracking-[0.5em] text-center text-white placeholder-white/30 font-mono font-semibold"
          />

          <div class="grid grid-cols-3 gap-2">
            <button 
              v-for="n in 9" 
              :key="n" 
              @click.prevent="appendDigit(String(n))" 
              class="h-12 text-lg font-semibold rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 transition-all duration-150"
              type="button"
            >
              {{ n }}
            </button>
            <button 
              @click.prevent="appendDigit('0')" 
              class="h-12 text-lg font-semibold rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 transition-all duration-150 col-start-2"
              type="button"
            >
              0
            </button>
            <button 
              @click.prevent="backspace()" 
              class="h-12 text-lg font-semibold rounded-lg bg-error/20 hover:bg-error/30 active:bg-error/40 active:scale-95 transition-all duration-150 col-start-3"
              type="button"
              aria-label="Backspace"
            >
              ⌫
            </button>
          </div>

          <p v-if="pinError" class="text-sm text-error bg-error/20 ring-1 ring-error/40 rounded-lg px-4 py-3 text-center font-medium animate-shake">{{ pinError }}</p>
          
          <div class="flex gap-3 pt-4">
            <FlameButton variant="secondary" size="md" class="flex-1" @click="closePinModal">Cancel</FlameButton>
            <FlameButton variant="primary" size="md" class="flex-1" @click="verifyPin">Verify</FlameButton>
          </div>
        </div>
      </div>

      <!-- Status Bar - Top -->
      <div class="absolute top-6 left-6 right-6 flex items-center justify-between z-20">
        <!-- Connection Status -->
        <div class="flex items-center gap-3 bg-surface-20 backdrop-blur-md ring-1 ring-white/10 rounded-full px-4 py-2 transition-all">
          <div 
            :class="[
              'w-2.5 h-2.5 rounded-full transition-all',
              isWebSocketConnected ? 'bg-success animate-pulse' : 'bg-error'
            ]"
          ></div>
          <span class="text-xs font-medium transition-colors" :class="isWebSocketConnected ? 'text-success' : 'text-error'">
            {{ isWebSocketConnected ? 'Online' : 'Offline' }}
          </span>
        </div>

        <!-- Settings Button -->
        <button
          @click="openSettings"
          class="flex items-center justify-center w-12 h-12 rounded-full bg-surface-20 hover:bg-surface-10 ring-1 ring-white/10 hover:ring-primary/60 text-white/70 hover:text-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary hover:shadow-lg"
          title="Settings"
          aria-label="Open settings"
          :class="{ 'animate-spin-slow': showPinModal }"
        >
          <Settings :size="22" stroke-width="1.5" />
        </button>
      </div>

      <!-- Main Content -->
      <div class="flex flex-col items-center gap-10 text-center">
        <!-- Logo & Welcome -->
        <div class="space-y-6 animate-fade-in">
          <div class="flex justify-center">
            <div class="relative animate-float-slow">
              <div class="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-full blur-2xl"></div>
              <WoosooLogo />
            </div>
          </div>
          
          <div class="space-y-2 animate-fade-in-delayed">
            <p class="text-xs tracking-[0.3em] uppercase font-semibold text-primary/80">Authentic Korean BBQ</p>
            <h1 class="text-5xl font-bold font-raleway text-white leading-tight">
              <span class="block">Your Table,</span>
              <span class="block">Your Grill.</span>
            </h1>
            <p class="text-white/60 font-kanit text-lg tracking-wide mt-4">
              gather • grill • savor
            </p>
          </div>
        </div>

        <!-- CTA Button -->
        <div class="space-y-4 animate-fade-in-delayed-2">
          <div class="relative inline-block group">
            <!-- Glow layer — contained, no bleed -->
            <div class="absolute -inset-2 rounded-2xl bg-primary/25 blur-xl opacity-80 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

            <button
              @click="start"
              class="relative flex items-center justify-center gap-2.5 rounded-2xl font-bold tracking-wide transition-all duration-200
                     bg-gradient-to-br from-primary via-primary to-primary-dark text-secondary
                     shadow-[0_4px_24px_rgba(246,181,109,0.30)]
                     hover:shadow-[0_6px_32px_rgba(246,181,109,0.50)] hover:brightness-110
                     active:scale-[0.97] active:shadow-none
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                     min-h-[56px] px-10 text-base"
              aria-label="Begin your order"
            >
              <UtensilsCrossed :size="20" stroke-width="2.5" class="flex-shrink-0" />
              <span>Begin the Feast</span>
            </button>
          </div>

          <!-- Auth Status Message -->
          <transition name="fade-in">
            <div v-if="!deviceStore.isAuthenticated" class="bg-warning/20 ring-1 ring-warning/40 rounded-lg px-6 py-3 max-w-sm animate-slide-up">
              <p class="text-sm text-warning font-medium mb-3">This tablet isn't registered yet</p>
              <button
                type="button"
                @click="openSettings"
                class="w-full px-4 py-3 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Register device in Settings"
              >
                Set up in Settings →
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
import { useMenuStore } from '~/stores/Menu';
import { Settings, UtensilsCrossed } from 'lucide-vue-next';
import { recoverActiveOrderState } from '~/composables/useActiveOrderRecovery'
import { logger } from '../utils/logger'
const session = useSessionStore();
const deviceStore = useDeviceStore();
const menuStore = useMenuStore();
const router = useRouter();
const { channelStatus } = useBroadcasts();

const isWebSocketConnected = computed(() => channelStatus.value.device || channelStatus.value.deviceControl || channelStatus.value.order || channelStatus.value.serviceRequest);

// PIN modal state
const showPinModal = ref(false)
const pinInput = ref('')
const pinError = ref('')
const PIN_STORAGE_KEY = 'settings.pin'
const storedPin = ref<string | null>(null)
const DEFAULT_PIN = '0711'

onMounted(async () => {
  const recovery = await recoverActiveOrderState('index')
  if (recovery.hasActiveOrder) {
    await router.replace({
      path: '/menu',
      query: recovery.packageId ? { packageId: String(recovery.packageId), resumeMenu: '1' } : { resumeMenu: '1' }
    })
    return
  }

  // Silently warm the package cache while kiosk is idle on the welcome screen.
  // loadAllMenus respects the 30-min cache — no duplicate requests if already fresh.
  menuStore.loadAllMenus().catch(() => { /* non-fatal — packageSelection will retry */ })
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

// Ambient food strip images (static paths, served from public/)
const foodImages = [
  '/images/food/samgyupsal.png',
  '/images/food/beef-bulgogi.png',
  '/images/food/golden-mushroom-beef-roll.png',
  '/images/food/gyeran-jjim-egg-souffle.png',
  '/images/food/korean-chili-pepper-samgyupsal.png',
  '/images/food/yangyeom-samgyupsal.png',
  '/images/food/woosamgyup.png',
  '/images/food/plain-samgyupsal.png',
  '/images/food/dak-galbi-plain-or-spicy.png',
  '/images/food/sweet-and-crunchy-tofu-dubu-ganjeong.png',
]
</script>

<style scoped>
.fade-in-enter-active, .fade-in-leave-active {
  transition: opacity 0.3s ease;
}

.fade-in-enter-from, .fade-in-leave-to {
  opacity: 0;
}

/* ─── Ambient food strip ────────────────────────────── */
.food-strip {
  height: 160px;
  overflow: hidden;
}

.food-track {
  overflow-x: auto;
  scrollbar-width: none;
  animation: auto-scroll 20s linear infinite;
  pause: auto;
}

.food-track::-webkit-scrollbar {
  display: none;
}

.food-track:hover {
  animation-play-state: paused;
}

@keyframes auto-scroll {
  0% {
    scroll-behavior: smooth;
  }
}

/* ─── Entrance & Decorative Animations ────────────── */

/* Logo float animation */
@keyframes float-slow {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-12px);
  }
}

.animate-float-slow {
  animation: float-slow 4s ease-in-out infinite;
}

/* Fade in animations with stagger */
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.animate-fade-in {
  animation: fade-in 0.8s ease-out;
}

.animate-fade-in-delayed {
  animation: fade-in 0.8s ease-out 0.2s both;
}

.animate-fade-in-delayed-2 {
  animation: fade-in 0.8s ease-out 0.4s both;
}

/* Slide up animation */
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-up {
  animation: slide-up 0.5s ease-out;
}

/* Pulse glow for CTA button container */
@keyframes pulse-glow {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.6;
  }
}

.animate-pulse-glow {
  animation: pulse-glow 3s ease-in-out infinite;
}

/* Settings button spin animation */
@keyframes spin-slow {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin-slow {
  animation: spin-slow 2s linear infinite;
}

/* Modal enter animation */
@keyframes modal-enter {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.animate-modal-enter {
  animation: modal-enter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Shake animation for error messages */
@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

.animate-shake {
  animation: shake 0.4s ease-in-out;
}

/* Enhance food thumbnails styling */
.food-thumb {
  transition: transform 0.3s ease, filter 0.3s ease;
}

.food-thumb:hover {
  transform: scale(1.05);
  filter: brightness(1.1);
}
</style>
