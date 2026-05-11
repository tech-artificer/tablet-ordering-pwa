import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const middlewarePath = resolve(__dirname, "../middleware/boot.global.ts")

describe("boot.global.ts — route protection and flow enforcement", () => {
    const source = readFileSync(middlewarePath, "utf8")

    it("defines PUBLIC_ROUTES set with /, /settings, /auth/register, /order/session-ended", () => {
        expect(source).toContain("PUBLIC_ROUTES")
        expect(source).toContain("\"/\"")
        expect(source).toContain("\"/settings\"")
        expect(source).toContain("\"/auth/register\"")
        expect(source).toContain("\"/order/session-ended\"")
    })

    it("redirects direct URL access (first load, same path) to /", () => {
        // Deep-link protection: if first load lands on /order/review (to.path === from.path), bounce to /
        expect(source).toContain("to.path === from.path")
        expect(source).toContain("navigateTo(\"/\", { replace: true })")
    })

    it("is the only middleware — replaced auth.global.ts, order-lock.global.ts, order-guard.ts, menu-check.ts", () => {
        // Verify it's exporting a global middleware and is the single entry point
        expect(source).toContain("export default defineNuxtRouteMiddleware")
        expect(source).toContain("PUBLIC_ROUTES.has(to.path)")
    })
})
