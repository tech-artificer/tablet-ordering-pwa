import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"

function readAppSource (): string {
    return readFileSync(resolve(__dirname, "../app.vue"), "utf-8")
}

describe("app update wiring", () => {
    it("wires useAppUpdate composable in app.vue", () => {
        const source = readAppSource()

        expect(source).toContain("useAppUpdate")
        expect(source).toContain("initializeAppUpdate")
        expect(source).toContain("disposeAppUpdate")
    })
})
