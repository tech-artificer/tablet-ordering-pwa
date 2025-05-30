import { ofetch } from "ofetch"
import { useRuntimeConfig } from "nuxt/app"

export function useMainApiO(url: string, params?: RequestInit) {
    const config = useRuntimeConfig()
    const ofetchApi = ofetch.create({
        baseURL: config.public.MAIN_API_URL,
        headers: {
            Accept: "application/json"
        },
    })
    return ofetchApi(url, params)
}
