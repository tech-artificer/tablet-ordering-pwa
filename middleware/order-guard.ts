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

export default defineNuxtRouteMiddleware((to, from) => {
  const orderStore = useOrderStore()
  const sessionStore = useSessionStore()
  
  // /menu route: requires package selection (not order submission)
  if (to.path === '/menu') {
    // Allow access if package is selected (has valid package ID)
    const hasPackage = !!(orderStore.package && (orderStore.package as any).id)
    
    if (!hasPackage) {
      logger.warn('🚫 Route /menu blocked: no package selected')
      logger.debug('Order state:', {
        hasPackage,
        packageId: (orderStore.package as any)?.id,
        guestCount: orderStore.guestCount
      })
      
      // Redirect to package selection
      return navigateTo('/order/packageSelection')
    }
    
    return // Allow /menu access
  }
  
  // /order/in-session route: requires order to be submitted
  if (to.path === '/order/in-session') {
    // Check if order has been placed and confirmed by backend
    if (!orderStore.hasPlacedOrder) {
      logger.warn('🚫 Route /order/in-session blocked: no order placed')
      logger.debug('Order state:', {
        hasPlacedOrder: orderStore.hasPlacedOrder,
        orderId: sessionStore.orderId,
        currentOrder: !!orderStore.currentOrder
      })
      
      // Redirect to menu to place order first
      return navigateTo('/menu')
    }
    
    // Additional check: must have orderId from server
    if (!sessionStore.orderId) {
      logger.warn('🚫 Route /order/in-session blocked: waiting for server confirmation')
      return navigateTo('/menu')
    }
  }
})
