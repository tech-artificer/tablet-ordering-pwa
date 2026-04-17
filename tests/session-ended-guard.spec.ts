import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock useApi
vi.mock('../composables/useApi', () => ({ useApi: () => ({ get: vi.fn(), post: vi.fn() }) }))

import { useSessionEndStore } from '../stores/SessionEnd'
import { useSessionStore } from '../stores/Session'
import { useOrderStore } from '../stores/Order'
import { recoverActiveOrderState } from '../composables/useActiveOrderRecovery'

describe('session-ended route — middleware guard', () => {
  it('/order/session-ended is in publicRoutes (no auth required)', () => {
    // Read the middleware source and verify the route is listed
    // This is a structural test — the middleware file must contain the route string
    const fs = require('fs')
    const path = require('path')
    const middlewarePath = path.resolve(__dirname, '../middleware/auth.ts')
    const src = fs.readFileSync(middlewarePath, 'utf8')
    expect(src).toContain('/order/session-ended')
  })
})

describe('useActiveOrderRecovery — skips cleanup when transition active', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('returns early without calling sessionStore.end() when SessionEnd store is active', async () => {
    const sessionEndStore = useSessionEndStore()
    const sessionStore = useSessionStore()
    const orderStore = useOrderStore()

    // Simulate an active transition already in progress
    sessionEndStore.startTransition({ reason: 'completed', source: 'broadcast' })

    // Set up a terminal order in order store
    orderStore.currentOrder = { order: { order_id: 99, status: 'completed', order_number: 'ORD-X' } }

    const endSpy = vi.spyOn(sessionStore, 'end')

    // Provide initializeFromSession as a no-op so recovery reads from current store state
    orderStore.initializeFromSession = vi.fn().mockResolvedValue(undefined)

    const result = await recoverActiveOrderState('test')

    // Recovery should not have called end() — transition is already active
    expect(endSpy).not.toHaveBeenCalled()
    expect(result.isTerminal).toBe(true)
    expect(result.hasActiveOrder).toBe(false)
  })

  it('calls sessionStore.end() normally when no transition is active', async () => {
    const sessionStore = useSessionStore()
    const orderStore = useOrderStore()

    orderStore.currentOrder = { order: { order_id: 99, status: 'voided', order_number: 'ORD-Y' } }
    orderStore.initializeFromSession = vi.fn().mockResolvedValue(undefined)

    const endSpy = vi.spyOn(sessionStore, 'end')

    await recoverActiveOrderState('test')

    expect(endSpy).toHaveBeenCalledTimes(1)
  })
})
