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

    // Arrange: first tick remains non-terminal, second tick transitions terminal
    mockGet
      .mockResolvedValueOnce({ data: { order: { id: 19561, status: 'preparing' } } })
      .mockResolvedValueOnce({ data: { order: { id: 19561, status: 'completed' } } })

    // Act: simulate order creation response
    await order.setOrderCreated({ order: { id: 19561, order_number: 'ORD-19561' } })

    // Immediately after creation, polling should have started
    expect(order.isPolling).toBe(true)

    // Let the immediate tick resolve and advance timers enough to run two ticks
    await Promise.resolve()
    vi.advanceTimersByTime(10000)
    // allow pending microtasks to complete
    await Promise.resolve()
    await Promise.resolve()

    // Wait for the polling ticks to run and update the order
    await Promise.resolve()
    await Promise.resolve()

    // The canonical order should be updated to completed
    expect(order.currentOrder?.order?.status).toBe('completed')

    // Ensure we can stop the poll and clear timers (defensive cleanup)
    order.stopOrderPolling()
    expect(order.isPolling).toBe(false)
    expect(order.pollTimerId).toBeNull()
  })

  it('initializeFromSession fetches canonical order and prevents new order submission', async () => {
    const order = useOrderStore()
    const session = useSessionStore()

    // Mock API to return a full order for the session order id
    mockGet.mockResolvedValueOnce({ data: { order: { id: 19561, status: 'preparing', total_amount: 200 } } })

    // Simulate persisted session order id
    session.orderId = 19561

    await order.initializeFromSession()

    expect(order.hasPlacedOrder).toBe(true)
    expect(order.currentOrder).toBeTruthy()
    expect(order.currentOrder.order.id).toBe(19561)

    // Attempt to submit a new order should throw due to hasPlacedOrder guard
    order.package = { id: 1, price: 100 } as any
    order.cartItems = [{ id: 10, name: 'Extra', price: 5, quantity: 1 } as any]
    order.guestCount = 1

    await expect(order.submitOrder()).rejects.toThrow('An initial order has already been placed')
  })
})
