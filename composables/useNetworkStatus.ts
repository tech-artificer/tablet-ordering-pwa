// composables/useNetworkStatus.ts
// Network status monitoring for offline-first behavior

import { ref, onMounted, onBeforeUnmount } from "vue"
import { logger } from "~/utils/logger"

const isOnline = ref(true)
const wasOffline = ref(false) // Track if we recovered from offline
const connectionType = ref<string | null>(null)

let initialized = false
let activeConsumers = 0

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
    if ("connection" in navigator) {
        const conn = (navigator as any).connection
        connectionType.value = conn?.effectiveType || null
    }
}

export function useNetworkStatus () {
    onMounted(() => {
        if (typeof window === "undefined") { return }
        activeConsumers += 1

        // Initial status
        isOnline.value = navigator.onLine
        updateConnectionType()

        if (initialized) { return }
        initialized = true

        // Listen to network changes
        window.addEventListener("online", updateOnlineStatus)
        window.addEventListener("offline", updateOnlineStatus)

        if ("connection" in navigator) {
            (navigator as any).connection?.addEventListener("change", updateConnectionType)
        }
    })

    onBeforeUnmount(() => {
        if (typeof window === "undefined") { return }
        activeConsumers = Math.max(0, activeConsumers - 1)
        if (activeConsumers > 0) { return }

        window.removeEventListener("online", updateOnlineStatus)
        window.removeEventListener("offline", updateOnlineStatus)

        if ("connection" in navigator) {
            (navigator as any).connection?.removeEventListener("change", updateConnectionType)
        }
        initialized = false
    })

    return {
        isOnline,
        wasOffline,
        connectionType,

        // Helper to check before API calls
        checkConnection: (): boolean => {
            if (!isOnline.value) {
                logger.warn("[Network] Device is offline")
                return false
            }
            return true
        },

        // Helper to determine if on slow connection
        isSlowConnection: (): boolean => {
            return connectionType.value === "slow-2g" || connectionType.value === "2g"
        }
    }
}
