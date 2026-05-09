import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const middlewarePath = resolve(__dirname, "../middleware/order-lock.global.ts")

describe("order-lock global middleware refill carve-out", () => {
    const source = readFileSync(middlewarePath, "utf8")

    it("includes /order/review in the locked pre-order routes set", () => {
        expect(source).toMatch(/PRE_ORDER_ROUTES\s*=\s*new Set\(\[[^\]]*"\/order\/review"/)
    })

    it("allows /order/review when isRefillMode is true", () => {
        // The middleware must contain the explicit early-return for refill mode
        // BEFORE the redirect-to-in-session statement.
        expect(source).toMatch(/to\.path\s*===\s*"\/order\/review"\s*&&\s*orderStore\.isRefillMode/)
        const refillIdx = source.indexOf("to.path === \"/order/review\" && orderStore.isRefillMode")
        const redirectIdx = source.indexOf("navigateTo(\"/order/in-session\"")
        const returnIdx = source.indexOf("return", refillIdx)
        expect(refillIdx).toBeGreaterThan(-1)
        expect(returnIdx).toBeGreaterThan(-1)
        expect(returnIdx).toBeLessThan(redirectIdx)
    })

    it("redirects locked routes to /order/in-session via replace", () => {
        expect(source).toMatch(/navigateTo\("\/order\/in-session",\s*\{\s*replace:\s*true\s*\}\)/)
    })

    it("requires both device token and a confirmed initial order before enforcing the lock", () => {
        expect(source).toMatch(/if\s*\(\s*!deviceStore\.token\s*\|\|\s*!hasConfirmedInitialOrder\s*\)\s*\{\s*return\s*\}/)
    })
})
