import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const appVue = readFileSync(resolve(process.cwd(), "app.vue"), "utf8")

describe("PWA update wiring", () => {
    it("initializes the update composable in app.vue without rendering a global banner", () => {
        // Update UI is route-controlled (only in welcome + settings pages, not in global app shell)
        expect(appVue).toContain("useAppUpdate")
        expect(appVue.match(/\binitializeAppUpdate\(\)/g)).toHaveLength(1)
        expect(appVue.match(/\bdisposeAppUpdate\(\)/g)).toHaveLength(1)
        expect(appVue).not.toContain("<UpdateBanner")
    })

    it("update system is managed by the composable for route-controlled display", () => {
        expect(appVue).toContain("initializeAppUpdate")
        expect(appVue).toContain("disposeAppUpdate")
    })
})
