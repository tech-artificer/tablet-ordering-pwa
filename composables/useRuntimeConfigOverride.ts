type RuntimeConfigWindow = Window & {
    __APP_CONFIG__?: {
        apiBaseUrl?: string
        reverbHost?: string
        reverbAppKey?: string
        reverbPort?: string | number
        reverbScheme?: string
        reverbPath?: string
    }
}

export function useRuntimeConfigOverride () {
    const config = useRuntimeConfig()
    const win = (typeof window !== "undefined" ? window : undefined) as RuntimeConfigWindow | undefined
    const appConfig = win?.__APP_CONFIG__

    const apiBaseUrl = appConfig?.apiBaseUrl || config.public.apiBaseUrl

    const reverb = {
        appId: config.public.reverb.appId,
        appKey: appConfig?.reverbAppKey || config.public.reverb.appKey,
        host: appConfig?.reverbHost || config.public.reverb.host,
        port: Number(appConfig?.reverbPort ?? config.public.reverb.port ?? 0),
        scheme: appConfig?.reverbScheme || config.public.reverb.scheme,
        path: appConfig?.reverbPath || config.public.reverb.path,
    }

    return {
        apiBaseUrl,
        reverb,
        broadcastConnection: config.public.broadcastConnection,
        appVersion: config.public.appVersion,
        appEnv: config.public.appEnv,
        buildSha: config.public.buildSha,
        buildBranch: config.public.buildBranch,
        buildTime: config.public.buildTime,
    }
}
