import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { describe, expect, it, vi } from "vitest"

async function loadNuxtConfig () {
    vi.stubGlobal("defineNuxtConfig", (config: unknown) => config)

    const configUrl = pathToFileURL(resolve(process.cwd(), "nuxt.config.ts")).href
    const module = await import(`${configUrl}?t=${Date.now()}`)

    return module.default as {
        app?: {
            head?: {
                script?: Array<Record<string, unknown>>
            }
        }
    }
}

describe("runtime config script", () => {
    it("loads runtime-config.js before app boot", async () => {
        const nuxtConfig = await loadNuxtConfig()
        const scripts = nuxtConfig.app?.head?.script ?? []

        expect(scripts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    src: "/runtime-config.js",
                }),
            ])
        )
    })

    it("declares runtime-config.js only once", () => {
        const source = readFileSync(resolve(process.cwd(), "nuxt.config.ts"), "utf8")

        expect(source.match(/src:\s*["']\/runtime-config\.js["']/g)).toHaveLength(1)
    })
})
