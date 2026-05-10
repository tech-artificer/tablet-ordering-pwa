import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const appVue = readFileSync(resolve(process.cwd(), "app.vue"), "utf8")

describe("PWA update wiring", () => {
    it("renders one app update banner wired to the update composable state", () => {
        expect(appVue.match(/<UpdateBanner/g)).toHaveLength(1)
        expect(appVue).toContain(":visible=\"showUpdateBanner\"")
        expect(appVue).toContain(":disabled=\"!canApplyUpdate\"")
        expect(appVue).toContain(":is-applying=\"isApplyingUpdate\"")
        expect(appVue).toContain(":error-message=\"updateError\"")
        expect(appVue).toContain("@apply=\"applyUpdate\"")
        expect(appVue).not.toContain("updateAvailable")
        expect(appVue).not.toContain("updating")
    })

    it("starts and disposes the update watcher once", () => {
        expect(appVue).toContain("useAppUpdate")
        expect(appVue.match(/\binitializeAppUpdate\(\)/g)).toHaveLength(1)
        expect(appVue.match(/\bdisposeAppUpdate\(\)/g)).toHaveLength(1)
    })
})
