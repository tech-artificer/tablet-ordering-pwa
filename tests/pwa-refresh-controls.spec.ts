import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"

function readSource (relativePath: string): string {
    return readFileSync(resolve(__dirname, `../${relativePath}`), "utf-8")
}

describe("tablet-safe refresh controls", () => {
    it("exposes a PWA update CTA in app shell when a new service worker is ready", () => {
        const appSource = readSource("app.vue")
        const composableSource = readSource("composables/useAppUpdate.ts")
        const bannerSource = readSource("components/UpdateBanner.vue")

        expect(appSource).toContain("useAppUpdate")
        expect(appSource).toContain("<UpdateBanner")
        expect(composableSource).toContain("registration.value?.update()")
        expect(composableSource).toContain("SKIP_WAITING")
        expect(bannerSource).toContain("New version available - tap to apply.")
    })

    it("keeps scoped tablet refresh separate from emergency /sw-reset cleanup", () => {
        const settingsSource = readSource("pages/settings.vue")
        const resetSource = readSource("pages/sw-reset.vue")

        expect(settingsSource).toContain("forceRefreshApp")
        expect(settingsSource).toContain("deleteTabletPwaCaches")
        expect(settingsSource).toContain("unregisterCurrentAppServiceWorkers")
        expect(settingsSource).toContain("Refresh Tablet PWA")
        expect(settingsSource).toContain("/sw-reset")
        expect(resetSource).toContain("deleteAllCaches")
        expect(resetSource).toContain("unregisterAllServiceWorkers")
    })

    it("supports explicit skip-waiting handshake from client to service worker", () => {
        const swSource = readSource("public/sw.ts")

        expect(swSource).toContain("SKIP_WAITING")
        expect(swSource).toContain("self.addEventListener('message'")
    })
})
