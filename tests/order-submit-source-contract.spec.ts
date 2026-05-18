import { readFileSync } from "node:fs"
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
})
