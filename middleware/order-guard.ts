/**
 * Order Guard Middleware
 *
 * Protects routes that require an active order to be placed.
 * Prevents customers from accessing /menu or /order/in-session without
 * first placing an order through the proper flow.
 */

import { useOrderStore } from "~/stores/Order"
import { useSessionStore } from "~/stores/Session"
import { logger } from "~/utils/logger"

export default defineNuxtRouteMiddleware((to, _from) => {
    const orderStore = useOrderStore()
    const sessionStore = useSessionStore()

    // /menu route: requires package selection (not order submission)
    if (to.path === "/menu") {
    // Allow access when a package is selected (route query or persisted store).
        const packageIdFromQuery = Number(to.query?.packageId || 0) || null
        const packageIdFromStore = Number((orderStore.package as any)?.id || 0) || null
        const hasPackage = !!(packageIdFromQuery || packageIdFromStore)

        // Also allow active-order resume paths where package may be recovered lazily.
        const currentOrder = (orderStore.currentOrder as any)?.order || orderStore.currentOrder
        const hasRecoveredOrder = !!(sessionStore.orderId || currentOrder?.order_id || currentOrder?.id)

        if (!hasPackage && !hasRecoveredOrder) {
            logger.warn("🚫 Route /menu blocked: no package selected")
            logger.debug("Order state:", {
                hasPackage,
                packageIdFromQuery,
                packageIdFromStore,
                hasRecoveredOrder,
                guestCount: orderStore.guestCount
            })

            // Redirect to package selection
            return navigateTo("/order/packageSelection")
        }

        return // Allow /menu access
    }

    // /order/review route: requires package selection or an existing placed order
    if (to.path === "/order/review") {
        const packageIdFromStore = Number((orderStore.package as any)?.id || 0) || null
        const hasPackage = !!packageIdFromStore
        const currentOrder = (orderStore.currentOrder as any)?.order || orderStore.currentOrder
        const hasOrderReference = !!(sessionStore.orderId || currentOrder?.order_id || currentOrder?.id || orderStore.hasPlacedOrder)

        if (!hasPackage && !hasOrderReference) {
            logger.warn("\uD83D\uDEAB Route /order/review blocked: no package selected or active order")
            return navigateTo("/order/packageSelection")
        }

        return
    }

    // /order/in-session route: requires order to be submitted
    if (to.path === "/order/in-session") {
    // Guard 1: session must be active. A missing/expired session has no business
    // being on this page regardless of any cached order state.
        if (!sessionStore.isActive) {
            logger.warn("🚫 Route /order/in-session blocked: no active session")
            return navigateTo("/")
        }

        const currentOrder = (orderStore.currentOrder as any)?.order || orderStore.currentOrder
        const hasOrderReference = !!(sessionStore.orderId || currentOrder?.order_id || currentOrder?.id)

        // Check if order has been placed and confirmed by backend
        if (!orderStore.hasPlacedOrder && !hasOrderReference) {
            logger.warn("🚫 Route /order/in-session blocked: no order placed")
            logger.debug("Order state:", {
                hasPlacedOrder: orderStore.hasPlacedOrder,
                orderId: sessionStore.orderId,
                hasOrderReference,
                currentOrder: !!orderStore.currentOrder
            })

            // Redirect to menu to place order first
            return navigateTo("/menu")
        }

        // Additional check: must have orderId from server
        if (!hasOrderReference) {
            logger.warn("🚫 Route /order/in-session blocked: waiting for server confirmation")
            return navigateTo("/menu")
        }
    }
})
