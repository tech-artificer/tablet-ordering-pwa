import { defineStore } from 'pinia'
import { reactive, toRefs } from 'vue'

export type SessionEndReason = 'completed' | 'voided' | 'cancelled' | 'unknown'
export type SessionEndSource = 'broadcast' | 'polling' | 'watcher' | 'in-session'

interface SessionEndState {
  active: boolean
  reason: SessionEndReason
  orderNumber: string | null
  source: SessionEndSource
  startedAt: number | null
}

export const useSessionEndStore = defineStore('session-end', () => {
  const state = reactive<SessionEndState>({
    active: false,
    reason: 'unknown',
    orderNumber: null,
    source: 'broadcast',
    startedAt: null,
  })

  function startTransition(payload: {
    reason: SessionEndReason
    orderNumber?: string | null
    source: SessionEndSource
  }) {
    if (state.active) return // idempotency: first caller wins
    state.active = true
    state.reason = payload.reason
    state.orderNumber = payload.orderNumber ?? null
    state.source = payload.source
    state.startedAt = Date.now()
  }

  function clearTransition() {
    state.active = false
    state.reason = 'unknown'
    state.orderNumber = null
    state.source = 'broadcast'
    state.startedAt = null
  }

  function isTerminalReason(reason: string): reason is SessionEndReason {
    return ['completed', 'voided', 'cancelled', 'unknown'].includes(reason)
  }

  return ({
    ...toRefs(state),
    startTransition,
    clearTransition,
    isTerminalReason,
  } as unknown) as any
})
