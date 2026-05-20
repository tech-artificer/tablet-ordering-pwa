import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Resolve from project root (tests run from project directory)
const PROJECT_ROOT = process.cwd()

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(PROJECT_ROOT, relativePath), "utf-8")
}

describe("settings PIN security contract", () => {
    it("does not ship a client-side default settings PIN", () => {
        const homePage = readProjectFile("pages/index.vue")

        expect(homePage).not.toContain("DEFAULT_PIN")
        expect(homePage).not.toContain("\"0711\"")
    })

    it("uses a first-run setup and confirm flow before granting settings access", () => {
        const homePage = readProjectFile("pages/index.vue")

        expect(homePage).toContain("isPinSetupMode")
        expect(homePage).toContain("pendingPin")
        expect(homePage).toContain("pinSetupStep")
        expect(homePage).toContain("PINs did not match")
        expect(homePage).toContain("localStorage.setItem(PIN_STORAGE_KEY")
        expect(homePage).toContain("sessionStorage.setItem(SETTINGS_PIN_AUTH_KEY")
    })
})
