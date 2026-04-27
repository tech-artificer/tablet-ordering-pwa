import { describe, expect, it } from "vitest"
import { resolveReverbSocketConfig } from "~/utils/reverbSocketConfig"

describe("resolveReverbSocketConfig", () => {
    it("uses the browser hostname when the configured Reverb host is empty", () => {
        const resolved = resolveReverbSocketConfig(
            {
                host: "",
                port: 443,
                scheme: "https",
            },
            {
                hostname: "woosoo.local",
                port: "",
                protocol: "https:",
            }
        )

        expect(resolved.host).toBe("woosoo.local")
        expect(resolved.port).toBe(443)
        expect(resolved.forceTLS).toBe(true)
    })

    it("keeps the current browser port when Reverb is configured for default tls port 443", () => {
        const resolved = resolveReverbSocketConfig(
            {
                host: "",
                port: 443,
                scheme: "https",
            },
            {
                hostname: "woosoo.local",
                port: "8443",
                protocol: "https:",
            }
        )

        expect(resolved.host).toBe("woosoo.local")
        expect(resolved.port).toBe(8443)
        expect(resolved.forceTLS).toBe(true)
    })

    it("preserves an explicit non-default Reverb port", () => {
        const resolved = resolveReverbSocketConfig(
            {
                host: "reverb.internal",
                port: 6002,
                scheme: "http",
            },
            {
                hostname: "woosoo.local",
                port: "",
                protocol: "http:",
            }
        )

        expect(resolved.host).toBe("reverb.internal")
        expect(resolved.port).toBe(6002)
        expect(resolved.forceTLS).toBe(false)
    })
})
