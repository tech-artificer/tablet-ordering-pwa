/**
 * useOfflineOrderQueue
 *
 * Manages a localStorage-backed queue for orders submitted while the device is offline.
 * Items are retried on reconnect using the same idempotency key to prevent duplicates.
 *
 * Session boundary: Session.ts clear() must call clearQueue() or remove the localStorage
 * key directly to prevent prior-guest orders bleeding into the next session.
 */
import { getCurrentInstance, onUnmounted } from 'vue'
import { logger } from '~/utils/logger'
import { useApi } from '~/composables/useApi'
import { API_ENDPOINTS } from '~/config/api'
import type { OrderPayload } from '~/types'

const QUEUE_KEY = 'woosoo_order_queue'
const MAX_ATTEMPTS = 5

interface QueuedOrder {
  id: string               // local queue entry ID (for deduplication)
  payload: OrderPayload
  idempotencyKey: string   // must be reused on every retry
  attempts: number
  queuedAt: number         // ms timestamp
}

const readQueue = (): QueuedOrder[] => {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    logger.warn('[OfflineQueue] Failed to parse queue', e)
    return []
  }
}

const writeQueue = (items: QueuedOrder[]) => {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items))
  } catch (e) {
    logger.warn('[OfflineQueue] Failed to write queue', e)
  }
}

export const useOfflineOrderQueue = () => {
  const { $notify } = useNuxtApp() as any

  const safeNotify = (opts: { type: string; message: string }) => {
    try {
      if (typeof $notify === 'function') {
        $notify({ ...opts, duration: 6000 })
      }
    } catch (e) {
      logger.debug('[OfflineQueue] notify unavailable', e)
    }
  }

  /**
   * Enqueue an order to be sent when the device comes back online.
   */
  const queueOrder = (payload: OrderPayload, idempotencyKey: string): void => {
    const queue = readQueue()
    const entry: QueuedOrder = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      payload,
      idempotencyKey,
      attempts: 0,
      queuedAt: Date.now(),
    }
    queue.push(entry)
    writeQueue(queue)
    logger.info('[OfflineQueue] Order queued — will send when online', { idempotencyKey })
  }

  /**
   * Attempt to send all queued orders. Called when the device comes back online.
   * Uses the same idempotency key for every retry attempt on the same queue entry.
   */
  const drainQueue = async (): Promise<void> => {
    const queue = readQueue()
    if (queue.length === 0) return

    logger.info('[OfflineQueue] Draining queue', { count: queue.length })

    const api = useApi()
    const remaining: QueuedOrder[] = []

    for (const entry of queue) {
      try {
        await api.post(API_ENDPOINTS.DEVICE_CREATE_ORDER, entry.payload, {
          headers: { 'X-Idempotency-Key': entry.idempotencyKey },
        })
        // Success — do NOT add back to remaining; clear idempotency key from sessionStorage
        if (typeof sessionStorage !== 'undefined') {
          try { sessionStorage.removeItem('woosoo_order_idem_key') } catch (e) { /* ignore */ }
        }
        logger.info('[OfflineQueue] Queued order sent successfully', { id: entry.id })
        safeNotify({ type: 'success', message: 'Your queued order has been sent!' })
      } catch (e: any) {
        const updatedEntry = { ...entry, attempts: entry.attempts + 1 }

        if (updatedEntry.attempts >= MAX_ATTEMPTS) {
          logger.warn('[OfflineQueue] Max attempts reached — dropping entry', { id: entry.id, attempts: updatedEntry.attempts })
          safeNotify({
            type: 'error',
            message: 'We could not send your queued order after several attempts. Please re-submit.',
          })
          // Dead-letter: do not re-add to remaining
        } else {
          logger.warn('[OfflineQueue] Retry failed', { id: entry.id, attempt: updatedEntry.attempts, error: e?.message })
          remaining.push(updatedEntry)
        }
      }
    }

    writeQueue(remaining)
  }

  /**
   * Clear all queued orders.
   * Must be called from Session.ts clear() to enforce session boundaries.
   */
  const clearQueue = (): void => {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(QUEUE_KEY)
        logger.debug('[OfflineQueue] Queue cleared (session boundary)')
      } catch (e) {
        logger.warn('[OfflineQueue] Failed to clear queue', e)
      }
    }
  }

  /**
   * Wire the drain trigger to the browser online event.
   * Call once in app.vue or a global plugin — safe to call multiple times
   * (the event listener is automatically removed on component unmount).
   */
  const registerOnlineListener = (): void => {
    if (typeof window === 'undefined') return

    const handler = () => {
      logger.info('[OfflineQueue] Device back online — draining queue')
      drainQueue().catch((e) => logger.warn('[OfflineQueue] Drain error', e))
    }

    window.addEventListener('online', handler)

    // Clean up on component unmount (Nuxt/Vue lifecycle)
    if (getCurrentInstance()) {
      onUnmounted(() => window.removeEventListener('online', handler))
    }
  }

  return {
    queueOrder,
    drainQueue,
    clearQueue,
    registerOnlineListener,
  }
}
