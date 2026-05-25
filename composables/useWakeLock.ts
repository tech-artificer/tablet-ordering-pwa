import { ref } from "vue"
import { logger } from "~/utils/logger"

const isActive = ref(false)
let sentinel: WakeLockSentinel | null = null

function isSupported (): boolean {
    return typeof navigator !== "undefined" && "wakeLock" in navigator
}

async function acquireWakeLock (): Promise<void> {
    if (!isSupported()) { return }
    if (sentinel !== null) { return } // already held
    try {
        sentinel = await navigator.wakeLock.request("screen")
        isActive.value = true
        logger.info("[WakeLock] Screen wake lock acquired")

        sentinel.addEventListener("release", () => {
            // Browser released the lock (e.g. tab backgrounded) — clear our ref
            sentinel = null
            isActive.value = false
            logger.debug("[WakeLock] Released by browser")
        })
    } catch (err: any) {
        // NotAllowedError is thrown when the page is not visible; safe to ignore
        logger.debug("[WakeLock] Could not acquire:", err?.message ?? err)
    }
}

async function releaseWakeLock (): Promise<void> {
    if (!sentinel) { return }
    try {
        await sentinel.release()
    } catch {
        // ignore
    } finally {
        sentinel = null
        isActive.value = false
        logger.info("[WakeLock] Screen wake lock released")
    }
}

// Re-acquire when tab becomes visible again (browsers drop it on hide)
if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && isActive.value && sentinel === null) {
            acquireWakeLock()
        }
    })
}

export function useWakeLock () {
    return { isActive, acquireWakeLock, releaseWakeLock }
}
