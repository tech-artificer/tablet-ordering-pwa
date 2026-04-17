// Provide a minimal localStorage mock for the Node test environment
if (typeof globalThis.localStorage === 'undefined') {
  const storage: Record<string, string> = {}
  globalThis.localStorage = {
    getItem: (k: string) => storage[k] ?? null,
    setItem: (k: string, v: string) => { storage[k] = String(v) },
    removeItem: (k: string) => { delete storage[k] },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]) }
  } as any
}

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSessionStore } from '../stores/Session'
import { useOrderStore } from '../stores/Order'
import { useGuestReset } from '../composables/useGuestReset'

describe('useGuestReset composable', () => {
  beforeEach(() => {
    const pinia = createPinia()
    setActivePinia(pinia)
  })

  it('resets guestCount to 2 when session ends', () => {
    const session = useSessionStore()
    const order = useOrderStore()

    // start with a non-default guest count
    order.setGuestCount(5)

    // set a session id, then activate the watcher
    session.$state.sessionId = 123

    useGuestReset()

    // simulate session end
    session.$state.sessionId = null as any

    expect(order.guestCount).toBe(2)
  })
})
