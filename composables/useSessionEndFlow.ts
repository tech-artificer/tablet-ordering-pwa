import { useRouter } from "vue-router"
import { useSessionEndStore, type SessionEndReason, type SessionEndSource } from "~/stores/SessionEnd"
import { useSessionStore } from "~/stores/Session"
import { useOrderStore } from "~/stores/Order"
import { logger } from "~/utils/logger"

type RouterLike = {
    replace: (to: unknown) => Promise<unknown> | unknown
}

function resolveRouter (): RouterLike {
    const maybeUseNuxtApp = (globalThis as any)?.useNuxtApp
    if (typeof maybeUseNuxtApp === "function") {
        const nuxtApp = maybeUseNuxtApp()
        const nuxtRouter = nuxtApp?.$router
        if (nuxtRouter && typeof nuxtRouter.replace === "function") {
            return nuxtRouter as RouterLike
        }
    }

    // Test fallback (Vitest unit tests mock useRouter from vue-router).
    // In non-component contexts without a mock, useRouter() may throw or return
    // an unusable value — fall back to a noop router to keep terminal cleanup
    // deterministic during unit tests.
    try {
        const router = useRouter() as unknown as RouterLike
        if (router && typeof router.replace === "function") {
            return router
        }
    } catch (_) {
        // ignore and use noop router below
    }

    return {
        replace: async () => undefined,
    }
}

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

        const router = resolveRouter()
        try {
            await router.replace({ path: "/order/session-ended", query })
        } catch (e) {
            logger.warn("[SessionEndFlow] Navigation to session-ended failed, falling back to /", e)
            try { await router.replace("/") } catch (_) {}
        }
    }

    function finalizeAndReturnHome () {
        sessionEndStore.clearTransition()
        resolveRouter().replace("/")
    }

    return { triggerSessionEnd, finalizeAndReturnHome }
}
