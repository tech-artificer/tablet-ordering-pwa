// composables/useNetworkStatus.ts
// Network status monitoring for offline-first behavior
// Enhanced with Capacitor Network plugin when available

import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Network, type PluginListenerHandle } from '@capacitor/network'
import { Capacitor } from '@capacitor/core'
import { logger } from '~/utils/logger'

const isOnline = ref(true)
const wasOffline = ref(false) // Track if we recovered from offline
const connectionType = ref<string | null>(null)

let initialized = false
let capacitorListener: PluginListenerHandle | null = null

/**
 * Check if running in Capacitor native context
 */
function isCapacitor(): boolean {
  return Capacitor.isNativePlatform()
}

export function useNetworkStatus() {
  const updateOnlineStatus = () => {
    const previousStatus = isOnline.value
    isOnline.value = navigator.onLine
    
    // Track recovery from offline
    if (!previousStatus && isOnline.value) {
      wasOffline.value = true
      // Reset after 5 seconds
      setTimeout(() => {
        wasOffline.value = false
      }, 5000)
    }
  }

  const updateConnectionType = () => {
    if ('connection' in navigator) {
      const conn = (navigator as any).connection
      connectionType.value = conn?.effectiveType || null
    }
  }

  const setupCapacitorNetwork = async () => {
    try {
      // Get initial network status
      const status = await Network.getStatus()
      isOnline.value = status.connected
      connectionType.value = status.connectionType
      
      logger.debug('[Network] Capacitor network initialized:', status)

      // Listen to network changes
      capacitorListener = await Network.addListener('networkStatusChange', (status) => {
        const previousStatus = isOnline.value
        isOnline.value = status.connected
        connectionType.value = status.connectionType
        
        logger.debug('[Network] Capacitor network changed:', status)
        
        // Track recovery from offline
        if (!previousStatus && isOnline.value) {
          wasOffline.value = true
          setTimeout(() => {
            wasOffline.value = false
          }, 5000)
        }
      })
    } catch (e) {
      logger.warn('[Network] Failed to setup Capacitor network, falling back to web API', e)
    }
  }

  onMounted(async () => {
    if (typeof window === 'undefined') return
    if (initialized) return
    
    // Set initialized flag immediately to prevent race conditions
    initialized = true

    if (isCapacitor()) {
      // Use Capacitor Network plugin in native context
      await setupCapacitorNetwork()
    } else {
      // Fallback to Web API
      isOnline.value = navigator.onLine
      updateConnectionType()

      window.addEventListener('online', updateOnlineStatus)
      window.addEventListener('offline', updateOnlineStatus)

      if ('connection' in navigator) {
        (navigator as any).connection?.addEventListener('change', updateConnectionType)
      }
    }
  })

  onBeforeUnmount(() => {
    if (typeof window === 'undefined') return
    
    // Clean up Capacitor listener if it exists
    if (capacitorListener) {
      capacitorListener.remove()
      capacitorListener = null
    }
    
    // Also clean up web API listeners (in case of platform switch or fallback)
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)

      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', updateConnectionType)
      }
    }
  })

  return {
    isOnline,
    wasOffline,
    connectionType,
    
    // Helper to check before API calls
    checkConnection: (): boolean => {
      if (!isOnline.value) {
        logger.warn('[Network] Device is offline')
        return false
      }
      return true
    },

    // Helper to determine if on slow connection
    isSlowConnection: (): boolean => {
      return connectionType.value === 'slow-2g' || connectionType.value === '2g'
    }
  }
}
