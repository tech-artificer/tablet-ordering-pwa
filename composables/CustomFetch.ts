import { ofetch, type FetchOptions } from 'ofetch'
import { useRuntimeConfig } from "nuxt/app"
import { useDeviceStore } from "@/stores/Device"


export function useMainApiAuth(url: string, options?: FetchOptions) {
  const config = useRuntimeConfig()
  const deviceStore = useDeviceStore()

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  if (deviceStore?.token) {
    defaultHeaders['Authorization'] = `Bearer ${deviceStore.token}`
  }

  const ofetchApi = ofetch.create({
    baseURL: config.public.mainApiUrl,
  })

  return ofetchApi(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options?.headers || {}),
    },
  })
}