export type ReverbSocketConfigInput = {
    host?: string | null
    port?: number | null
    scheme?: string | null
}

export type BrowserLocationLike = {
    hostname?: string | null
    port?: string | null
    protocol?: string | null
}

export type ResolvedReverbSocketConfig = {
    host: string
    port: number
    forceTLS: boolean
}

export function resolveReverbSocketConfig (
    config: ReverbSocketConfigInput,
    locationLike?: BrowserLocationLike
): ResolvedReverbSocketConfig {
    const browserHost = String(locationLike?.hostname ?? "")
    const browserPort = String(locationLike?.port ?? "")
    const isHttpsPage = String(locationLike?.protocol ?? "") === "https:"

    const configuredHost = String(config.host ?? "").trim()
    const configuredPort = Number(config.port ?? 0)
    const configuredScheme = String(config.scheme ?? "http").toLowerCase()

    const host = configuredHost || browserHost
    // Use the explicitly configured port when provided.
    // Do NOT fall back to the browser's current port when the configured port is 443/80 —
    // the tablet PWA lives on port 4443 while Reverb is on port 443; substituting the
    // browser port would send WebSocket traffic to the wrong listener.
    const port = configuredPort !== 0 ? configuredPort : (isHttpsPage ? 443 : 80)
    const forceTLS = isHttpsPage || configuredScheme === "https"

    return {
        host,
        port,
        forceTLS,
    }
}
