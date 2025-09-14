import { ofetch } from "ofetch"
import { useRuntimeConfig } from "nuxt/app"
import { useMyDeviceStore } from "@/stores/Device"

export function useMainApiO(url: string, params?: RequestInit) {
    const config = useRuntimeConfig()

    const ofetchApi = ofetch.create({
        baseURL: config.public.mainApiUrl,
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    })

    return ofetchApi(url, params)
}

export function useMainApiAuth(url: string, params?: RequestInit) {
    const config = useRuntimeConfig()
    const deviceStore = useMyDeviceStore()

    // Build default headers and only include Authorization when a token exists
    const defaultHeaders: Record<string, string> = {
        "Accept": "application/json",
        "Content-Type": "application/json",
         credentials: deviceStore?.device?.token ? "omit" : "include", 
    }

    if (deviceStore?.device?.token) {
        defaultHeaders["Authorization"] = `Bearer ${deviceStore.device.token}`
    }

    // Merge any headers passed in via params
    const mergedParams: RequestInit = params ? { ...params } : {}
    if (mergedParams.headers) {
        // Normalize headers into an object
        const incoming = mergedParams.headers as Record<string, string>
        mergedParams.headers = { ...defaultHeaders, ...incoming }
    } else {
        mergedParams.headers = defaultHeaders
    }

    const ofetchApi = ofetch.create({
        baseURL: config.public.mainApiUrl,
    })

    return ofetchApi(url, mergedParams)
}
