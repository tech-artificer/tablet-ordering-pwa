import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { beforeAll, describe, expect, it } from "vitest"

// Resolve from project root (tests run from project directory)
const PROJECT_ROOT = process.cwd()

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(PROJECT_ROOT, relativePath), "utf-8")
}

describe("PIN modal accessibility contract (pages/index.vue)", () => {
    let homePage: string

    beforeAll(() => {
        homePage = readProjectFile("pages/index.vue")
    })

    it("dialog element has role='dialog'", () => {
        expect(homePage).toContain("role=\"dialog\"")
    })

    it("dialog element has aria-modal='true'", () => {
        expect(homePage).toContain("aria-modal=\"true\"")
    })

    it("dialog element is labelled by heading via aria-labelledby", () => {
        expect(homePage).toContain("aria-labelledby=\"pin-modal-title\"")
        expect(homePage).toContain("id=\"pin-modal-title\"")
    })

    it("dialog element has a description via aria-describedby", () => {
        expect(homePage).toContain("aria-describedby=\"pin-modal-prompt\"")
        expect(homePage).toContain("id=\"pin-modal-prompt\"")
    })

    it("dialog has a ref for programmatic focus management", () => {
        expect(homePage).toContain("ref=\"pinModalRef\"")
        expect(homePage).toContain("const pinModalRef = ref<HTMLElement | null>(null)")
    })

    it("dialog is focusable via tabindex", () => {
        expect(homePage).toContain("tabindex=\"-1\"")
    })

    it("dialog closes on Escape key press", () => {
        expect(homePage).toContain("@keydown.esc.prevent=\"closePinModal\"")
    })

    it("focus is moved into the dialog when opened", () => {
        expect(homePage).toContain("pinModalRef.value?.focus()")
        expect(homePage).toContain("await nextTick()")
    })

    it("imports nextTick for deferred focus", () => {
        expect(homePage).toMatch(/import\s*\{[^}]*nextTick[^}]*\}\s*from\s*["']vue["']/)
    })
})
