// tests/pwa-manifest.spec.ts
// Validates the PWA manifest config shape to ensure kiosk-critical settings
// are not accidentally changed (display: fullscreen, required icons, start_url).

import { readFileSync } from "fs"
import { resolve } from "path"
import { pathToFileURL } from "url"
import { describe, it, expect } from "vitest"

// ---------------------------------------------------------------------------
// Read nuxt.config.ts as text and extract the manifest object from it.
// We test the source config rather than a generated file because the generated
// manifest file is a build artifact and not committed.
// ---------------------------------------------------------------------------

function readNuxtConfig (): string {
    return readFileSync(resolve(__dirname, "../nuxt.config.ts"), "utf-8")
}

async function readNuxtConfigObject (): Promise<any> {
    const moduleUrl = pathToFileURL(resolve(__dirname, "../nuxt.config.ts")).href
    ;(globalThis as any).defineNuxtConfig = (config: any) => config
    const configModule = await import(moduleUrl)
    return configModule.default
}

describe("pwa manifest config", () => {
    it("display is \"fullscreen\" — must NOT be changed to \"standalone\"", () => {
        const config = readNuxtConfig()
        // Must contain fullscreen (kiosk requirement: hides browser chrome on Android)
        expect(config).toContain("\"fullscreen\"")
        // Must NOT contain standalone display
        expect(config).not.toMatch(/"display":\s*"standalone"/)
    })

    it("orientation is \"landscape\"", () => {
        const config = readNuxtConfig()
        expect(config).toContain("\"landscape\"")
    })

    it("start_url is \"/\"", () => {
        const config = readNuxtConfig()
        expect(config).toContain("start_url: \"/\"")
    })

    it("required icons are included in includeAssets", () => {
        const config = readNuxtConfig()
        expect(config).toContain("pwa-icon-192.png")
        expect(config).toContain("pwa-icon-512.png")
        expect(config).toContain("pwa-icon-maskable.png")
    })

    it("strategies is injectManifest (required for offline sync SW bridge)", () => {
        const config = readNuxtConfig()
        expect(config).toContain("injectManifest")
    })

    it("custom SW filename points to sw.ts", () => {
        const config = readNuxtConfig()
        expect(config).toContain("filename: \"sw.ts\"")
    })

    it("offline order sync feature flag is declared in runtimeConfig", () => {
        const config = readNuxtConfig()
        expect(config).toContain("offlineOrderSync")
        expect(config).toContain("NUXT_PUBLIC_OFFLINE_ORDER_SYNC")
    })

    it("loads runtime-config.js in head before app boot", async () => {
        const config = await readNuxtConfigObject()
        const scripts = config.app?.head?.script ?? []
        expect(scripts[0]).toMatchObject({
            src: "/runtime-config.js",
            async: false,
            defer: false,
        })
    })
})
