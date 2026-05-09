import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const appVue = readFileSync(resolve(process.cwd(), "app.vue"), "utf8")

describe("PWA update wiring", () => {
    it("renders the update banner", () => {
        expect(appVue).toContain("<UpdateBanner")
        expect(appVue).toContain("updateAvailable")
        expect(appVue).toContain("applyUpdate")
    })

    it("starts and disposes the update watcher", () => {
        expect(appVue).toContain("useAppUpdate")
        expect(appVue).toContain("initializeAppUpdate")
        expect(appVue).toContain("disposeAppUpdate")
    })
})
