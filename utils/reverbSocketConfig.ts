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
    const normalizedPort = configuredPort || (isHttpsPage ? 443 : 80)
    const currentOriginPort = browserPort ? parseInt(browserPort, 10) : (isHttpsPage ? 443 : 80)
    const port = normalizedPort === 80 || normalizedPort === 443 ? currentOriginPort : normalizedPort
    const forceTLS = isHttpsPage || configuredScheme === "https"

    return {
        host,
        port,
        forceTLS,
    }
}
