// tests/offline-sync-store.spec.ts
// Unit tests for stores/OfflineSync.ts

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCountPending = vi.fn().mockResolvedValue(0)
const mockListPending = vi.fn().mockResolvedValue([])
const mockMarkStatus = vi.fn().mockResolvedValue(undefined)

vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $offlineOutbox: {
      countPending: mockCountPending,
      listPending: mockListPending,
      markStatus: mockMarkStatus,
    },
  }),
}))

const mockSetOrderCreated = vi.fn().mockResolvedValue(undefined)
const mockStartOrderPolling = vi.fn()

vi.mock('~/stores/Order', () => ({
  useOrderStore: () => ({
    setOrderCreated: mockSetOrderCreated,
    startOrderPolling: mockStartOrderPolling,
  }),
}))

vi.mock('~/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

import { useOfflineSyncStore } from '../stores/OfflineSync'

describe('stores/OfflineSync', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    mockCountPending.mockReset().mockResolvedValue(0)
    mockListPending.mockReset().mockResolvedValue([])
    mockMarkStatus.mockReset()
    mockSetOrderCreated.mockReset()
    mockStartOrderPolling.mockReset()
  })

  it('initial state is idle with no errors', () => {
    const store = useOfflineSyncStore()
    expect(store.isSyncing).toBe(false)
    expect(store.pendingCount).toBe(0)
    expect(store.lastSyncAt).toBeNull()
    expect(store.lastError).toBeNull()
  })

  it('setSyncing(true) marks isSyncing', () => {
    const store = useOfflineSyncStore()
    store.setSyncing(true)
    expect(store.isSyncing).toBe(true)
    expect(store.lastSyncAt).toBeNull()
  })

  it('setSyncing(false) clears isSyncing and sets lastSyncAt', () => {
    const store = useOfflineSyncStore()
    store.setSyncing(true)
    store.setSyncing(false)
    expect(store.isSyncing).toBe(false)
    expect(store.lastSyncAt).not.toBeNull()
  })

  it('refreshPendingCount calls outbox and updates store', async () => {
    mockCountPending.mockResolvedValueOnce(3)
    const store = useOfflineSyncStore()
    await store.refreshPendingCount()
    expect(store.pendingCount).toBe(3)
  })

  it('store does NOT own isOnline (no isOnline state)', () => {
    const store = useOfflineSyncStore()
    // isOnline must come from useNetworkStatus, not this store
    expect((store as any).isOnline).toBeUndefined()
  })

  describe('attachServiceWorkerEvents message handling', () => {
    function fireSwMessage(data: Record<string, unknown>) {
      // Simulate the service worker message event on navigator.serviceWorker
      const listeners: Array<(e: MessageEvent) => void> = (
        navigator.serviceWorker as any
      )._testListeners ?? []
      const event = new MessageEvent('message', { data })
      for (const l of listeners) l(event)
    }

    beforeEach(() => {
      // Provide minimal navigator.serviceWorker mock
      ;(globalThis as any).navigator = {
        ...(globalThis.navigator ?? {}),
        serviceWorker: {
          addEventListener(event: string, cb: (e: MessageEvent) => void) {
            if (event === 'message') {
              this._testListeners = this._testListeners ?? []
              this._testListeners.push(cb)
            }
          },
          _testListeners: [] as Array<(e: MessageEvent) => void>,
        },
      }
    })

    it('orders-sync-start sets isSyncing and clears lastError', async () => {
      const store = useOfflineSyncStore()
      store.lastError = 'previous error'
      store.attachServiceWorkerEvents()

      fireSwMessage({ type: 'orders-sync-start' })
      // Wait for async operations
      await new Promise((r) => setTimeout(r, 10))
      expect(store.isSyncing).toBe(true)
      expect(store.lastError).toBeNull()
    })

    it('orders-sync-success calls setOrderCreated and startOrderPolling', async () => {
      const store = useOfflineSyncStore()
      store.attachServiceWorkerEvents()
      const fakeOrder = { order_id: 42, status: 'confirmed' }

      fireSwMessage({ type: 'orders-sync-success', order: fakeOrder })
      await new Promise((r) => setTimeout(r, 20))

      expect(mockSetOrderCreated).toHaveBeenCalled()
      expect(mockStartOrderPolling).toHaveBeenCalledWith(42)
      expect(store.isSyncing).toBe(false)
    })

    it('orders-sync-409 treated as success — calls setOrderCreated', async () => {
      const store = useOfflineSyncStore()
      store.attachServiceWorkerEvents()
      const fakeOrder = { order_id: 99, status: 'confirmed' }

      fireSwMessage({ type: 'orders-sync-409', order: fakeOrder })
      await new Promise((r) => setTimeout(r, 20))

      expect(mockSetOrderCreated).toHaveBeenCalled()
      expect(store.isSyncing).toBe(false)
    })

    it('orders-sync-success marks pending outbox rows as synced', async () => {
      mockListPending.mockResolvedValueOnce([
        { id: 'rec-1', status: 'queued_sw' },
        { id: 'rec-2', status: 'syncing' },
      ])

      const store = useOfflineSyncStore()
      store.attachServiceWorkerEvents()

      fireSwMessage({ type: 'orders-sync-success', order: { order_id: 42, status: 'confirmed' } })
      await new Promise((r) => setTimeout(r, 20))

      expect(mockMarkStatus).toHaveBeenCalledWith('rec-1', 'synced')
      expect(mockMarkStatus).toHaveBeenCalledWith('rec-2', 'synced')
    })

    it('orders-sync-error sets lastError and stops syncing', async () => {
      const store = useOfflineSyncStore()
      store.isSyncing = true
      store.attachServiceWorkerEvents()

      fireSwMessage({ type: 'orders-sync-error', message: 'Network error' })
      await new Promise((r) => setTimeout(r, 10))

      expect(store.isSyncing).toBe(false)
      expect(store.lastError).toBe('Network error')
    })

    it('auth_error marks outbox rows with auth_error status', async () => {
      mockListPending.mockResolvedValueOnce([
        { id: 'rec-1', status: 'queued_sw' },
        { id: 'rec-2', status: 'syncing' },
      ])
      const store = useOfflineSyncStore()
      store.attachServiceWorkerEvents()

      fireSwMessage({ type: 'orders-sync-error', message: 'auth_error: 401' })
      await new Promise((r) => setTimeout(r, 20))

      expect(mockMarkStatus).toHaveBeenCalledWith('rec-1', 'auth_error', expect.any(String))
      expect(mockMarkStatus).toHaveBeenCalledWith('rec-2', 'auth_error', expect.any(String))
    })
  })
})
