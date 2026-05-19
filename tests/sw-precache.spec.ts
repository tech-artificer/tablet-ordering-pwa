import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

// Resolve from project root (tests run from project directory)
const PROJECT_ROOT = process.cwd()

function readServiceWorkerSource (): string {
    return readFileSync(resolve(PROJECT_ROOT, "public/sw.ts"), "utf-8")
}

describe("service worker navigation fallback", () => {
    it("uses the revisioned root shell instead of unrevisioned /index.html", () => {
        const source = readServiceWorkerSource()

        expect(source).toContain("createHandlerBoundToURL('/')")
        expect(source).not.toContain("createHandlerBoundToURL('/index.html')")
        expect(source).not.toContain("ensureAppShellPrecached")
    })

    it("does not hijack certificate download routes", () => {
        const source = readServiceWorkerSource()

        expect(source).toContain("/^\\/ca\\.crt$/")
        expect(source).toContain("/^\\/ca\\.der$/")
        expect(source).toContain("/^\\/ca\\.pem$/")
    })

    it("handles explicit skip waiting messages", () => {
        const source = readServiceWorkerSource()

        expect(source).toMatch(/self\.addEventListener\(['"]message['"]/)
        expect(source).toMatch(/event\.data\?\.type\s*===\s*['"]SKIP_WAITING['"]/)
        expect(source).toMatch(/self\.skipWaiting\(\)/)
        expect(source).not.toMatch(/self\.addEventListener\(['"]install['"]/)
    })

    it("order submission is live-only — no BackgroundSyncPlugin on any order route", () => {
        const source = readServiceWorkerSource()

        // Both order routes must be registered
        expect(source).toContain("/\\/api\\/devices\\/create-order$/")
        expect(source).toContain("/\\/api\\/order\\/\\d+\\/refill$/")

        // Neither route nor the file may reference BackgroundSyncPlugin or bgSyncPlugin
        expect(source).not.toContain("bgSyncPlugin")
        expect(source).not.toContain("BackgroundSyncPlugin")
        expect(source).not.toContain("workbox-background-sync")
    })
})
