import { ofetch } from "ofetch"
import { useRuntimeConfig } from "nuxt/app"
const config = useRuntimeConfig()

export function useMainApiO (url: string, params: object) {
    const ofetchApi = ofetch.create({
        baseURL: config.public.MAIN_API_URL,
        headers: {
            Accept: "application/json"
        },
    })
    return ofetchApi(url, params)
}
