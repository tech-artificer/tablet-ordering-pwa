import { useRouter } from "vue-router"
import { useSessionEndStore, type SessionEndReason, type SessionEndSource } from "~/stores/SessionEnd"
import { useSessionStore } from "~/stores/Session"
import { logger } from "~/utils/logger"

type RouterLike = {
    replace: (to: unknown) => Promise<unknown> | unknown
}

function toNavigationUrl (to: unknown): string {
    if (typeof to === "string") { return to }
    const target = to as { path?: string; query?: Record<string, unknown> } | null
    const path = target?.path || "/order/session-ended"
    const query = target?.query ?? null
    if (!query) { return path }
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
        if (value === null || value === undefined) { return }
        params.set(key, String(value))
    })
    const qs = params.toString()
    return qs ? `${path}?${qs}` : path
}

export function useSessionEndFlow () {
    const sessionEndStore = useSessionEndStore()
    const sessionStore = useSessionStore()

    // Capture the router once during composable setup. Calling useRouter() lazily
    // from inside setInterval/setTimeout callbacks (e.g. the session-ended countdown)
    // fails because Vue's active instance is cleared after setup completes —
    // inject(routerKey) returns undefined and we fall through to window.location.assign,
    // which is a full document reload that exits fullscreen kiosk mode.
    let capturedRouter: RouterLike | null = null
    try {
        const r = useRouter() as unknown as RouterLike
        if (r && typeof r.replace === "function") {
            capturedRouter = r
        }
    } catch (_) {
        // useRouter() unavailable (e.g. test contexts with shouldThrow); fall through to noop.
    }

    function resolveRouter (): RouterLike {
        if (capturedRouter) { return capturedRouter }

        // Fallback for non-component contexts without a mock.
        return {
            replace: (to: unknown) => {
                const target = toNavigationUrl(to)
                logger.error("[SessionEndFlow] Router unavailable; falling back to hard navigation", { target })
                if (typeof window !== "undefined") {
                    window.location.assign(target)
                }
                return undefined
            },
        }
    }

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
