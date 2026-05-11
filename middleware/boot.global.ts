/**
 * boot.global.ts — single source of truth for route protection.
 *
 * The app behaves like a mobile app: every transactional flow starts at the
 * welcome screen ("/"). Direct URL access to internal routes is forbidden, so
 * any first-load or hard-refresh that lands on a non-public route is bounced
 * back to "/" — the welcome screen handles state recovery (active-order
 * resume, registration prompt, etc.).
 *
 * This single middleware replaces the previous four:
 *   - auth.global.ts         (auth handled by welcome page on mount)
 *   - order-lock.global.ts   (flow already prevents reaching pre-order routes)
 *   - order-guard.ts         (flow already guarantees state on protected routes)
 *   - menu-check.ts          (menus preloaded at welcome via AppBootstrap)
 *
 * See docs/DATA_MODEL.md "Routing contract".
 */

const PUBLIC_ROUTES = new Set(["/", "/settings", "/auth/register", "/order/session-ended"])

export default defineNuxtRouteMiddleware((to, from) => {
    if (import.meta.server) { return }
    if (PUBLIC_ROUTES.has(to.path)) { return }

    // First page-load and hard-refresh: Nuxt populates `from` identically to
    // `to`. Any internal route reached without a prior in-app navigation is
    // a deep-link / URL-bar attempt → redirect to welcome.
    if (to.path === from.path) {
        return navigateTo("/", { replace: true })
    }
})
