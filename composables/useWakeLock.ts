import { ref } from "vue"
import { logger } from "~/utils/logger"

// isActive means "we want the wake lock held" (intent), not "sentinel is currently live".
// This distinction matters because the browser drops the sentinel on tab hide but we
// still want it — the visibilitychange handler reacquires it when the tab is shown again.
const isActive = ref(false)
let sentinel: WakeLockSentinel | null = null

function isSupported (): boolean {
    return typeof navigator !== "undefined" && "wakeLock" in navigator
}

async function acquireWakeLock (): Promise<void> {
    if (!isSupported()) { return }
    isActive.value = true // Record intent first — visibilitychange can retry if request fails
    if (sentinel !== null) { return } // already held
    try {
        sentinel = await navigator.wakeLock.request("screen")
        logger.info("[WakeLock] Screen wake lock acquired")

        sentinel.addEventListener("release", () => {
            // Browser dropped the lock (e.g. tab backgrounded). Clear the sentinel ref
            // but leave isActive=true so visibilitychange reacquires on next tab show.
            sentinel = null
        })
    } catch (err: any) {
        // NotAllowedError when page is not visible — visibilitychange will retry
        logger.debug("[WakeLock] Could not acquire:", err?.message ?? err)
    }
}

async function releaseWakeLock (): Promise<void> {
    // Clear intent BEFORE releasing so visibilitychange won't reacquire if it fires
    // during the async release.
    isActive.value = false
    if (!sentinel) { return }
    try {
        await sentinel.release()
    } catch {
        // ignore
    } finally {
        sentinel = null
        logger.info("[WakeLock] Screen wake lock released")
    }
}

// Re-acquire when tab becomes visible again (browsers drop sentinel on hide).
// isActive=true means we still want it; sentinel=null means it was dropped.
if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden && isActive.value && sentinel === null) {
            acquireWakeLock().catch(() => {})
        }
    })
}

export function useWakeLock () {
    return { isActive, acquireWakeLock, releaseWakeLock }
}
