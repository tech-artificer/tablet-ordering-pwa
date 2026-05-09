import { describe, expect, it } from "vitest"
import nuxtConfig from "../nuxt.config"

describe("runtime config script", () => {
    it("loads runtime-config.js before app boot", () => {
        const scripts = nuxtConfig.app?.head?.script ?? []

        expect(scripts).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    src: "/runtime-config.js",
                }),
            ]),
        )
    })
})
