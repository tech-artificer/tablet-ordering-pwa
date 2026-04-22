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
import { useDeviceStore } from '../stores/Device'
import type { CartItem, Package } from '../types'

describe('order polling fallback', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.useFakeTimers()
    mockGet.mockReset()
    mockPost.mockReset()
    // Initialize session store to prevent null ref errors
    const session = useSessionStore()
    session.$state.isActive = true
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
    const device = useDeviceStore()

    // Mock API to return a full order for the session order id
    mockGet.mockResolvedValueOnce({ data: { order: { id: 19561, status: 'preparing', total_amount: 200 } } })

    // Simulate persisted session order id
    session.$state.orderId = 19561
    device.$state.token = 'test-token'

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

  it('initializeFromSession defers server active-order lookup when token is unavailable', async () => {
    const order = useOrderStore()
    const session = useSessionStore()

    // Simulate cold boot: no token yet and no active session id restored.
    session.$state.orderId = null as any

    await order.initializeFromSession()

    expect(mockGet).not.toHaveBeenCalled()
    expect(order.hasPlacedOrder).toBe(false)
    expect(order.getCurrentOrder()).toBeNull()
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
