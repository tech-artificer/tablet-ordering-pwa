import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(__dirname, "..", relativePath), "utf-8")
}

describe("package card interaction contract", () => {
    it("keeps package commit explicit via select button", () => {
        const component = readProjectFile("components/PackageCard.vue")

        expect(component).toContain("@click.stop=\"emit('select', pkg)\"")
        expect(component).not.toContain("@click=\"emit('select', pkg)\"")
        expect(component).toContain("Choose package")
    })

    it("prioritizes dining meat groups in card content", () => {
        const component = readProjectFile("components/PackageCard.vue")

        expect(component).toContain("const PRIORITY_ORDER = [\"PORK\", \"BEEF\", \"CHICKEN\", \"SEAFOOD\", \"OTHER\"]")
        expect(component).toContain("label = \"PORK\"")
        expect(component).toContain("label = \"BEEF\"")
        expect(component).toContain("label = \"CHICKEN\"")
    })
})
