// stores/OfflineSync.ts
// Tracks offline Background Sync state for the order queue.
// Intentionally does NOT own isOnline — reads it from useNetworkStatus composable.

import { defineStore } from "pinia"
import { reactive, toRefs } from "vue"
import { useNuxtApp } from "#app"
import { logger } from "~/utils/logger"

interface OfflineSyncState {
  isSyncing: boolean
  pendingCount: number
  lastSyncAt: number | null
  lastError: string | null
}

export const useOfflineSyncStore = defineStore("offline-sync", () => {
    const state = reactive<OfflineSyncState>({
        isSyncing: false,
        pendingCount: 0,
        lastSyncAt: null,
        lastError: null,
    })

    async function refreshPendingCount (): Promise<void> {
        try {
            const { $offlineOutbox } = useNuxtApp()
            if ($offlineOutbox) {
                state.pendingCount = await ($offlineOutbox as any).countPending()
            }
        } catch (err) {
            logger.warn("[OfflineSync] Could not refresh pending count:", err)
        }
    }

    function setSyncing (flag: boolean): void {
        state.isSyncing = flag
        if (!flag) {
            state.lastSyncAt = Date.now()
        }
    }

    /**
   * Attach to the service worker message bus.
   * Must be called once from a component or plugin that has access to `window`.
   */
    function attachServiceWorkerEvents (): void {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) { return }

        navigator.serviceWorker.addEventListener("message", async (event: MessageEvent) => {
            const { type, order } = event.data ?? {}

            switch (type) {
            case "orders-sync-start":
                state.isSyncing = true
                state.lastError = null
                await refreshPendingCount()
                break

            case "orders-sync-success":
            case "orders-sync-409": {
                state.isSyncing = false
                state.lastSyncAt = Date.now()
                state.lastError = null

                // Forward the recovered order data to the Order store so polling can start
                try {
                    // Lazily import to avoid circular deps at module init time
                    const { useOrderStore } = await import("~/stores/Order")
                    const orderStore = useOrderStore()
                    if (order) {
                        await orderStore.setOrderCreated(order)
                        orderStore.startOrderPolling(
                            order?.order_id ?? order?.id ?? order?.order?.order_id
                        )
                    }
                } catch (err) {
                    logger.error("[OfflineSync] Failed to set order created after SW sync:", err)
                }

                // Clean up Dexie outbox: mark all pending records as synced so the
                // pendingCount banner dismisses. We clear all pending rows because the
                // Workbox queue and Dexie records are not linked by ID; in practice a
                // kiosk has at most one queued order at a time.
                try {
                    const { $offlineOutbox } = useNuxtApp()
                    if ($offlineOutbox) {
                        const pending = await ($offlineOutbox as any).listPending()
                        for (const rec of pending) {
                            await ($offlineOutbox as any).markStatus(rec.id, "synced")
                        }
                    }
                } catch (err) {
                    logger.warn("[OfflineSync] Could not clean up outbox after sync:", err)
                }

                await refreshPendingCount()
                break
            }

            case "orders-sync-error": {
                const message: string = event.data?.message ?? "Unknown error"
                state.isSyncing = false
                state.lastError = message
                logger.warn("[OfflineSync] Background sync error:", message)

                // Mark auth errors in the outbox
                if (message.includes("auth_error")) {
                    try {
                        const { $offlineOutbox } = useNuxtApp()
                        const pending = await ($offlineOutbox as any).listPending()
                        for (const rec of pending) {
                            await ($offlineOutbox as any).markStatus(rec.id, "auth_error", message)
                        }
                    } catch (err) {
                        logger.warn("[OfflineSync] Could not mark outbox auth_error:", err)
                    }
                }

                await refreshPendingCount()
                break
            }

            default:
                break
            }
        })
    }

    return ({
        ...toRefs(state),
        refreshPendingCount,
        setSyncing,
        attachServiceWorkerEvents,
    } as unknown) as any
})
