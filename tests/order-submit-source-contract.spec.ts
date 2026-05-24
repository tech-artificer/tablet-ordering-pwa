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

    it("idempotency key generation is centralised in utils/orderHelpers", () => {
        const orderHelpers = readProjectFile("utils/orderHelpers.ts")
        const orderSubmit = readProjectFile("composables/useOrderSubmit.ts")
        const refillSubmit = readProjectFile("composables/useRefillSubmit.ts")

        expect(orderHelpers).toContain("export function generateIdempotencyKey")
        expect(orderSubmit).toContain("from \"~/utils/orderHelpers\"")
        expect(refillSubmit).toContain("from \"~/utils/orderHelpers\"")
        // Neither composable should define its own copy
        expect(orderSubmit).not.toContain("function generateIdempotencyKey")
        expect(refillSubmit).not.toContain("function generateIdempotencyKey")
    })
})
