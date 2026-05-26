import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Resolve from project root (tests run from project directory)
const PROJECT_ROOT = process.cwd()

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(PROJECT_ROOT, relativePath), "utf-8")
}

describe("order submit source contract", () => {
    it("does not preflight initial order submit with navigator.onLine", () => {
        const orderStore = readProjectFile("stores/Order.ts")
        const submitOrderBody = orderStore.slice(
            orderStore.indexOf("async function submitOrder"),
            orderStore.indexOf("async function submitRefill")
        )

        expect(submitOrderBody).not.toContain("navigator.onLine")
        expect(submitOrderBody).not.toContain("useOfflineOrderQueue")
    })

    it("dead composables removed — single submission path remains", () => {
        expect(existsSync(resolve(PROJECT_ROOT, "composables/useOrderSubmission.ts"))).toBe(false)
        expect(existsSync(resolve(PROJECT_ROOT, "composables/useSubmissionIdempotency.ts"))).toBe(false)
        expect(existsSync(resolve(PROJECT_ROOT, "composables/useOfflineOrderQueue.ts"))).toBe(false)
    })

    it("review page does not import dead submission composable", () => {
        const reviewPage = readProjectFile("pages/order/review.vue")
        expect(reviewPage).not.toContain("useOrderSubmission")
        expect(reviewPage).not.toContain("submitOrderWithIdempotency")
    })

    it("idempotency key lifecycle is owned by the store — composables do not touch it", () => {
        const orderHelpers = readProjectFile("utils/orderHelpers.ts")
        const orderSubmit = readProjectFile("composables/useOrderSubmit.ts")
        const refillSubmit = readProjectFile("composables/useRefillSubmit.ts")
        const orderStore = readProjectFile("stores/Order.ts")

        // Utility still exports the generator (used by the store internally)
        expect(orderHelpers).toContain("export function generateIdempotencyKey")
        // Store owns the key: generates, persists, and clears from sessionStorage
        expect(orderStore).toContain("woosoo_order_idem_key")
        expect(orderStore).toContain("woosoo_refill_idem_key")
        // Composables must not import or invoke generateIdempotencyKey
        expect(orderSubmit).not.toContain("generateIdempotencyKey")
        expect(refillSubmit).not.toContain("generateIdempotencyKey")
    })
})
