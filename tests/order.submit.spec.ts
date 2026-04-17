// Minimal localStorage shim for Node/jsdom test env (Pinia persist may access localStorage)
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

import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock the composable that the store uses for API calls. Must be declared before importing the store.
const mockPost = vi.fn()
vi.mock('../composables/useApi', () => ({ useApi: () => ({ post: mockPost }) }))

import { setActivePinia, createPinia } from 'pinia'
import { useDeviceStore } from '../stores/Device'
import { useSessionStore } from '../stores/Session'
import { useOrderStore } from '../stores/Order'
import type { CartItem, Package } from '../types'

describe('stores/order - submitOrder', () => {
  beforeEach(async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    mockPost.mockReset()
    // Provide a fake authenticated device to satisfy store validation
    const dsInstance = useDeviceStore()
    ;(dsInstance as any).token = 'test-token'
    ;(dsInstance as any).table = { id: 1, name: 'Test Table' }
    // Initialize session store to prevent null ref errors
    const session = useSessionStore()
    session.$state.isActive = true
  })

  it('submits order, sets currentOrder and clears cartItems (success path)', async () => {
    const order = useOrderStore()

    // Prepare store state
    order.package = { id: 1, price: 100, is_taxable: false } as any
    order.guestCount = 2
    order.cartItems = [
      { id: 10, name: 'Beef Brisket', price: 5, quantity: 2, category: 'meats' } as any,
      { id: 11, name: 'Extra Side', price: 3, quantity: 1 } as any
    ]

    const apiOrder = { id: 999, total_amount: 110, order_number: 'ORD-999' }
    const apiResp = { success: true, order: apiOrder }
    mockPost.mockResolvedValueOnce({ data: apiResp })

    const result = await order.submitOrder()

    // API call shape
    expect(mockPost).toHaveBeenCalledWith('/api/devices/create-order', expect.objectContaining({
      guest_count: expect.any(Number),
      items: expect.any(Array)
    }), expect.any(Object))

    // Store updated: currentOrder should be the full response data
    expect(order.currentOrder).toEqual(apiResp)
    expect(order.cartItems).toEqual([])
    // history appended
    expect(order.getHistory().length).toBeGreaterThanOrEqual(1)
    expect(order.getHistory()[order.getHistory().length - 1]).toEqual(apiResp)
    // function returns backend data
    expect(result).toEqual(apiResp)
  })

  it('propagates API errors and does not clear cartItems on failure', async () => {
    const order = useOrderStore()

    order.package = { id: 2, price: 50 } as any
    order.guestCount = 1
    order.cartItems = [
      { id: 12, name: 'Pork Belly', price: 4, quantity: 1, category: 'meats' } as any
    ]

    mockPost.mockRejectedValueOnce(new Error('Network error'))

    await expect(order.submitOrder()).rejects.toThrow('Network error')

    // ensure cartItems remain unchanged on failure
    expect(order.getCartItems().length).toBeGreaterThan(0)
  })

  it('fails cleanly when order creation response body is empty', async () => {
    const order = useOrderStore()

    order.setPackage({ id: 1, name: 'Combo', price: 100, is_taxable: false } as Package)
    order.setGuestCount(2)
    order.setCartItems([
      { id: 9, name: 'Wagyu Beef', price: 0, quantity: 1, category: 'meats', isUnlimited: false } as CartItem,
    ])

    mockPost.mockResolvedValueOnce(undefined as any)

    await expect(order.submitOrder()).rejects.toThrow('Order creation response missing body')
    expect(order.getCartItems().length).toBe(1)
  })
})
