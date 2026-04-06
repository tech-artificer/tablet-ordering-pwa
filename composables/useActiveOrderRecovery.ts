import { useOrderStore } from '~/stores/Order'
import { useSessionStore } from '~/stores/Session'
import { logger } from '~/utils/logger'

const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'voided'])

export async function recoverActiveOrderState(source: string = 'unknown') {
  const orderStore = useOrderStore()
  const sessionStore = useSessionStore()

  try {
    await orderStore.initializeFromSession()
  } catch (error) {
    logger.warn(`[ActiveOrderRecovery:${source}] initializeFromSession failed`, error)
  }

  const orderObj = orderStore.currentOrder?.order || orderStore.currentOrder
  const orderId = orderObj?.order_id || orderObj?.id || sessionStore.orderId
  const status = String(orderObj?.status || '').toLowerCase()
  const hasSessionFlag = sessionStore.isActive || (typeof window !== 'undefined' && window.localStorage?.getItem('session_active') === '1')

  if (!orderId) {
    return {
      hasActiveOrder: false,
      isTerminal: false,
      orderId: null,
      status,
    }
  }

  if (!status) {
    logger.info(`[ActiveOrderRecovery:${source}] order status unknown, skipping active redirect`, {
      orderId,
      hasSessionFlag,
    })

    if (!hasSessionFlag) {
      try {
        sessionStore.clear()
      } catch (error) {
        logger.warn(`[ActiveOrderRecovery:${source}] failed clearing stale session`, error)
      }
    }

    return {
      hasActiveOrder: false,
      isTerminal: false,
      orderId,
      status,
    }
  }

  const isTerminal = TERMINAL_STATUSES.has(status)
  if (isTerminal) {
    logger.info(`[ActiveOrderRecovery:${source}] terminal order detected, clearing stale session`, {
      orderId,
      status,
    })
    try {
      sessionStore.end()
    } catch (error) {
      logger.warn(`[ActiveOrderRecovery:${source}] session end failed`, error)
    }
    return {
      hasActiveOrder: false,
      isTerminal: true,
      orderId,
      status,
    }
  }

  logger.info(`[ActiveOrderRecovery:${source}] active order recovered`, {
    orderId,
    status,
  })

  return {
    hasActiveOrder: true,
    isTerminal: false,
    orderId,
    status,
  }
}
