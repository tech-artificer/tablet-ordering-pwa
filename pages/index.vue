<template>
    <div class="relative h-screen w-screen flex flex-col overflow-hidden">
        <!-- Warm gradient background -->
        <div class="absolute inset-0 bg-screen-base" />

        <!-- Radial glow at center -->
        <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse 80% 60% at 50% 50%, rgba(246,181,109,0.06) 0%, transparent 70%)" />

        <!-- Welcome-screen flame layer (lazy: loads after first paint, hidden on error) -->
        <div v-if="showFlame" class="absolute inset-0 pointer-events-none z-0" aria-hidden="true">
            <img
                :src="flameSrc"
                alt=""
                class="absolute opacity-20 p-0 m-0 w-full h-full object-cover mix-blend-screen"
                @error="showFlame = false"
            >
        </div>

        <!-- CSS atmospheric glow (fallback + base layer beneath flame) -->
        <div class="absolute inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
            <!-- Warm amber pulse at bottom-center -->
            <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] rounded-full bg-primary/10 blur-3xl animate-pulse-glow" />
            <!-- Subtle cool-dark vignette at corners -->
            <div class="absolute inset-0" style="background: radial-gradient(ellipse 120% 90% at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)" />
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
                        <h3 class="text-2xl font-bold text-primary">
                            Settings
                        </h3>
                        <p class="text-sm text-white/60 mt-2">
                            {{ pinPrompt }}
                        </p>
                        <p v-if="pinNotice" class="text-xs text-primary/80 mt-2">
                            {{ pinNotice }}
                        </p>
                    </div>

                    <input
                        readonly
                        aria-live="polite"
                        :value="maskedPin"
                        placeholder="••••"
                        class="w-full px-4 py-4 rounded-xl bg-white/5 ring-1 ring-white/20 text-3xl tracking-[0.5em] text-center text-white placeholder-white/30 font-mono font-semibold"
                    >

                    <div class="grid grid-cols-3 gap-2">
                        <button
                            v-for="n in 9"
                            :key="n"
                            class="h-12 text-lg font-semibold rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 transition-all duration-150"
                            type="button"
                            @click.prevent="appendDigit(String(n))"
                        >
                            {{ n }}
                        </button>
                        <button
                            class="h-12 text-lg font-semibold rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 active:scale-95 transition-all duration-150 col-start-2"
                            type="button"
                            @click.prevent="appendDigit('0')"
                        >
                            0
                        </button>
                        <button
                            class="h-12 text-lg font-semibold rounded-lg bg-error/20 hover:bg-error/30 active:bg-error/40 active:scale-95 transition-all duration-150 col-start-3"
                            type="button"
                            aria-label="Backspace"
                            @click.prevent="backspace()"
                        >
                            ⌫
                        </button>
                    </div>

                    <p v-if="pinError" class="text-sm text-error bg-error/20 ring-1 ring-error/40 rounded-lg px-4 py-3 text-center font-medium animate-shake">
                        {{ pinError }}
                    </p>

                    <div class="flex gap-3 pt-4">
                        <FlameButton variant="secondary" size="md" class="flex-1" @click="closePinModal">
                            Cancel
                        </FlameButton>
                        <FlameButton variant="primary" size="md" class="flex-1" @click="submitPin">
                            {{ pinActionLabel }}
                        </FlameButton>
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
                    />
                </div>

                <!-- Settings Button -->
                <button
                    class="flex items-center justify-center w-12 h-12 rounded-full bg-surface-20 hover:bg-surface-10 ring-1 ring-white/10 hover:ring-primary/60 text-white/70 hover:text-primary transition-all focus:outline-none focus:ring-2 focus:ring-primary hover:shadow-lg"
                    title="Settings"
                    aria-label="Open settings"
                    :class="{ 'animate-spin-slow': showPinModal }"
                    @click="openSettings"
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
                            <div class="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-full blur-2xl" />
                            <WoosooLogo />
                        </div>
                    </div>

                    <div class="space-y-2 animate-fade-in-delayed">
                        <p class="text-xs tracking-[0.3em] uppercase font-semibold text-primary/80">
                            Authentic Korean BBQ
                        </p>
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
                        <div class="absolute -inset-2 rounded-2xl bg-primary/25 blur-xl opacity-80 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <button
                            class="relative flex items-center justify-center gap-2.5 rounded-2xl font-bold tracking-wide transition-all duration-200
                     bg-gradient-to-br from-primary via-primary to-primary-dark text-secondary
                     shadow-[0_4px_24px_rgba(246,181,109,0.30)]
                     hover:shadow-[0_6px_32px_rgba(246,181,109,0.50)] hover:brightness-110
                     active:scale-[0.97] active:shadow-none
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black
                     min-h-[56px] px-10 text-base"
                            aria-label="Begin your order"
                            @click="start"
                        >
                            <span>Begin the Feast</span>
                        </button>
                    </div>

                    <!-- Auth Status Message -->
                    <transition name="fade-in">
                        <div v-if="!deviceStore.isAuthenticated" class="bg-warning/20 ring-1 ring-warning/40 rounded-lg px-6 py-3 max-w-sm animate-slide-up">
                            <p class="text-sm text-warning font-medium mb-3">
                                This tablet isn't registered yet
                            </p>
                            <button
                                type="button"
                                class="w-full px-4 py-3 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                aria-label="Register device in Settings"
                                @click="openSettings"
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
import { Settings } from "lucide-vue-next"
import { unref } from "vue"
import flameSrc from "~/assets/images/flame.gif"

import { useDeviceStore } from "~/stores/Device"
import { useMenuStore } from "~/stores/Menu"
import { useNetworkStatus } from "~/composables/useNetworkStatus"
import { recoverActiveOrderState } from "~/composables/useActiveOrderRecovery"
const deviceStore = useDeviceStore()
const menuStore = useMenuStore()
const router = useRouter()
const nuxtApp = useNuxtApp()
const route = useRoute()
const { isOnline } = useNetworkStatus()

// On the welcome screen, show real network connectivity — not WebSocket subscription
// state, which is always false here because no channels are subscribed until the
// device is authenticated and an order session starts.
const isWebSocketConnected = computed(() => isOnline.value)

// Flame overlay — lazy: starts hidden so CTA/menus paint first, reveals after load
const showFlame = ref(false)
onMounted(() => {
    const img = new Image()
    img.onload = () => { showFlame.value = true }
    img.onerror = () => { showFlame.value = false }
    img.src = flameSrc
})

// PIN modal state
const showPinModal = ref(false)
const pinInput = ref("")
const pinError = ref("")
const pinNotice = ref("")
const PIN_STORAGE_KEY = "settings.pin"
const SETTINGS_PIN_AUTH_KEY = "settings.pin.auth_until"
const SETTINGS_PIN_AUTH_WINDOW_MS = 5 * 60 * 1000
const storedPin = ref<string | null>(null)
const isPinSetupMode = ref(false)
const pendingPin = ref("")
const pinSetupStep = ref<"create" | "confirm">("create")

onMounted(async () => {
    const recovery = await recoverActiveOrderState("index")
    if (recovery.hasActiveOrder) {
        let canResumeActiveOrder = unref(deviceStore.isAuthenticated)

        if (!canResumeActiveOrder) {
            try {
                const hasToken = Boolean(deviceStore.token)
                canResumeActiveOrder = hasToken
                    ? await deviceStore.refresh()
                    : await deviceStore.authenticate()
            } catch (error) {
                canResumeActiveOrder = false
            }
        }

        if (!canResumeActiveOrder || !unref(deviceStore.isAuthenticated)) {
            return
        }

        await router.replace({
            path: "/menu",
            query: recovery.packageId ? { packageId: String(recovery.packageId), resumeMenu: "1" } : { resumeMenu: "1" }
        })
        return
    }

    // Silently warm the package cache while kiosk is idle on the welcome screen.
    // loadAllMenus respects the 30-min cache — no duplicate requests if already fresh.
    menuStore.loadAllMenus().catch(() => { /* non-fatal — packageSelection will retry */ })

    if (route.query.settingsLocked === "1") {
        openSettings("Settings access expired. Please re-enter PIN.")
        await router.replace("/")
    }
})

const start = () => {
    if (!unref(deviceStore.isAuthenticated)) {
        openSettings()
        return
    }

    void nuxtApp.$router.replace("/order/start")
}

const openSettings = (noticeOrEvent?: string | PointerEvent) => {
    pinNotice.value = typeof noticeOrEvent === "string" ? noticeOrEvent : ""
    pinError.value = ""
    storedPin.value = typeof localStorage !== "undefined" ? localStorage.getItem(PIN_STORAGE_KEY) : null
    isPinSetupMode.value = !storedPin.value
    pendingPin.value = ""
    pinSetupStep.value = "create"
    if (isPinSetupMode.value && !pinNotice.value) {
        pinNotice.value = "Create a settings PIN before opening tablet settings."
    }
    showPinModal.value = true
}

const closePinModal = () => {
    showPinModal.value = false
    pinInput.value = ""
    pinError.value = ""
    pinNotice.value = ""
    pendingPin.value = ""
    pinSetupStep.value = "create"
    isPinSetupMode.value = false
}

const grantSettingsAccess = () => {
    if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(SETTINGS_PIN_AUTH_KEY, String(Date.now() + SETTINGS_PIN_AUTH_WINDOW_MS))
    }
    closePinModal()
    router.push("/settings")
}

const setupPin = () => {
    pinError.value = ""
    if (pinInput.value.length < 4) {
        pinError.value = "PIN must be at least 4 digits"
        return
    }

    if (pinSetupStep.value === "create") {
        pendingPin.value = pinInput.value
        pinInput.value = ""
        pinSetupStep.value = "confirm"
        pinNotice.value = "Re-enter the same PIN to confirm."
        return
    }

    if (pinInput.value !== pendingPin.value) {
        pinInput.value = ""
        pinSetupStep.value = "create"
        pendingPin.value = ""
        pinNotice.value = "Create a settings PIN before opening tablet settings."
        pinError.value = "PINs did not match. Try again."
        return
    }

    if (typeof localStorage !== "undefined") {
        localStorage.setItem(PIN_STORAGE_KEY, pendingPin.value)
    }
    storedPin.value = pendingPin.value
    grantSettingsAccess()
}

const verifyPin = () => {
    pinError.value = ""
    storedPin.value = typeof localStorage !== "undefined" ? localStorage.getItem(PIN_STORAGE_KEY) : null

    if (!storedPin.value) {
        isPinSetupMode.value = true
        setupPin()
        return
    }

    if (pinInput.value === storedPin.value) {
        grantSettingsAccess()
        return
    }
    pinError.value = "Incorrect PIN"
}

const submitPin = () => {
    if (isPinSetupMode.value) {
        setupPin()
        return
    }
    verifyPin()
}

const maskedPin = computed(() => "•".repeat(pinInput.value.length))
const pinPrompt = computed(() => {
    if (!isPinSetupMode.value) { return "Enter your PIN" }
    return pinSetupStep.value === "confirm" ? "Confirm your new PIN" : "Create a new PIN"
})
const pinActionLabel = computed(() => {
    if (!isPinSetupMode.value) { return "Verify" }
    return pinSetupStep.value === "confirm" ? "Save" : "Next"
})
const MAX_PIN_LENGTH = 6
const KEYPAD_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const
const appendDigit = (d: string) => {
    if (pinInput.value.length >= 6) { return }
    pinInput.value += d
    pinError.value = ""
}
const backspace = () => {
    pinInput.value = pinInput.value.slice(0, -1)
    pinError.value = ""
}
</script>

<style scoped>
.fade-in-enter-active, .fade-in-leave-active {
  transition: opacity 0.3s ease;
}

.fade-in-enter-from, .fade-in-leave-to {
  opacity: 0;
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
</style>
