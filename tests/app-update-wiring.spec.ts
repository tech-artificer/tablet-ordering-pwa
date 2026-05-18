import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Resolve from project root (tests run from project directory)
const PROJECT_ROOT = process.cwd()

function readAppSource (): string {
    return readFileSync(resolve(PROJECT_ROOT, "app.vue"), "utf-8")
}

describe("app update wiring", () => {
    it("wires useAppUpdate composable in app.vue", () => {
        const source = readAppSource()

        expect(source).toContain("useAppUpdate")
        expect(source).toContain("initializeAppUpdate")
        expect(source).toContain("disposeAppUpdate")
    })
})
