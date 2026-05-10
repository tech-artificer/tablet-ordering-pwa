import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(__dirname, "..", relativePath), "utf-8")
}

describe("package selection responsive layout contract", () => {
    it("implements viewport-conditional three/peek/portrait row modes", () => {
        const page = readProjectFile("pages/order/packageSelection.vue")

        expect(page).toContain("type PackageRowMode = \"three\" | \"peek\" | \"portrait\"")
        expect(page).toContain("viewportWidth.value >= 1200")
        expect(page).toContain("viewportWidth.value >= 900")
        expect(page).toContain("grid grid-cols-3")
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
})
