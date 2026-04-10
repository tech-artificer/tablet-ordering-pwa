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

  const orderResp = orderStore.getCurrentOrder()
  const orderObj = ((orderResp?.order || orderResp) as any) || null
  const orderId = orderObj?.order_id || orderObj?.id || sessionStore.getOrderId()
  const packageId = Number(
    orderStore.getPackage?.value?.id
      || orderObj?.package_id
      || orderObj?.menu_id
      || 0
  ) || null
  const status = String(orderObj?.status || '').toLowerCase()
  const hasSessionFlag = sessionStore.getIsActive() || (typeof window !== 'undefined' && window.localStorage?.getItem('session_active') === '1')

  if (!orderId) {
    return {
      hasActiveOrder: false,
      isTerminal: false,
      orderId: null,
      packageId,
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
      packageId,
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
      packageId,
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
    packageId,
    status,
  }
}
