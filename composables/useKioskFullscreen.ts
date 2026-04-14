import { ref } from 'vue'
import { useDeviceStore } from '~/stores/Device'

// Singleton state — shared across every component that calls this composable.
// The listener is attached once (in app.vue) and updates these refs globally.
const isFullscreen = ref(false)
const showRecovery = ref(false)
let listenerAttached = false

export function useKioskFullscreen() {
  // Call once from app.vue onMounted to wire up the fullscreenchange listener.
  const attachListener = () => {
    if (listenerAttached || typeof document === 'undefined') return
    listenerAttached = true

    isFullscreen.value = !!document.fullscreenElement

    document.addEventListener('fullscreenchange', () => {
      const deviceStore = useDeviceStore()
      isFullscreen.value = !!document.fullscreenElement

      if (!document.fullscreenElement && !deviceStore.kioskUnlocked) {
        // Fullscreen was exited without admin permission — show recovery overlay.
        showRecovery.value = true
      } else {
        showRecovery.value = false
      }
    })
  }

  // Request fullscreen. Must be called inside a user-gesture handler
  // (click / touchstart) to satisfy browser security policy.
  const requestFullscreen = async () => {
    if (typeof document === 'undefined') return
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
      }
    } catch {
      // Browser doesn't support, or gesture requirement not met — silently ignore.
    }
  }

  // Exit fullscreen. Only called intentionally from the settings admin controls.
  const exitFullscreen = async () => {
    if (typeof document === 'undefined') return
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch {
      // ignore
    }
  }

  // Tap-to-recover handler — called from FullscreenRecovery overlay.
  const recover = async () => {
    await requestFullscreen()
    showRecovery.value = false
  }

  // Admin: unlock fullscreen (allow intentional exit).
  // Calling exitFullscreen() here satisfies the user-gesture requirement
  // because this runs inside the settings button click handler.
  const adminUnlock = async (deviceStore: ReturnType<typeof useDeviceStore>) => {
    deviceStore.kioskUnlocked = true
    await exitFullscreen()
  }

  // Admin: re-lock fullscreen (re-enter and enforce).
  const adminLock = async (deviceStore: ReturnType<typeof useDeviceStore>) => {
    deviceStore.kioskUnlocked = false
    await requestFullscreen()
    showRecovery.value = false
  }

  return {
    isFullscreen,
    showRecovery,
    attachListener,
    requestFullscreen,
    exitFullscreen,
    recover,
    adminUnlock,
    adminLock,
  }
}
