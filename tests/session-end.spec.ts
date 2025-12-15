import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useOrderStore } from '../stores/order'
import { useSessionStore } from '../stores/session'

describe('session end behavior', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
    try { globalThis.localStorage.clear() } catch (e) {}
  })

  it('end() clears order store and removes session_active flag', async () => {
    const order = useOrderStore()
    const session = useSessionStore()

    // Simulate active session + order state
    session.isActive = true
    session.orderId = 123
    try { localStorage.setItem('session_active', '1') } catch (e) {}

    order.cartItems = [{ id: 1, name: 'Taco', price: 10, quantity: 1 } as any]
    order.hasPlacedOrder = true
    order.currentOrder = { order: { order_id: 123 } }

    // Act: end session
    await session.end()

    // Assert: session cleared
    expect(session.isActive).toBe(false)
    expect(session.orderId).toBeNull()
    // localStorage flag removed
    expect(localStorage.getItem('session_active')).toBeNull()

    // Assert: order cleared
    expect(order.cartItems.length).toBe(0)
    expect(order.currentOrder).toBeNull()
    expect(order.hasPlacedOrder).toBe(false)
  })
})
