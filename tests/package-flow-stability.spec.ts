import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, it, expect } from "vitest"

function src (relativePath: string): string {
    return readFileSync(resolve(__dirname, "..", relativePath), "utf-8")
}

// ---------------------------------------------------------------------------
// Boot middleware consolidated behavior
// ---------------------------------------------------------------------------
describe("boot.global.ts — unified routing contract", () => {
    const bootSource = src("middleware/boot.global.ts")

    it("boot.global.ts replaces auth.global.ts, order-lock.global.ts, order-guard.ts, menu-check.ts", () => {
        expect(bootSource).toContain("export default defineNuxtRouteMiddleware")
        expect(bootSource).toContain("PUBLIC_ROUTES")
        expect(bootSource).toContain("to.path === from.path")
    })

    it("PUBLIC_ROUTES allows public navigation without session", () => {
        expect(bootSource).toMatch(/PUBLIC_ROUTES = new Set\(\[\s*"\/"/)
        expect(bootSource).toContain("/settings")
        expect(bootSource).toContain("/auth/register")
    })

    it("first page-load redirects deep-links back to /", () => {
        expect(bootSource).toContain("if (to.path === from.path)")
        expect(bootSource).toContain("navigateTo(\"/\"")
    })
})

// ---------------------------------------------------------------------------
// packageSelection.vue — loading and navigation contract
// ---------------------------------------------------------------------------
describe("packageSelection.vue — loading behaviour", () => {
    const page = src("pages/order/packageSelection.vue")

    it("loads packages on mount (preloaded from welcome screen)", () => {
        expect(page).toContain("onMounted(async")
        expect(page).toContain("menuStore.packages")
    })

    it("does not call fetchPackages or loadAllMenus (already preloaded)", () => {
        expect(page).not.toContain("menuStore.fetchPackages()")
        expect(page).not.toMatch(/menuStore\.loadAllMenus\(/)
    })
})

// ---------------------------------------------------------------------------
// packageSelection.vue — package selection navigation contract
// ---------------------------------------------------------------------------
describe("packageSelection.vue — package selection flow", () => {
    const page = src("pages/order/packageSelection.vue")

    it("sets package on orderStore before navigating", () => {
        expect(page).toContain("orderStore.setPackage(packageData)")
    })

    it("navigates to /menu with packageId in query", () => {
        expect(page).toContain("path: \"/menu\"")
        expect(page).toContain("query: { packageId: packageData.id }")
    })

    it("proceedToMenuForPackage exists and handles navigation", () => {
        expect(page).toContain("const proceedToMenuForPackage")
        expect(page).toContain("nuxtApp.$router.push")
    })
})

// ---------------------------------------------------------------------------
// 4. boot.global.ts /order/review and other internal routes are protected
// ---------------------------------------------------------------------------
describe("boot.global.ts — route protection", () => {
    it("has PUBLIC_ROUTES set with /, /settings, /auth/register, /order/session-ended", () => {
        const middleware = src("middleware/boot.global.ts")

        expect(middleware).toContain("PUBLIC_ROUTES")
        expect(middleware).toContain("\"/\"")
        expect(middleware).toContain("\"/settings\"")
        expect(middleware).toContain("\"/auth/register\"")
        expect(middleware).toContain("\"/order/session-ended\"")
    })

    it("redirects same-path (deep-link) attempts to welcome", () => {
        const middleware = src("middleware/boot.global.ts")

        expect(middleware).toContain("to.path === from.path")
        expect(middleware).toContain("navigateTo(\"/\", { replace: true })")
    })
})

// ---------------------------------------------------------------------------
// 5. Session start contract
// ---------------------------------------------------------------------------
describe("Session.ts — start() contract", () => {
    it("session store exports start method", () => {
        const session = src("stores/Session.ts")

        // Check for start method in the export object
        expect(session).toContain("start,")
    })

    it("session middleware consolidated into boot.global.ts", () => {
        const middleware = src("middleware/boot.global.ts")

        expect(middleware).toContain("export default defineNuxtRouteMiddleware")
        // Session auth is now handled by welcome page on mount, not middleware
    })
})
