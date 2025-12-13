import { watch } from 'vue'
import { useSessionStore } from '../stores/session'
import { useOrderStore } from '../stores/order'

export function useGuestReset() {
  const sessionStore = useSessionStore()
  const orderStore = useOrderStore()

  // Reset guest count synchronously when sessionId transitions from a value to null
  watch(
    () => sessionStore.sessionId,
    (newVal, oldVal) => {
      if (oldVal && !newVal) {
        orderStore.guestCount = 2
      }
    },
    { flush: 'sync' }
  )
}

export default useGuestReset
