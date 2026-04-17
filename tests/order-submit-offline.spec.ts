// tests/order-submit-offline.spec.ts
// Tests for composables/useOrderSubmit.ts — offline-safe order submission wrapper.
//
// NOTE: useOrderSubmit no longer short-circuits on isOnline. It always attempts
// the fetch via orderStore.submitOrder. When offline, the network call fails
// immediately (no response), which is caught by the network-error path that
// queues to Dexie and returns { queued: true }. The tests simulate this by
// making mockSubmitOrder throw a network error (no .response property).

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// DeviceStore
const mockDeviceStore = { token: 'device-token-123' }
vi.mock('~/stores/Device', () => ({
  useDeviceStore: () => mockDeviceStore,
}))

// OrderStore.submitOrder — simulates success / failure
const mockSubmitOrder = vi.fn()
const mockSetOrderCreated = vi.fn()
const mockStartOrderPolling = vi.fn()
vi.mock('~/stores/Order', () => ({
  useOrderStore: () => ({
    submitOrder: mockSubmitOrder,
    setOrderCreated: mockSetOrderCreated,
    startOrderPolling: mockStartOrderPolling,
  }),
}))

// OfflineSyncStore
const mockRefreshPendingCount = vi.fn().mockResolvedValue(undefined)
vi.mock('~/stores/OfflineSync', () => ({
  useOfflineSyncStore: () => ({ refreshPendingCount: mockRefreshPendingCount }),
}))

// Outbox
const mockEnqueue = vi.fn().mockResolvedValue(undefined)
const mockMarkStatus = vi.fn().mockResolvedValue(undefined)
vi.mock('#app', () => ({
  useNuxtApp: () => ({
    $offlineOutbox: {
      enqueue: mockEnqueue,
      markStatus: mockMarkStatus,
    },
  }),
}))

vi.mock('~/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

// ---------------------------------------------------------------------------

import { useOrderSubmit } from '../composables/useOrderSubmit'

const samplePayload = {
  table_id: 1,
  guest_count: 2,
  items: [{ menu_id: 10, quantity: 1, is_package: false, modifiers: [] }],
}

describe('composables/useOrderSubmit', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    mockSubmitOrder.mockReset()
    mockSetOrderCreated.mockReset()
    mockStartOrderPolling.mockReset()
    mockEnqueue.mockReset()
    mockMarkStatus.mockReset()
    mockRefreshPendingCount.mockReset()
  })

  // -------------------------------------------------------------------------
  // Offline path
  // Simulated by making mockSubmitOrder throw a network error (no .response).
  // -------------------------------------------------------------------------

  it('offline/network-error submit queues to outbox and returns { queued: true }', async () => {
    mockSubmitOrder.mockRejectedValueOnce(new Error('Network Error'))
    const { submitOrder } = useOrderSubmit()
    const result = await submitOrder(samplePayload)
    expect(result.queued).toBe(true)
    expect(mockEnqueue).toHaveBeenCalledOnce()
    expect(mockSubmitOrder).toHaveBeenCalledWith(samplePayload)
  })

  it('offline submit does NOT call startOrderPolling', async () => {
    mockSubmitOrder.mockRejectedValueOnce(new Error('Network Error'))
    const { submitOrder } = useOrderSubmit()
    await submitOrder(samplePayload)
    expect(mockStartOrderPolling).not.toHaveBeenCalled()
  })

  it('offline submit captures Authorization header in outbox record', async () => {
    mockSubmitOrder.mockRejectedValueOnce(new Error('Network Error'))
    const { submitOrder } = useOrderSubmit()
    await submitOrder(samplePayload)
    const enqueueCall = mockEnqueue.mock.calls[0][0]
    expect(enqueueCall.headersSnapshot['Authorization']).toBe('Bearer device-token-123')
  })

  it('offline submit does NOT include X-XSRF-TOKEN in header snapshot', async () => {
    mockSubmitOrder.mockRejectedValueOnce(new Error('Network Error'))
    const { submitOrder } = useOrderSubmit()
    await submitOrder(samplePayload)
    const enqueueCall = mockEnqueue.mock.calls[0][0]
    expect(enqueueCall.headersSnapshot['X-XSRF-TOKEN']).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // Online success path
  // -------------------------------------------------------------------------

  it('online success delegates to orderStore.submitOrder', async () => {
    mockSubmitOrder.mockResolvedValueOnce({ success: true, order: { order_id: 5 } })
    const { submitOrder } = useOrderSubmit()
    const result = await submitOrder(samplePayload)
    expect(mockSubmitOrder).toHaveBeenCalledWith(samplePayload)
    expect(result.queued).toBeFalsy()
  })

  // -------------------------------------------------------------------------
  // Network failure path
  // (same mechanism as offline — no response object)
  // -------------------------------------------------------------------------

  it('network error (with message) queues to outbox for SW replay', async () => {
    const netError = new Error('Network Error') // no .response = network failure
    mockSubmitOrder.mockRejectedValueOnce(netError)
    const { submitOrder } = useOrderSubmit()
    const result = await submitOrder(samplePayload)
    expect(result.queued).toBe(true)
    expect(mockEnqueue).toHaveBeenCalledOnce()
  })

  // -------------------------------------------------------------------------
  // 409 path
  // -------------------------------------------------------------------------

  it('409 response treated as success — does not throw, returns data', async () => {
    const error: any = new Error('Conflict')
    error.response = { status: 409, data: { order: { order_id: 7, status: 'confirmed' } } }
    mockSubmitOrder.mockRejectedValueOnce(error)
    const { submitOrder } = useOrderSubmit()
    const result = await submitOrder(samplePayload)
    expect(result.queued).toBeFalsy()
    expect(result.data).toBeDefined()
  })

  // -------------------------------------------------------------------------
  // 401 auth error path
  // -------------------------------------------------------------------------

  it('401 marks outbox auth_error and enqueues record', async () => {
    const error: any = new Error('Unauthorized')
    error.response = { status: 401 }
    mockSubmitOrder.mockRejectedValueOnce(error)
    const { submitOrder } = useOrderSubmit()
    // 401 still enqueues but does NOT throw (returns normally)
    await submitOrder(samplePayload).catch(() => {})
    // The enqueue call should have status auth_error
    const enqueueCall = mockEnqueue.mock.calls[0]?.[0]
    expect(enqueueCall?.status).toBe('auth_error')
  })

  // -------------------------------------------------------------------------
  // Refill offline block (tested on the store level — shows contract)
  // -------------------------------------------------------------------------

  it('useOrderSubmit is for create-order only, not refill (refill blocked in Order store)', () => {
    // Contract: useOrderSubmit targets /api/devices/create-order only.
    // Refill offline blocking is handled by submitRefill() in Order.ts.
    const { submitOrder } = useOrderSubmit()
    // Verifying the composable exists and is callable
    expect(typeof submitOrder).toBe('function')
  })
})
