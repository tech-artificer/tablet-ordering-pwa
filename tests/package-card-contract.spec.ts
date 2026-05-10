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
        expect(component).toContain("View cuts")
    })

    it("caps modifier preview and surfaces overflow indicator", () => {
        const component = readProjectFile("components/PackageCard.vue")

        expect(component).toContain("const previewLimit = 6")
        expect(component).toContain("const previewOverflow = computed<number>")
        expect(component).toContain("+{{ previewOverflow }}")
    })
})
