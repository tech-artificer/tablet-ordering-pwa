import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Resolve from project root (tests run from project directory)
const PROJECT_ROOT = process.cwd()

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(PROJECT_ROOT, relativePath), "utf-8")
}

describe("package card interaction contract", () => {
    it("opens the meat browser via the dedicated View action", () => {
        const component = readProjectFile("components/PackageCard.vue")

        // CTA label was renamed "Preview the meats" → "View" in the UX revamp.
        // The card body has its own select handler (tap to focus/select that
        // package); the View button (with .stop) opens the modifier inspector
        // without bubbling the select. Both interactions are intentional.
        expect(component).toContain(">View<")
        expect(component).toContain("@click.stop=\"emit('view-modifiers', pkg)\"")
        expect(component).not.toContain("Choose package")
    })

    it("uses the shared allowed-menu grouping helpers", () => {
        const component = readProjectFile("components/PackageCard.vue")

        expect(component).toContain("groupAllowedMenuPreviews")
        expect(component).toContain("displayMeatGroupLabel")
        expect(component).not.toContain("const PRIORITY_ORDER")
        expect(component).not.toContain("label = \"PORK\"")
    })
})
