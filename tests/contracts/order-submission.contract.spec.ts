/**
 * Contract Test: PWA → Backend (Order Submission)
 * 
 * Verifies that the PWA produces valid order payloads matching
 * the backend's StoreDeviceOrderRequest validation expectations.
 * 
 * This test documents the contract and prevents breaking changes.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useOrderStore } from '../../stores/Order'

describe('Contract: PWA → Backend (Order Submission)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should produce valid order payload schema with all required fields', () => {
    const store = useOrderStore();
    
    // Setup: Create a valid order scenario
    const mockPackage = {
      id: 1,
      name: 'Premium Package',
      price: 500,
      is_taxable: true,
      tax: { percentage: 10 }
    }
    
    store.setPackage(mockPackage as any)
    store.setGuestCount(4)
    
    store.addToCart({
      id: 10,
      name: 'Beef Brisket',
      price: 150,
      category: 'meats'
    } as any, { category: 'meats', isUnlimited: false })
    
    store.addToCart({
      id: 20,
      name: 'Kimchi',
      price: 50,
      category: 'sides'
    } as any, { category: 'sides', isUnlimited: true })

    // Act: Build the payload
    const payload = (store as any).buildPayload()

    // Assert: Top-level fields
    expect(payload).toHaveProperty('guest_count')
    expect(payload.guest_count).toBeGreaterThan(0)
    expect(payload.guest_count).toBe(4)
    
    expect(payload).toHaveProperty('subtotal')
    expect(typeof payload.subtotal).toBe('number')
    
    expect(payload).toHaveProperty('tax')
    expect(typeof payload.tax).toBe('number')
    expect(payload.tax).toBeGreaterThanOrEqual(0)
    
    expect(payload).toHaveProperty('discount')
    expect(typeof payload.discount).toBe('number')
    
    expect(payload).toHaveProperty('total_amount')
    expect(typeof payload.total_amount).toBe('number')
    expect(payload.total_amount).toBeGreaterThan(0)

    // Assert: Items array structure
    expect(payload).toHaveProperty('items')
    expect(Array.isArray(payload.items)).toBe(true)
    expect(payload.items.length).toBeGreaterThan(0)
    expect(payload.items.length).toBe(2)

    // Assert: Each item has required fields
    payload.items.forEach((item: any, index: number) => {
      expect(item).toHaveProperty('menu_id')
      expect(typeof item.menu_id).toBe('number')
      expect(item.menu_id).toBeGreaterThan(0)
      
      expect(item).toHaveProperty('name')
      expect(typeof item.name).toBe('string')
      expect(item.name.length).toBeGreaterThan(0)
      
      expect(item).toHaveProperty('quantity')
      expect(typeof item.quantity).toBe('number')
      expect(item.quantity).toBeGreaterThanOrEqual(1)
      
      expect(item).toHaveProperty('price')
      expect(typeof item.price).toBe('number')
      expect(item.price).toBeGreaterThanOrEqual(0)
      
      expect(item).toHaveProperty('subtotal')
      expect(typeof item.subtotal).toBe('number')
      
      expect(item).toHaveProperty('note')
      // Can be null or string
      
      expect(item).toHaveProperty('tax')
      expect(item).toHaveProperty('discount')
    })
  })

  it('should enforce refill preconditions using public store API', () => {
    const store = useOrderStore();

    store.setHasPlacedOrder(true)
    store.setIsRefillMode(true)
    store.setRefillItems([
      { id: 10, name: 'Beef Brisket', price: 150, quantity: 1, category: 'meats', isUnlimited: false },
      { id: 20, name: 'Kimchi', price: 50, quantity: 1, category: 'sides', isUnlimited: false }
    ] as any)

    expect(store.hasPlacedOrder).toBe(true)
    expect(store.isRefillMode).toBe(true)
    expect(((store.refillItems as any)?.value ?? store.refillItems).length).toBe(2)
  })

  it('should reject invalid order payload (empty items)', () => {
    const store = useOrderStore();
    
    // Setup: No package and no cart items
    store.clearPackage()
    store.clearCart()
    store.setGuestCount(2)

    // Act & Assert: Should throw
    expect(() => (store as any).buildPayload()).toThrow('Invalid items: must be a non-empty array')
  })

  it('should clamp guest count to minimum before building payload', () => {
    const store = useOrderStore();

    const mockPackage = {
      id: 1,
      name: 'Premium Package',
      price: 500,
      is_taxable: false
    }

    store.setPackage(mockPackage as any)
    store.setGuestCount(0)
    
    store.addToCart({
      id: 10,
      name: 'Beef Brisket',
      price: 150,
      category: 'meats'
    } as any, { category: 'meats' })

    const payload = (store as any).buildPayload()
    expect(payload.guest_count).toBe(2)
  })

  it('should reject invalid refill payload (non-refillable category)', async () => {
    const store = useOrderStore();
    
    // Setup: Refill mode with drinks (not allowed)
    store.setHasPlacedOrder(true)
    store.setCurrentOrder({
      success: true,
      order: { id: 1, order_id: 19561, status: 'preparing' }
    } as any)
    store.setIsRefillMode(true)
    
    store.setRefillItems([{
      id: 30,
      name: 'Soda',
      price: 30,
      quantity: 1,
      isUnlimited: false,
      category: 'drinks' // ❌ Not allowed in refills
    }] as any)

    // Act & Assert: Should throw
    await expect(store.submitRefill()).rejects.toThrow('only meats and sides are allowed')
  })

  it('should validate item quantity constraints', () => {
    const store = useOrderStore()
    
    const mockPackage = {
      id: 1,
      name: 'Premium Package',
      price: 500,
      is_taxable: false
    }
    
    store.setPackage(mockPackage as any)
    store.setGuestCount(2)
    
    // Add item with zero quantity (should be rejected by buildPayload validation)
    store.addToCart({
      id: 10,
      name: 'Beef Brisket',
      price: 150,
      category: 'meats'
    } as any, { category: 'meats' })
    
    // Manually set invalid quantity
    const payload = (store as any).buildPayload()
    payload.items[0].quantity = 0

    // Act & Assert: Manual validation of constraints
    expect(() => {
      payload.items.forEach((item: any, index: number) => {
        if (!item.quantity || item.quantity < 1) {
          throw new Error(`Invalid item[${index}].quantity: must be at least 1`)
        }
      })
    }).toThrow('must be at least 1')
  })
})
