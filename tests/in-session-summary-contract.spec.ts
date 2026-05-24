import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const PROJECT_ROOT = process.cwd()

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(PROJECT_ROOT, relativePath), "utf-8")
}

// The customer-facing in-session screen has:
//   • A left column with header + per-item submitted stream (restored from
//     c2b3774 after the b7da067 redesign accidentally dropped it).
//   • A right Order Summary sidebar with totals + CTAs.
//
// These contract tests pin both halves so future redesigns don't silently
// drop either the item list or the totals sidebar again.
describe("in-session screen shape", () => {
    const page = readProjectFile("pages/order/in-session.vue")

    it("renders the Order Summary sidebar with Package / Subtotal / Tax / Total", () => {
        expect(page).toContain("Order Summary")
        expect(page).toContain(">Package<")
        expect(page).toContain(">Subtotal<")
        expect(page).toContain("Tax ({{ taxRatePercent }}%)")
        expect(page).toMatch(/>Total<\/span>[\s\S]{0,200}formatPesoExact\(grandTotalDisplay\)/)
    })

    it("exposes the Order Refills primary CTA", () => {
        expect(page).toContain("Order Refills")
    })

    it("renders the per-item submitted stream from rounds[]", () => {
        // Customer must be able to confirm what they've already sent to the
        // kitchen. The list is fed by displaySubmittedItems (flattened rounds).
        expect(page).toContain("displaySubmittedItems")
        expect(page).toContain("No items submitted yet")
    })

    it("uses the gold Online indicator instead of a green Live Session pill", () => {
        expect(page).not.toContain("#4ade80")
        expect(page).not.toContain("Live Session")
        expect(page).toContain("Online")
    })

    it("provides an End Session affordance", () => {
        expect(page).toContain("End Session")
    })
})
