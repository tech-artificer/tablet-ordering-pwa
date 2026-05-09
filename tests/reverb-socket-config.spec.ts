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

    it("keeps configured tls port when Reverb is explicitly set to 443", () => {
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
        expect(resolved.port).toBe(443)
        expect(resolved.forceTLS).toBe(true)
    })

    it("falls back to the browser hostname when configured host is a bare Docker service name", () => {
        const resolved = resolveReverbSocketConfig(
            {
                host: "reverb",
                port: 443,
                scheme: "https",
            },
            {
                hostname: "192.168.100.7",
                port: "",
                protocol: "https:",
            }
        )

        expect(resolved.host).toBe("192.168.100.7")
        expect(resolved.port).toBe(443)
        expect(resolved.forceTLS).toBe(true)
    })

    it("keeps localhost as a valid configured host", () => {
        const resolved = resolveReverbSocketConfig(
            {
                host: "localhost",
                port: 8080,
                scheme: "http",
            },
            {
                hostname: "192.168.100.7",
                port: "",
                protocol: "http:",
            }
        )

        expect(resolved.host).toBe("localhost")
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
