import { useRouter } from "vue-router"
import { useSessionEndStore, type SessionEndReason, type SessionEndSource } from "~/stores/SessionEnd"
import { useSessionStore } from "~/stores/Session"
import { useOrderStore } from "~/stores/Order"
import { logger } from "~/utils/logger"

export function useSessionEndFlow () {
    const router = useRouter()
    const sessionEndStore = useSessionEndStore()
    const sessionStore = useSessionStore()
    const orderStore = useOrderStore()

    async function triggerSessionEnd (
        reason: SessionEndReason,
        options: { source: SessionEndSource; orderNumber?: string | null } = { source: "broadcast" }
    ) {
        if (sessionEndStore.active) {
            logger.debug("[SessionEndFlow] Already active — ignoring duplicate trigger", { reason, source: options.source })
            return
        }

        logger.info("[SessionEndFlow] Triggering transition", { reason, source: options.source, orderNumber: options.orderNumber })

        sessionEndStore.startTransition({
            reason,
            orderNumber: options.orderNumber ?? null,
            source: options.source,
        })

        // Stop polling before clearing state
        try { orderStore.stopOrderPolling?.() } catch (e) { /* ignore */ }

        // Clear session (handles order state cleanup internally)
        try {
            await Promise.resolve(sessionStore.end())
        } catch (e) {
            logger.warn("[SessionEndFlow] sessionStore.end() threw:", e)
        }

        // Route to transition page
        const query: Record<string, string> = { reason }
        if (options.orderNumber) { query.order = options.orderNumber }

        try {
            await router.replace({ path: "/order/session-ended", query })
        } catch (e) {
            logger.warn("[SessionEndFlow] Navigation to session-ended failed, falling back to /", e)
            try { await router.replace("/") } catch (_) {}
        }
    }

    function finalizeAndReturnHome () {
        sessionEndStore.clearTransition()
        router.replace("/")
    }

    return { triggerSessionEnd, finalizeAndReturnHome }
}
