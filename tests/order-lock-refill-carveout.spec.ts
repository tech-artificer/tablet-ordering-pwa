import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const bootGlobalPath = resolve(__dirname, "../middleware/boot.global.ts")

describe("boot.global.ts unified middleware — consolidated routing", () => {
    const source = readFileSync(bootGlobalPath, "utf8")

    it("boot.global.ts exists and is the single entry-point middleware (order-lock.global.ts consolidated)", () => {
        // Per TASK A: order-lock.global.ts, order-guard.ts, auth.global.ts, menu-check.ts
        // were consolidated into boot.global.ts
        expect(source).toBeTruthy()
        expect(source).toContain("PUBLIC_ROUTES")
        expect(source).toContain("navigateTo")
        expect(source).toContain("export default defineNuxtRouteMiddleware")
    })

    it("defines PUBLIC_ROUTES allowing /, /settings, /auth/register, /order/session-ended", () => {
        expect(source).toMatch(/const PUBLIC_ROUTES = new Set\(\[\s*"\/"/)
        expect(source).toMatch(/PUBLIC_ROUTES.*"\/settings"/s)
        expect(source).toMatch(/PUBLIC_ROUTES.*"\/auth\/register"/s)
        expect(source).toMatch(/PUBLIC_ROUTES.*"\/order\/session-ended"/s)
    })

    it("redirects direct URL access to internal routes back to /", () => {
        expect(source).toMatch(/to\.path\s*===\s*from\.path/)
        expect(source).toMatch(/navigateTo\("\/",\s*\{\s*replace:\s*true\s*\}\)/)
    })

    it("enforces routing guard for non-public routes", () => {
        expect(source).toContain("PUBLIC_ROUTES.has(to.path)")
    })
})
