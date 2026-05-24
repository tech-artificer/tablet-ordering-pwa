import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const PROJECT_ROOT = process.cwd()

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(PROJECT_ROOT, relativePath), "utf-8")
}

// The customer-facing in-session screen was simplified to a header + Order
// Summary sidebar (per the kiosk design reference). The per-item stream that
// used to live in the middle column was intentionally removed — staff and
// kitchen tickets carry that information, not the dining-table tablet.
//
// These contract tests pin the new shape so a future "let's bring back the
// item list" change is an explicit decision, not an accident.
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

    it("does not render a per-item ordered stream", () => {
        // The removed feature relied on displaySubmittedItems — make sure no
        // future revert silently reintroduces a customer-facing item list.
        expect(page).not.toContain("displaySubmittedItems")
        expect(page).not.toContain("No items submitted yet")
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
