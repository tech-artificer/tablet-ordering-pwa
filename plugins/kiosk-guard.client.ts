import { useOrderStore } from '~/stores/Order'

// Absorbs browser back/forward gestures when an order is live.
//
// How it works:
//   On load we push a sentinel history entry on top of the stack.
//   When the device back button or gesture fires, `popstate` is raised
//   against the sentinel (not the real previous page) and we:
//     1. Re-push the sentinel so the next back also fires popstate.
//     2. Replace the current view with /order/in-session.
//   Without an active order, the sentinel is still in place but the
//   popstate handler does nothing — normal navigation continues.
export default defineNuxtPlugin(() => {
  const orderStore = useOrderStore()
  const router = useRouter()

  // Push sentinel so back never exhausts history and closes the PWA.
  window.history.pushState({ __kioskSentinel: true }, '')

  window.addEventListener('popstate', () => {
    // Always re-push the sentinel to absorb the gesture.
    window.history.pushState({ __kioskSentinel: true }, '')

    if (orderStore.hasPlacedOrder) {
      router.replace('/order/in-session')
    }
  })
})
