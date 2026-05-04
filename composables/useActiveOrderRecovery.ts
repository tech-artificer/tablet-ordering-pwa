import { useOrderStore } from "~/stores/Order"
import { useSessionEndStore } from "~/stores/SessionEnd"
import { useSessionStore } from "~/stores/Session"
import { logger } from "~/utils/logger"

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "voided"])

function normalizeCurrentOrder (raw: any): any {
    if (!raw) { return null }
    return (raw.order ?? raw) as any
}

export function shouldAttemptActiveOrderRecovery () {
    const orderStore = useOrderStore()
    const sessionStore = useSessionStore()

    const orderObj = normalizeCurrentOrder(orderStore.getCurrentOrder())

    return Boolean(
        sessionStore.getOrderId() ||
        orderStore.hasPlacedOrder ||
        orderStore.isRefillMode ||
        orderStore.currentOrder ||
        orderObj?.order_id ||
        orderObj?.id
    )
}

export async function recoverActiveOrderState (source: string = "unknown") {
    const orderStore = useOrderStore()
    const sessionEndStore = useSessionEndStore()
    const sessionStore = useSessionStore()

    try {
        await orderStore.initializeFromSession()
    } catch (error) {
        logger.warn(`[ActiveOrderRecovery:${source}] initializeFromSession failed`, error)
    }

    const orderObj = normalizeCurrentOrder(orderStore.getCurrentOrder())
    const orderId = orderObj?.order_id || orderObj?.id || sessionStore.getOrderId()
    const packageId = Number(
        orderStore.getPackage?.value?.id ||
      orderObj?.package_id ||
      orderObj?.menu_id ||
      0
    ) || null
    const status = String(orderObj?.status || "").toLowerCase()
    const hasSessionFlag = sessionStore.getIsActive() || (typeof window !== "undefined" && window.localStorage?.getItem("session_active") === "1")

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
            transitionActive: sessionEndStore.active,
        })
        if (!sessionEndStore.active) {
            try {
                await sessionStore.end()
            } catch (error) {
                logger.warn(`[ActiveOrderRecovery:${source}] session end failed`, error)
            }
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
