import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const readAppSource = () => readFileSync(resolve(process.cwd(), "app.vue"), "utf-8")

describe("app auth broadcast bootstrap", () => {
    it("uses Pinia's unwrapped device authentication state when gating broadcasts", () => {
        const source = readAppSource()

        expect(source).toContain("function isDeviceAuthenticated")
        expect(source).toContain("unref(deviceStore.isAuthenticated)")
        expect(source).toContain("scheduleBroadcastInitialization")
        expect(source).toContain("initializeBroadcasts()")
        expect(source).not.toContain("deviceStore.isAuthenticated.value")
    })
})
