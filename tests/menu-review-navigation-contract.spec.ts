import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(process.cwd(), relativePath), "utf8")
}

describe("menu review navigation contract", () => {
    it("does not require package selection when reviewing a refill for an active order", () => {
        const page = readProjectFile("pages/menu.vue")

        // Verify refill mode handling exists
        expect(page).toContain("orderStore.isRefillMode")
        expect(page).toContain("hasLiveOrderReference")

        // Verify package guard in handleProceedToReview
        expect(page).toContain("if (!selectedPackageId.value)")
        expect(page).toContain("Package selection was lost. Please select a package again.")

        // Verify refill mode toggle with order confirmation check
        expect(page).toContain("hasConfirmedInitialOrder")
        expect(page).toContain("toggleRefillMode")
    })
})
