import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it } from "vitest"

function readProjectFile (relativePath: string): string {
    return readFileSync(resolve(__dirname, "..", relativePath), "utf-8")
}

describe("nuxt devtools config", () => {
    it("gates Nuxt devtools behind an explicit env toggle", () => {
        const config = readProjectFile("nuxt.config.ts")

        expect(config).toContain('readBooleanEnv("NUXT_DEVTOOLS", false)')
        expect(config).toMatch(/devtools:\s*\{\s*enabled:\s*enableNuxtDevtools\s*\}/)
    })

    it("does not include the Nuxt devtools module unconditionally", () => {
        const config = readProjectFile("nuxt.config.ts")

        expect(config).toContain('...(enableNuxtDevtools ? ["@nuxt/devtools"] : [])')
    })

    it("defaults the shared example env to devtools off", () => {
        const envExample = readProjectFile(".env.example")

        expect(envExample).toContain("NUXT_DEVTOOLS=false")
    })
})
