import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"

function readServiceWorkerSource (): string {
    return readFileSync(resolve(__dirname, "../public/sw.ts"), "utf-8")
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
})
