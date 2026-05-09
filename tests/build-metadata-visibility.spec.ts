import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const readText = (relativePath: string) =>
    readFileSync(resolve(__dirname, "..", relativePath), "utf-8")

describe("build metadata visibility wiring", () => {
    it("declares build metadata in Nuxt public runtime config", () => {
        const config = readText("nuxt.config.ts")

        expect(config).toContain("buildSha:")
        expect(config).toContain("buildBranch:")
        expect(config).toContain("buildTime:")
    })

    it("passes build metadata and API base through Docker build args", () => {
        const dockerfile = readText("Dockerfile")

        expect(dockerfile).toContain("ARG APP_VERSION")
        expect(dockerfile).toContain("ARG APP_ENV")
        expect(dockerfile).toContain("ARG BUILD_SHA")
        expect(dockerfile).toContain("ARG BUILD_BRANCH")
        expect(dockerfile).toContain("ARG BUILD_TIME")
        expect(dockerfile).toContain("ARG NUXT_PUBLIC_API_BASE_URL")
    })

    it("renders build and runtime values in settings page", () => {
        const settings = readText("pages/settings.vue")

        expect(settings).toContain("Build & Runtime Information")
        expect(settings).toContain("Build SHA")
        expect(settings).toContain("Build Branch")
        expect(settings).toContain("Build Time")
        expect(settings).toContain("API Base URL")
        expect(settings).toContain("Reverb Host")
        expect(settings).toContain("Reverb Port")
        expect(settings).toContain("Reverb Scheme")
        expect(settings).toContain("Reverb Path")
    })
})
