// Ensure localStorage shim for Node/jsdom
if (typeof globalThis.localStorage === 'undefined') {
  const storage: Record<string, string> = {}
  // @ts-ignore
  globalThis.localStorage = {
    getItem: (k: string) => (Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null),
    setItem: (k: string, v: string) => { storage[k] = String(v) },
    removeItem: (k: string) => { delete storage[k] },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]) }
  }
}

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock useApi before importing stores
const mockGet = vi.fn()
const mockPost = vi.fn()
vi.mock('../composables/useApi', () => ({ useApi: () => ({ get: mockGet, post: mockPost }) }))

import { useOrderStore } from '../stores/Order'
import { useSessionStore } from '../stores/Session'
import type { CartItem, Package } from '../types'

describe('order polling fallback', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.useFakeTimers()
    mockGet.mockReset()
    mockPost.mockReset()
    // Ensure test environment reports online so polling starts
    // Ensure navigator.onLine exists and is writable in test env
    if (typeof global.navigator === 'undefined') {
      // @ts-ignore
      global.navigator = { onLine: true } as any
    } else {
      try {
        Object.defineProperty(global.navigator, 'onLine', { value: true, configurable: true })
      } catch (e) {
        // ignore if cannot redefine
      }
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts polling after setOrderCreated and stops when order becomes completed', async () => {
    const order = useOrderStore()

    // First tick returns 'preparing' so polling stays active past the isPolling assertion.
    // The immediate tick's microtask resolves BEFORE the test's await resumes, so the mock
    // must NOT return a terminal status on the first call.
    mockGet
      .mockResolvedValueOnce({ data: { order: { id: 19561, status: 'preparing' } } })
      .mockResolvedValueOnce({ data: { order: { id: 19561, status: 'completed' } } })

    // Act: simulate order creation response
    await order.setOrderCreated({ order: { id: 19561, order_number: 'ORD-19561' } })

    // After the await, the immediate tick has already run (preparing) — polling still active
    expect(order.getIsPolling()).toBe(true)
    expect(order.getCurrentOrder()?.order?.status).toBe('preparing')

    // Advance past the 5 s interval to fire the second tick (completed)
    vi.advanceTimersByTime(6000)
    // Allow the async tick chain to resolve
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    // The canonical order should be updated to completed and polling stopped
    expect(order.getCurrentOrder()?.order?.status).toBe('completed')
    expect(order.getIsPolling()).toBe(false)
    expect(order.getPollTimerId()).toBeNull()
  })

  it('initializeFromSession fetches canonical order and prevents new order submission', async () => {
    const order = useOrderStore()
    const session = useSessionStore()

    // Mock API to return a full order for the session order id
    mockGet.mockResolvedValueOnce({ data: { order: { id: 19561, status: 'preparing', total_amount: 200 } } })

    // Simulate persisted session order id
    session.setOrderId(19561)

    await order.initializeFromSession()

    expect(order.hasPlacedOrder).toBe(true)
    expect(order.getCurrentOrder()).toBeTruthy()
    expect(order.getCurrentOrder()?.order?.id).toBe(19561)

    // Attempt to submit a new order should throw due to hasPlacedOrder guard
    order.setPackage({ id: 1, price: 100 } as Package)
    order.setCartItems([{ id: 10, name: 'Extra', price: 5, quantity: 1 } as CartItem])
    order.setGuestCount(1)

    await expect(order.submitOrder()).rejects.toThrow('An initial order has already been placed')
  })

  it('does not crash when polling receives an empty response body', async () => {
    const order = useOrderStore()

    mockGet
      .mockResolvedValueOnce({ data: { order: { id: 19561, status: 'preparing' } } })
      .mockResolvedValueOnce(undefined as any)

    await order.setOrderCreated({ order: { id: 19561, order_number: 'ORD-19561' } })

    expect(order.getIsPolling()).toBe(true)

    vi.advanceTimersByTime(6000)
    await Promise.resolve()
    await Promise.resolve()

    expect(order.getIsPolling()).toBe(true)
    expect(order.getCurrentOrder()?.order?.status).toBe('preparing')
  })
})
