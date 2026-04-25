// @ts-ignore - Nuxt auto-imports
import { useDeviceStore } from "~/stores/Device"
import { logger } from "~/utils/logger"

// @ts-ignore - Nuxt auto-imports
export default defineNuxtRouteMiddleware(async (to, from) => {
    logger.debug("🔒 Auth middleware RUNNING for route:", to.path)

    const deviceStore = useDeviceStore()

    // Allow access to registration page, settings, the session-ended transition page,
    // and the root without authentication
    const publicRoutes = ["/", "/settings", "/auth/register", "/order/session-ended"]
    if (publicRoutes.includes(to.path)) {
        return
    }

    // Already fully authenticated — skip all API calls on every navigation
    if (deviceStore.isAuthenticated) {
        return
    }

    // Check if device is authenticated (has token and table assignment)
    // If there's a token, try refresh first to renew it. Otherwise, attempt authenticate.
    const hasToken = !!deviceStore.token

    if (hasToken) {
        try {
            logger.debug("Auth middleware: Token present — attempting refresh")
            const refreshed = await deviceStore.refresh()
            if (refreshed && deviceStore.token && deviceStore.table?.id) {
                logger.debug("Auth middleware: Refresh successful")
                return
            }
            logger.debug("Auth middleware: Refresh did not yield valid auth, falling back to authenticate")
        } catch (err) {
            logger.warn("Auth middleware: Refresh error, falling back to authenticate", err)
        }
    }

    // Try authenticate as a fallback (handles fresh devices or cookie-less reloads)
    try {
        logger.debug("Auth middleware: Attempting authenticate()")
        const ok = await deviceStore.authenticate()
        if (ok && deviceStore.token && deviceStore.table?.id) {
            logger.debug("Auth middleware: Authentication successful")
            return
        }
    } catch (err) {
        logger.warn("Auth middleware: authenticate() failed", err)
    }

    // If we reach here, device is not registered / authenticated — redirect to Settings
    // Settings will require a PIN before revealing its contents when `requirePin` query exists.
    logger.debug("Auth middleware: Not authenticated — redirecting to /settings with PIN requirement")
    // @ts-ignore - Nuxt auto-imports
    return navigateTo({ path: "/settings", query: { requirePin: "1" } })
})
