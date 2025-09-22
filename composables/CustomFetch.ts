import { ofetch, type FetchOptions } from 'ofetch'
import { useRuntimeConfig } from "nuxt/app"
import { useMyDeviceStore } from "@/stores/Device"


export function useMainApiAuth(url: string, options?: FetchOptions) {
  const config = useRuntimeConfig()
  const deviceStore = useMyDeviceStore()

  const defaultHeaders: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  if (deviceStore?.device?.token) {
    defaultHeaders['Authorization'] = `Bearer ${deviceStore.device.token}`
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