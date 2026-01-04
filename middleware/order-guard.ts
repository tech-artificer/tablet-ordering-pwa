/**
 * Order Guard Middleware
 * 
 * Protects routes that require an active order to be placed.
 * Prevents customers from accessing /menu or /order/in-session without
 * first placing an order through the proper flow.
 */

import { useOrderStore } from '~/stores/order'
import { useSessionStore } from '~/stores/session'
import { logger } from '~/utils/logger'

export default defineRouteMiddleware((to, from) => {
  // Only protect specific routes
  const protectedRoutes = ['/menu', '/order/in-session']
  
  if (!protectedRoutes.includes(to.path)) {
    return // Route doesn't need order guard
  }

  const orderStore = useOrderStore()
  const sessionStore = useSessionStore()
  
  // Check if an order has been placed and confirmed
  if (!orderStore.hasPlacedOrder) {
    logger.warn(`🚫 Route ${to.path} blocked: no order placed`)
    logger.debug('Order state:', {
      hasPlacedOrder: orderStore.hasPlacedOrder,
      orderId: sessionStore.orderId,
      currentOrder: !!orderStore.currentOrder
    })
    
    // Redirect to order start
    return navigateTo('/order/start')
  }
  
  // Additional check for /order/in-session - must have orderId from server
  if (to.path === '/order/in-session' && !sessionStore.orderId) {
    logger.warn('🚫 Route /order/in-session blocked: waiting for server confirmation')
    return navigateTo('/menu')
  }
})
