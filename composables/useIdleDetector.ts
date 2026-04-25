import { ref, onUnmounted } from "vue"
import { logger } from "~/utils/logger"

const IDLE_WARN_MS = 2 * 60 * 1000 // 2 minutes → show "Still there?" modal
const IDLE_END_MS = 5 * 60 * 1000 // 5 minutes → auto-end session

const ACTIVITY_EVENTS: string[] = ["touchstart", "touchend", "mousedown", "keydown", "scroll"]

export function useIdleDetector (options?: {
  onWarn?: () => void
  onExpire?: () => void
  warnMs?: number
  expireMs?: number
}) {
    const warnMs = options?.warnMs ?? IDLE_WARN_MS
    const expireMs = options?.expireMs ?? IDLE_END_MS

    const isWarning = ref(false)
    let warnTimer: ReturnType<typeof setTimeout> | null = null
    let expireTimer: ReturnType<typeof setTimeout> | null = null
    let active = false

    function clearTimers () {
        if (warnTimer) { clearTimeout(warnTimer); warnTimer = null }
        if (expireTimer) { clearTimeout(expireTimer); expireTimer = null }
    }

    function scheduleTimers () {
        clearTimers()

        warnTimer = setTimeout(() => {
            isWarning.value = true
            logger.info("[IdleDetector] Idle warning threshold reached")
            options?.onWarn?.()

            expireTimer = setTimeout(() => {
                logger.warn("[IdleDetector] Idle expire threshold reached — ending session")
                options?.onExpire?.()
            }, expireMs - warnMs)
        }, warnMs)
    }

    function resetIdle () {
        if (!active) { return }
        if (isWarning.value) {
            // User interacted while warning was showing — dismiss it
            isWarning.value = false
        }
        scheduleTimers()
    }

    function start () {
        if (active) { return }
        active = true
        ACTIVITY_EVENTS.forEach(ev => document.addEventListener(ev, resetIdle, { passive: true }))
        scheduleTimers()
        logger.debug("[IdleDetector] Started")
    }

    function stop () {
        if (!active) { return }
        active = false
        clearTimers()
        isWarning.value = false
        ACTIVITY_EVENTS.forEach(ev => document.removeEventListener(ev, resetIdle))
        logger.debug("[IdleDetector] Stopped")
    }

    onUnmounted(stop)

    return { isWarning, start, stop, resetIdle }
}
