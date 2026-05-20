import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Resolve from project root (tests run from project directory)
const PROJECT_ROOT = process.cwd()

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(PROJECT_ROOT, relativePath), "utf-8")
}

describe("package selection responsive layout contract", () => {
    it("implements viewport-conditional four/three/peek/portrait row modes", () => {
        const page = readProjectFile("pages/order/packageSelection.vue")

        expect(page).toContain("type PackageRowMode = \"four\" | \"three\" | \"peek\" | \"portrait\"")
        expect(page).toContain("viewportWidth.value >= 1400")
        expect(page).toContain("viewportWidth.value >= 1200")
        expect(page).toContain("viewportWidth.value >= 900")
        expect(page).toContain("packages.value.length <= 3 && viewportWidth.value >= 900")
        expect(page).toContain("grid grid-cols-4")
        expect(page).toContain("min-w-[280px] flex-1")
        expect(page).toContain("grid gap-4 xl:gap-5")
        expect(page).toContain("min-w-[36%] flex-[0_0_36%]")
        expect(page).toContain("min-w-[330px] flex-1")
    })

    it("wires details inspector and explicit card-focus state", () => {
        const page = readProjectFile("pages/order/packageSelection.vue")

        expect(page).toContain("@focus=\"handleCardFocus\"")
        expect(page).toContain("@view-modifiers=\"openModifierInspector\"")
        expect(page).toContain("v-if=\"activeInspectorPackage\"")
        expect(page).toContain("event.key === \"Escape\"")
    })

    it("renders the split-pane meat browser modal as the package choose surface", () => {
        const page = readProjectFile("pages/order/packageSelection.vue")

        expect(page).toContain("package-meat-browser")
        expect(page).toContain("featured-meat-pane")
        expect(page).toContain("meat-grid-pane")
        expect(page).toContain("Keep Browsing")
        expect(page).toContain("Choose {{ activeInspectorPackage.name }}")
        expect(page).toContain("@click=\"chooseActiveInspectorPackage\"")
        expect(page).not.toContain("Confirm package")
        expect(page).not.toContain("pendingPackageSelection")
    })

    it("keeps the grill-table background scoped to package selection", () => {
        const page = readProjectFile("pages/order/packageSelection.vue")
        const welcome = readProjectFile("pages/index.vue")
        const css = readProjectFile("assets/css/main.css")

        expect(page).toContain("bg-grill-table")
        expect(welcome).toContain("bg-grill-table")
        expect(welcome).toContain("flameSrc")
        expect(css).toContain(".bg-grill-table")
    })
})
