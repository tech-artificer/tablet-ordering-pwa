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
})
