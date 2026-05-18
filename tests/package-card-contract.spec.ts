import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Resolve from project root (tests run from project directory)
const PROJECT_ROOT = process.cwd()

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(PROJECT_ROOT, relativePath), "utf-8")
}

describe("package card interaction contract", () => {
    it("opens the meat browser instead of selecting the package directly", () => {
        const component = readProjectFile("components/PackageCard.vue")

        expect(component).toContain("Preview the meats")
        expect(component).toContain("@click.stop=\"emit('view-modifiers', pkg)\"")
        expect(component).not.toContain("Choose package")
        expect(component).not.toContain("emit('select', pkg)")
    })

    it("uses the shared receipt-code modifier grouping helper", () => {
        const component = readProjectFile("components/PackageCard.vue")

        expect(component).toContain("groupPackageModifierPreviews")
        expect(component).toContain("displayMeatGroupLabel")
        expect(component).not.toContain("const PRIORITY_ORDER")
        expect(component).not.toContain("label = \"PORK\"")
    })
})
