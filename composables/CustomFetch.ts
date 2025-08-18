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

    const ofetchApi = ofetch.create({
        baseURL: config.public.mainApiUrl,
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": `Bearer ${deviceStore.device.token}`,
        },
    })

    return ofetchApi(url, params)
}
