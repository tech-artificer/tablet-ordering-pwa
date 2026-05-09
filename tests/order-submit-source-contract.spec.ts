import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(__dirname, "..", relativePath), "utf-8")
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
