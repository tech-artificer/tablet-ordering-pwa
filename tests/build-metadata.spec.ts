import { describe, it, expect, vi, beforeEach } from "vitest"
import { useRuntimeConfigOverride } from "~/composables/useRuntimeConfigOverride"

// Mock useRuntimeConfig
vi.mock("#app", () => ({
    useRuntimeConfig: () => ({
        public: {
            appVersion: "1.2.3",
            appEnv: "test",
            buildSha: "abc1234",
            buildBranch: "feature/test-branch",
            buildTime: "2026-05-09T12:00:00Z",
            apiBaseUrl: "https://api.test.local/api",
            broadcastConnection: "reverb",
            reverb: {
                appId: "test-app",
                appKey: "test-key",
                host: "reverb.test.local",
                port: 443,
                scheme: "https",
                path: "/app",
            },
        },
    }),
}))

describe("useRuntimeConfigOverride - build metadata", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it("returns build metadata from runtime config", () => {
        const config = useRuntimeConfigOverride()

        expect(config.buildSha).toBe("abc1234")
        expect(config.buildBranch).toBe("feature/test-branch")
        expect(config.buildTime).toBe("2026-05-09T12:00:00Z")
    })

    it("returns app version and environment", () => {
        const config = useRuntimeConfigOverride()

        expect(config.appVersion).toBe("1.2.3")
        expect(config.appEnv).toBe("test")
    })

    it("returns API and Reverb configuration", () => {
        const config = useRuntimeConfigOverride()

        expect(config.apiBaseUrl).toBe("https://api.test.local/api")
        expect(config.reverb.host).toBe("reverb.test.local")
        expect(config.reverb.port).toBe(443)
        expect(config.reverb.scheme).toBe("https")
        expect(config.reverb.path).toBe("/app")
    })
})

describe("BuildInfoPanel visibility", () => {
    it("exposes all required build info fields", () => {
        const config = useRuntimeConfigOverride()
        const requiredFields = [
            "appVersion",
            "appEnv",
            "buildSha",
            "buildBranch",
            "buildTime",
            "apiBaseUrl",
            "reverb",
        ]

        requiredFields.forEach((field) => {
            expect(config).toHaveProperty(field)
        })
    })
})
