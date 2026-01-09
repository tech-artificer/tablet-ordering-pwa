import { defineNuxtPlugin } from '#app'
import axios from 'axios'
import { useDeviceStore } from '../stores/device'
import { useRuntimeConfig } from '#imports'
import { logger } from '../utils/logger'
import type { InternalAxiosRequestConfig } from 'axios'

export default defineNuxtPlugin(() => {
  
  const config = useRuntimeConfig()

  const api = axios.create({
    // Ensure baseURL always ends with a single trailing slash so relative paths
    // passed to axios (like 'api/menus/...') concatenate correctly.
    baseURL: (String(config.public.mainApiUrl || '')).replace(/\/+$/, '') + '/',
    timeout: 15000
  })

  api.interceptors.request.use((req: InternalAxiosRequestConfig) => {
    const device = useDeviceStore()

    // Ensure headers exists and is type-safe
    if (!req.headers) {
      req.headers = {} as InternalAxiosRequestConfig['headers']
    }

    // Safely mutate headers
    const headers = req.headers as Record<string, string>

    headers['Accept'] = 'application/json'
    headers['Content-Type'] = 'application/json'

    // Apply Authorization header safely
    if (device.token) {
      headers['Authorization'] = `Bearer ${device.token}`
      logger.debug('🔑 Authorization header set:', {
        tokenPreview: device.token.substring(0, 30) + '...',
        url: req.url,
        method: req.method
      })
    } else {
      logger.warn('❌ NO TOKEN - Authorization header NOT set!', {
        url: req.url,
        method: req.method,
        deviceStoreState: {
          hasDevice: !!device.device,
          hasTable: !!device.table,
          hasToken: !!device.token
        }
      })
    }

    // Compute a robust full URL using the baseURL and the request URL
    let fullUrl = ''
    try {
      // `req.url` can be relative like 'api/menus' — new URL handles joining
      fullUrl = new URL(String(req.url), String(req.baseURL)).href
    } catch (e) {
      fullUrl = String(req.baseURL) + String(req.url)
    }

    // Log full request details for debugging
    logger.debug('📤 API Request:', {
      method: req.method?.toUpperCase(),
      url: req.url,
      fullUrl,
      hasAuth: !!headers['Authorization'],
      payloadSize: req.data ? JSON.stringify(req.data).length : 0,
      payloadPreview: req.data ? JSON.stringify(req.data, null, 2).substring(0, 500) : 'No payload',
      headers: {
        Accept: headers['Accept'],
        ContentType: headers['Content-Type'],
        Authorization: headers['Authorization'] ? 'Bearer ***' : 'NONE'
      }
    })

    return req
  })

  // Add response interceptor to log errors and handle 401 token refresh
  api.interceptors.response.use(
    (response) => {
      logger.debug('📥 API Response SUCCESS:', {
        status: response.status,
        statusText: response.statusText,
        url: response.config.url,
        method: response.config.method,
        dataPreview: JSON.stringify(response.data, null, 2).substring(0, 500),
        fullData: response.data
      })
      return response
    },
    async (error) => {
      const originalRequest = error.config

      logger.error('❌ API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        requestHeaders: error.config?.headers,
        message: error.message
      })

      // Handle 401 Unauthorized - token expired, refresh and retry once
      if (error.response?.status === 401 && originalRequest && !originalRequest._isRetry) {
        originalRequest._isRetry = true
        
        logger.warn('🔄 401 Unauthorized - Attempting token refresh...')
        
        try {
          const deviceStore = useDeviceStore()
          const refreshSuccess = await deviceStore.refresh()
          
          if (refreshSuccess && deviceStore.token) {
            // Update Authorization header with new token
            originalRequest.headers['Authorization'] = `Bearer ${deviceStore.token}`
            logger.debug('✅ Token refreshed, retrying request')
            
            // Retry the original request with new token
            return api(originalRequest)
          } else {
            logger.error('❌ Token refresh failed, redirecting to home')
            if (typeof window !== 'undefined') {
              window.location.href = '/'
            }
          }
        } catch (refreshError) {
          logger.error('❌ Token refresh exception:', refreshError)
          if (typeof window !== 'undefined') {
            window.location.href = '/'
          }
        }
      }

      return Promise.reject(error)
    }
  )

  return {
    provide: { api }
  }
})
