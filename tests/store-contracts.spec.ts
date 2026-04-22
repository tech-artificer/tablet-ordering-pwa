if (typeof globalThis.localStorage === 'undefined') {
  const storage: Record<string, string> = {}
  // @ts-ignore
  globalThis.localStorage = {
    getItem: (key: string) => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null),
    setItem: (key: string, value: string) => { storage[key] = String(value) },
    removeItem: (key: string) => { delete storage[key] },
    clear: () => { Object.keys(storage).forEach((key) => delete storage[key]) },
  }
}

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('../composables/useApi', () => ({
  useApi: () => ({ get: mockGet, post: mockPost }),
}))

vi.mock('../composables/useOfflineOrderQueue', () => ({
  useOfflineOrderQueue: () => ({
    queueOrder: vi.fn(),
    drainQueue: vi.fn(),
    clearQueue: vi.fn(),
    registerOnlineListener: vi.fn(),
  }),
}))

import { useDeviceStore } from '../stores/Device'
import { useOrderStore } from '../stores/Order'

describe('store contract regressions', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
    mockPost.mockReset()
  })

  it('initializes the device store with its expected public API', () => {
    const deviceStore = useDeviceStore()

    expect(deviceStore.authenticate).toBeTypeOf('function')
    expect(deviceStore.refresh).toBeTypeOf('function')
    expect(deviceStore.getDeviceId).toBeTypeOf('function')
    expect(deviceStore.getTableId).toBeTypeOf('function')
    expect(deviceStore.getToken).toBeTypeOf('function')
    expect(deviceStore.isAuthenticated).toBe(false)
    expect(deviceStore.waitingForTable).toBe(false)
  })

  it('exposes buildRefillPayload and maps refill items into request shape', () => {
    const orderStore = useOrderStore()

    orderStore.setRefillItems([
      { id: 41, name: 'Beef', price: 0, quantity: 2, note: 'Refill', category: 'meats', img_url: '' } as any,
      { id: 42, name: 'Kimchi', price: 0, quantity: 1, note: null, category: 'sides', img_url: '' } as any,
    ])

    expect(orderStore.buildRefillPayload).toBeTypeOf('function')
    expect(orderStore.buildRefillPayload()).toEqual({
      items: [
        { menu_id: 41, name: 'Beef', quantity: 2, note: 'Refill' },
        { menu_id: 42, name: 'Kimchi', quantity: 1, note: 'Refill' },
      ],
    })
  })
})