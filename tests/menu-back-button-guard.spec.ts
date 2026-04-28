import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const menuPagePath = resolve(__dirname, "../pages/menu.vue")

describe("menu page back button guard", () => {
    it("disables the back button while an order session is ongoing", () => {
        const source = readFileSync(menuPagePath, "utf8")
        const guardMatch = source.match(/const isBackButtonDisabled = \(\): boolean => \{([\s\S]*?)\n\}/)
        const liveOrderMatch = source.match(/const hasLiveOrderReference = \(\): boolean => \{([\s\S]*?)\n\}/)
        const guardBody = guardMatch?.[1] ?? ""
        const liveOrderBody = liveOrderMatch?.[1] ?? ""

        expect(source).toContain("const isBackButtonDisabled =")
        expect(guardBody).toContain("sessionStore.isActive")
        expect(guardBody).toContain("orderStore.hasPlacedOrder")
        expect(guardBody).toContain("hasLiveOrderReference()")
        expect(liveOrderBody).toContain("sessionStore.orderId")
        expect(source).toContain(":disabled=\"isBackButtonDisabled()\"")
        expect(source).toContain("@click=\"handleBackButtonClick\"")
    })
})
