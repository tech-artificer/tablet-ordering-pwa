import { defineEventHandler } from "h3"

export default defineEventHandler(() => {
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
