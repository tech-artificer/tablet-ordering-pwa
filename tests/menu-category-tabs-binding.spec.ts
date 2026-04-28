import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, it, expect } from "vitest"

const menuPagePath = resolve(__dirname, "../pages/menu.vue")

describe("menu page category tabs binding", () => {
    it("binds the category tabs to the page category list", () => {
        const source = readFileSync(menuPagePath, "utf8")

        expect(source).toContain(":categories=\"categories\"")
        expect(source).not.toContain(":categories=\"availableCategories\"")
    })
})
