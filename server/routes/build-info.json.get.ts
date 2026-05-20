import { defineEventHandler, setResponseHeader } from "h3"

export default defineEventHandler((event) => {
    // Prevent any caching - this must always reflect the currently deployed build
    setResponseHeader(event, "Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    setResponseHeader(event, "Pragma", "no-cache")
    setResponseHeader(event, "Expires", "0")

    const config = useRuntimeConfig()

    return {
        appVersion: config.public.appVersion,
        appEnv: config.public.appEnv,
        buildSha: config.public.buildSha,
        buildBranch: config.public.buildBranch,
        buildTime: config.public.buildTime,
        apiBaseUrl: config.public.apiBaseUrl,
        reverb: {
            host: config.public.reverb.host,
            port: config.public.reverb.port,
            scheme: config.public.reverb.scheme,
            path: config.public.reverb.path,
        },
    }
})
