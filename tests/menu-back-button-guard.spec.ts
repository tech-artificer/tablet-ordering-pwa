import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Resolve from project root (tests run from project directory)
const PROJECT_ROOT = process.cwd()
const menuPagePath = resolve(PROJECT_ROOT, "pages/menu.vue")
const menuHeaderPath = resolve(PROJECT_ROOT, "components/menu/MenuHeader.vue")

describe("menu page back button guard", () => {
    it("disables the back button while an order session is ongoing", () => {
        const source = readFileSync(menuPagePath, "utf8")
        const headerSource = readFileSync(menuHeaderPath, "utf8")
        const guardMatch = source.match(/const isBackButtonDisabled = \(\): boolean => \{([\s\S]*?)\n\}/)
        const liveOrderMatch = source.match(/const hasLiveOrderReference = \(\): boolean => \{([\s\S]*?)\n\}/)
        const guardBody = guardMatch?.[1] ?? ""
        const liveOrderBody = liveOrderMatch?.[1] ?? ""

        expect(source).toContain("const isBackButtonDisabled =")
        expect(guardBody).toContain("hasConfirmedInitialOrder.value")
        expect(guardBody).toContain("hasLiveOrderReference()")
        expect(guardBody).not.toContain("sessionStore.isActive")
        expect(liveOrderBody).toContain("sessionStore.orderId")
        expect(headerSource).toContain(":disabled=\"isBackDisabled\"")
        expect(headerSource).toContain("@click=\"emit('back')\"")
    })
})
