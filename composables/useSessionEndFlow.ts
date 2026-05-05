import { useSessionEndStore, type SessionEndReason, type SessionEndSource } from "~/stores/SessionEnd"
import { useSessionStore } from "~/stores/Session"
import { useOrderStore } from "~/stores/Order"
import { logger } from "~/utils/logger"

export function useSessionEndFlow () {
    const sessionEndStore = useSessionEndStore()
    const sessionStore = useSessionStore()
    const orderStore = useOrderStore()

    async function triggerSessionEnd (
        reason: SessionEndReason,
        options: { source: SessionEndSource; orderNumber?: string | null } = { source: "broadcast" }
    ) {
        // Atomic gate: startTransition is idempotent — no-op if already active.
        // Reading .active BEFORE calling allows us to detect duplication without
        // a separate pre-check, avoiding a TOCTOU race between two callers.
        const wasAlreadyActive = sessionEndStore.active
        sessionEndStore.startTransition({
            reason,
            orderNumber: options.orderNumber ?? null,
            source: options.source,
        })
        if (wasAlreadyActive) {
            logger.debug("[SessionEndFlow] Already active — ignoring duplicate trigger", { reason, source: options.source })
            return
        }

        logger.info("[SessionEndFlow] Triggering transition", { reason, source: options.source, orderNumber: options.orderNumber })

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

        const router = useNuxtApp().$router
        try {
            await router.replace({ path: "/order/session-ended", query })
        } catch (e) {
            logger.warn("[SessionEndFlow] Navigation to session-ended failed, falling back to /", e)
            try { await router.replace("/") } catch (_) {}
        }
    }

    function finalizeAndReturnHome () {
        sessionEndStore.clearTransition()
        useNuxtApp().$router.replace("/")
    }

    return { triggerSessionEnd, finalizeAndReturnHome }
}
