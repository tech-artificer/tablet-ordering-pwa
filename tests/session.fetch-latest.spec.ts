import { vi, describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const mockGet = vi.fn()
vi.mock('../composables/useApi', () => ({
  useApi: () => ({ get: mockGet })
}))

import { useSessionStore } from '../stores/Session'
import { useDeviceStore } from '../stores/Device'

describe('session latest ownership checks', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockGet.mockReset()
  })

  it('accepts latest session when ownership matches device_id', async () => {
    const session = useSessionStore()
    const device = useDeviceStore()

    ;(device as any).device = { id: 7, name: 'Tablet A' }
    mockGet.mockResolvedValueOnce({ data: { id: 99, device_id: 7 } })

    await session.fetchLatestSession()

    expect(session.sessionId).toBe(99)
  })

  it('rejects latest session when payload belongs to a different device', async () => {
    const session = useSessionStore()
    const device = useDeviceStore()

    ;(device as any).device = { id: 7, name: 'Tablet A' }
    mockGet.mockResolvedValueOnce({ data: { id: 100, device_id: 8 } })

    await session.fetchLatestSession()

    expect(session.sessionId).toBeNull()
  })
})
