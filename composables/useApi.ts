import type { AxiosInstance } from 'axios'

export const useApi = (): AxiosInstance => {
  const nuxtApp = useNuxtApp()
  return nuxtApp.$api as AxiosInstance
}