import { watch } from "vue"
import { useSessionStore } from "../stores/Session"
import { useOrderStore } from "../stores/Order"

export function useGuestReset () {
    const sessionStore = useSessionStore()
    const orderStore = useOrderStore()

    // Reset guest count synchronously when sessionId transitions from a value to null
    watch(
        () => sessionStore.sessionId,
        (newVal, oldVal) => {
            if (oldVal && !newVal) {
                orderStore.setGuestCount(2)
            }
        },
        { flush: "sync" }
    )
}

export default useGuestReset
