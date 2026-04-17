import { useOrderStore } from '~/stores/Order'
import { useDeviceStore } from '~/stores/Device'

// Routes that are locked once an initial order has been placed.
// Any navigation to these — URL bar, router.push, browser history — is redirected
// to the live session screen using replace (no new history entry).
const PRE_ORDER_ROUTES = new Set([
  '/',
  '/order/start',
  '/order/packageSelection',
  '/order/review',
])

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const deviceStore = useDeviceStore()
  const orderStore = useOrderStore()

  // Only enforce when the device is authenticated and an order is live
  if (!deviceStore.token || !orderStore.hasPlacedOrder) return

  if (PRE_ORDER_ROUTES.has(to.path)) {
    return navigateTo('/order/in-session', { replace: true })
  }
})
