import axios from "axios"
import type { InternalAxiosRequestConfig } from "axios"
import { useDeviceStore } from "../stores/Device"
import { logger } from "../utils/logger"
import { isDeviceAuthPath, normalizeApiRequestUrl } from "../utils/apiRequest"

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
  _networkRetries?: number
}

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig()

    const api = axios.create({
    // Ensure baseURL always ends with a single trailing slash so relative paths
    // passed to axios (like 'api/menus/...') concatenate correctly.
        baseURL: (String(config.public.apiBaseUrl || "")).replace(/\/+$/, "") + "/",
        timeout: 15000
    })

    let reauthPromise: Promise<boolean> | null = null

    api.interceptors.request.use((req: InternalAxiosRequestConfig) => {
        const device = useDeviceStore()
        const requestUrl = String(req.url || "")
        const normalizedRequestUrl = normalizeApiRequestUrl({
            baseURL: String(req.baseURL || ""),
            requestUrl,
        })

        req.url = normalizedRequestUrl

        const isTokenOptionalRequest = /^\/?(?:api\/)?devices\/(login|register)(?:$|\?|\/)/i.test(normalizedRequestUrl)

        // Ensure headers exists and is type-safe
        if (!req.headers) {
            req.headers = {} as InternalAxiosRequestConfig["headers"]
        }

        // Safely mutate headers
        const headers = req.headers as Record<string, string>

        headers.Accept = "application/json"
        headers["Content-Type"] = "application/json"

        // Apply Authorization header safely
        if (device.token) {
            headers.Authorization = `Bearer ${device.token}`
            logger.debug("🔑 Authorization header set:", {
                tokenPreview: device.token.substring(0, 30) + "...",
                url: req.url,
                method: req.method
            })
        } else if (isTokenOptionalRequest) {
            logger.debug("ℹ️ Authorization header not set for token-optional endpoint", {
                url: req.url,
                method: req.method,
            })
        } else {
            logger.warn("❌ NO TOKEN - Authorization header NOT set!", {
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
        let fullUrl = ""
        try {
            // `req.url` can be relative like 'api/menus' — new URL handles joining
            fullUrl = new URL(String(req.url), String(req.baseURL)).href
        } catch (e) {
            fullUrl = String(req.baseURL) + String(req.url)
        }

        // Log full request details for debugging
        logger.debug("📤 API Request:", {
            method: req.method?.toUpperCase(),
            url: req.url,
            fullUrl,
            hasAuth: !!headers.Authorization,
            payloadSize: req.data ? JSON.stringify(req.data).length : 0,
            payloadPreview: req.data ? JSON.stringify(req.data, null, 2).substring(0, 500) : "No payload",
            headers: {
                Accept: headers.Accept,
                ContentType: headers["Content-Type"],
                Authorization: headers.Authorization ? "Bearer ***" : "NONE"
            }
        })

        return req
    })

    // Add response interceptor to log errors and successes
    api.interceptors.response.use(
        (response) => {
            logger.debug("📥 API Response SUCCESS:", {
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
            const device = useDeviceStore()
            const originalRequest = error?.config as RetriableRequestConfig | undefined
            const status = error?.response?.status

            if (
                status === 401 &&
        originalRequest &&
        !originalRequest._retry &&
        !isDeviceAuthPath(String(originalRequest.url || ""))
            ) {
                originalRequest._retry = true

                try {
                    if (!reauthPromise) {
                        reauthPromise = (async () => {
                            logger.warn("🔄 API 401 detected; attempting device re-authentication")

                            // Try token refresh first when a token exists
                            if (device.token) {
                                const refreshed = await device.refresh()
                                if (refreshed && device.token) {
                                    return true
                                }
                            }

                            // Fallback: login by device IP mapping (server-side)
                            return await device.authenticate()
                        })().finally(() => {
                            reauthPromise = null
                        })
                    }

                    const recovered = await reauthPromise

                    if (recovered && device.token) {
                        if (!originalRequest.headers) {
                            originalRequest.headers = {} as InternalAxiosRequestConfig["headers"]
                        }

                        const headers = originalRequest.headers as Record<string, string>
                        headers.Authorization = `Bearer ${device.token}`

                        logger.info("✅ Re-auth succeeded; retrying original request once", {
                            url: originalRequest.url,
                            method: originalRequest.method,
                        })

                        return api.request(originalRequest)
                    }
                } catch (reauthError) {
                    logger.error("❌ Re-authentication failed after 401", reauthError)
                }
            }

            // Retry GET requests on timeout / network errors (max 2 retries, 1s backoff)
            // POST/PUT/DELETE are not retried — they are not idempotent.
            const isTransient = error.code === "ECONNABORTED" || error.message?.includes("timeout") || error.code === "ECONNRESET" || error.code === "ERR_NETWORK"
            const isGetRequest = (error.config?.method || "").toUpperCase() === "GET"
            const retries = (error.config as RetriableRequestConfig)?._networkRetries ?? 0

            if (isTransient && isGetRequest && retries < 2 && error.config) {
                const cfg = error.config as RetriableRequestConfig
                cfg._networkRetries = retries + 1
                const delay = retries === 0 ? 1000 : 2000
                logger.warn(`⚡ Transient network error on GET; retry ${cfg._networkRetries}/2 in ${delay}ms`, { url: cfg.url })
                await new Promise(resolve => setTimeout(resolve, delay))
                return api.request(cfg)
            }

            if (isTransient) {
                logger.error("⏱️ API Request timed out (no retry):", {
                    url: error.config?.url,
                    method: error.config?.method,
                    timeout: error.config?.timeout,
                    message: error.message,
                })
                return Promise.reject(error)
            }

            logger.error("❌ API Error:", {
                url: error.config?.url,
                method: error.config?.method,
                status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                headers: error.response?.headers,
                requestHeaders: error.config?.headers,
                message: error.message
            })
            return Promise.reject(error)
        }
    )

    // Start proactive token refresh timer once a token is present.
    // watch is imported via Nuxt auto-imports.
    const device = useDeviceStore()
    watch(
        () => device.token,
        (token) => {
            if (token) {
                device.startRefreshTimer()
            } else {
                device.stopRefreshTimer()
            }
        },
        { immediate: true }
    )

    return {
        provide: { api }
    }
})
