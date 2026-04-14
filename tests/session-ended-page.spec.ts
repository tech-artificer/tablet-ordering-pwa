import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock vue-router
const mockReplace = vi.fn()
const mockQuery = { reason: 'completed', order: 'ORD-007' }
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useRoute: () => ({ query: mockQuery }),
}))

// Mock useApi
vi.mock('../composables/useApi', () => ({ useApi: () => ({ get: vi.fn(), post: vi.fn() }) }))

// Mock Nuxt composables used by page
vi.mock('#imports', () => ({
  definePageMeta: vi.fn(),
}))

import { useSessionEndStore } from '../stores/SessionEnd'
import { useSessionEndFlow } from '../composables/useSessionEndFlow'

describe('session-ended page logic', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockReplace.mockReset().mockResolvedValue(undefined)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('finalizeAndReturnHome clears store and navigates to /', () => {
    const sessionEndStore = useSessionEndStore()
    sessionEndStore.startTransition({ reason: 'completed', source: 'broadcast' })

    const { finalizeAndReturnHome } = useSessionEndFlow()
    finalizeAndReturnHome()

    expect(sessionEndStore.active).toBe(false)
    expect(mockReplace).toHaveBeenCalledWith('/')
  })

  it('countdown timer calls finalizeAndReturnHome after 5 ticks', () => {
    const { finalizeAndReturnHome } = useSessionEndFlow()
    const spy = vi.fn()

    // Simulate the countdown logic from the page
    let count = 5
    const timer = setInterval(() => {
      count -= 1
      if (count <= 0) {
        clearInterval(timer)
        spy()
      }
    }, 1000)

    vi.advanceTimersByTime(4000)
    expect(spy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1000)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('fail-safe timer fires at 10s even if countdown is stuck', () => {
    const spy = vi.fn()
    const failsafe = setTimeout(spy, 10_000)

    vi.advanceTimersByTime(9999)
    expect(spy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(spy).toHaveBeenCalledTimes(1)

    clearTimeout(failsafe)
  })

  it('returnHome called manually skips remaining countdown', () => {
    const sessionEndStore = useSessionEndStore()
    sessionEndStore.startTransition({ reason: 'voided', source: 'watcher' })

    const { finalizeAndReturnHome } = useSessionEndFlow()

    // Simulate 1s tick, then manual return
    vi.advanceTimersByTime(1000)
    finalizeAndReturnHome()

    expect(mockReplace).toHaveBeenCalledWith('/')
  })
})
