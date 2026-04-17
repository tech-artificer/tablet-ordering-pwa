import { defineStore } from 'pinia'
import { ref, computed, onScopeDispose } from 'vue'
import { useApi } from "../composables/useApi";
import { logger } from "../utils/logger";
import type { Device, Table } from '../types/index'

export const useDeviceStore = defineStore('device', () => {
    // State
    const device = ref<Device | null>(null)
    const code = ref<string | number | null>(null)
    const table = ref<Table | null>(null)
    const token = ref<string | null>(null)
    const expiration = ref<number | string | null>(null)
    const isLoading = ref(false)
    const errorMessage = ref<string | null>(null)
    // Broadcasting config received from server (persisted to localStorage)
    const broadcastConfig = ref<{ key: string; host: string; port: number; scheme: string; authEndpoint: string } | null>(null)
        // Debug / diagnostics: last raw auth/register response and server-chosen IP
        const lastAuthResponse = ref<any | null>(null)
        const lastServerIpUsed = ref<string | null>(null)
        // If registration completed but server hasn't assigned a table yet
        const waitingForTable = ref(false)
        // Polling state for waiting-for-table
        const isPollingForTable = ref(false)
        const pollAttempts = ref(0)
        const maxPollAttempts = ref(24)
        let pollTimerId: number | null = null
        let pollStartedAt: number | null = null
        const defaultPollIntervalMs = 5000
        const defaultMaxPollAttempts = 24
        const defaultMaxPollRuntimeMs = 2 * 60 * 1000

        function stopTablePolling() {
            if (pollTimerId) {
                try {
                    clearInterval(pollTimerId)
                } catch (e) {
                    logger.debug('[DeviceStore] stopTablePolling: clearInterval failed', e)
                }
                pollTimerId = null
            }
            pollStartedAt = null
            isPollingForTable.value = false
            pollAttempts.value = 0
        }

        function startTablePolling(intervalMs = defaultPollIntervalMs, maxAttempts = defaultMaxPollAttempts) {
            // don't start if already polling
            if (isPollingForTable.value) return
            if (typeof window === 'undefined') {
                logger.warn('[DeviceStore] startTablePolling: window unavailable (SSR)')
                return
            }
            logger.debug('[DeviceStore] startTablePolling')
            isPollingForTable.value = true
            // ensure UI shows we're awaiting assignment
            waitingForTable.value = true
            pollAttempts.value = 0
            maxPollAttempts.value = maxAttempts
            pollStartedAt = Date.now()
            pollTimerId = window.setInterval(async () => {
                pollAttempts.value++

                if (pollStartedAt && (Date.now() - pollStartedAt) > defaultMaxPollRuntimeMs) {
                    logger.warn('[DeviceStore] table polling max runtime exceeded')
                    stopTablePolling()
                    return
                }

                try {
                        const api = useApi()
                        if (!api || typeof (api as any).get !== 'function') {
                            logger.warn('[DeviceStore] startTablePolling: api client unavailable — stopping table polling')
                            stopTablePolling()
                            return
                        }
                        const response = await api.get('/api/devices/login')
                    const resp = response.data || {}
                    // store raw response for diagnostics
                    lastAuthResponse.value = resp
                    const ipUsedFromServer: string | undefined = resp?.ip_used
                    if (ipUsedFromServer) lastServerIpUsed.value = ipUsedFromServer

                    const authToken = resp.token
                    const authDevice = resp.device
                    const authTable = resp.table
                    const expires_at = resp.expires_at

                    if (authDevice) {
                        if (ipUsedFromServer) (authDevice as any).ip_address = ipUsedFromServer
                        device.value = authDevice
                    }
                    if (authToken) token.value = authToken
                    if (expires_at) expiration.value = expires_at

                    if (authTable) {
                        table.value = normalizeTable(authTable)
                    }

                    const t = table.value as any
                    if (t && (t.id || t.name)) {
                        // assigned — stop polling and clear waiting flag
                        waitingForTable.value = false
                        logger.debug('[DeviceStore] table assigned during polling', t)
                        stopTablePolling()
                    } else if (pollAttempts.value >= maxAttempts) {
                        // give up after max attempts
                        logger.debug('[DeviceStore] table polling max attempts reached')
                        stopTablePolling()
                    }
                } catch (e) {
                    // network errors: keep trying until attempts exhausted
                    logger.warn('[DeviceStore] polling error', e)
                    if (pollAttempts.value >= maxAttempts) stopTablePolling()
                }
            }, intervalMs) as unknown as number
        }

    /** Extract broadcasting config from a server response and (re-)init Echo if available. */
    function applyBroadcastConfig(responseData: any) {
        const bc = responseData?.broadcasting
        if (bc && bc.key) {
            broadcastConfig.value = {
                key: bc.key,
                host: bc.host ?? '',
                port: bc.port ?? 6001,
                scheme: bc.scheme ?? 'http',
                authEndpoint: bc.auth_endpoint ?? '/broadcasting/auth',
            }
            // Re-initialize Echo with server-provided config
            if (typeof window !== 'undefined' && (window as any).initEcho) {
                (window as any).initEcho(broadcastConfig.value, token.value)
            }
        }
    }

    // Getters
    const isAuthenticated = computed((): boolean => {
        return !!(token.value && table.value?.id)
    })
    
    const hasDevice = computed((): boolean => !!token.value)
    
    const tableName = computed((): string | undefined => table.value?.name)

    // Actions
    // Normalize table responses: support object or string table value
    function normalizeTable(tbl: any): Table | null {
        if (!tbl) return null
        if (typeof tbl === 'string') return { id: null as any, name: tbl, status: 'unknown', is_available: false, is_locked: false }
        // if already object with name/id, return as-is (cast to Table)
        return tbl as Table
    }

    async function authenticate(): Promise<boolean> {
        isLoading.value = true
        errorMessage.value = null
        
        try {
            const api = useApi()
            const authStart = performance.now()
            
            const response = await api.get('/api/devices/login')
            const authMs = (performance.now() - authStart).toFixed(1)
            const { token: authToken, device: authDevice, table: authTable, expires_at } = response.data
            // store raw response for diagnostics
            lastAuthResponse.value = response.data
            // Backend may include `ip_used` to indicate which IP was used for lookup (client-provided or remote)
            const ipUsedFromServer: string | undefined = response.data?.ip_used
            if (ipUsedFromServer) lastServerIpUsed.value = ipUsedFromServer
            
            if (authDevice && authToken && authTable) {
                // Prefer server-provided `ip_used` as canonical for diagnostics only.
                if (ipUsedFromServer && authDevice) {
                    ;(authDevice as any).ip_address = ipUsedFromServer
                }
                device.value = authDevice
                token.value = authToken
                
                // notify Echo plugin (if available) to update auth header
                try { if (typeof window !== 'undefined' && (window as any).updateEchoAuth) (window as any).updateEchoAuth(token.value) } catch (e) { logger.debug('[DeviceStore] updateEchoAuth not available') }
                
                table.value = normalizeTable(authTable)
                expiration.value = expires_at
                
                // Apply broadcasting config from server response
                applyBroadcastConfig(response.data)

                console.log(`[✅ Device Authenticated] device_id=${authDevice.id} table_id=${authTable?.id} table_name=${authTable?.name} latency=${authMs}ms at ${new Date().toISOString()}`)
                logger.info(`[Device] Authenticated as device_id=${authDevice.id}`)

                return true
            }
            
            // Device not found or incomplete response
            console.log(`[⚠️ Device Auth Failed] Incomplete response at ${new Date().toISOString()}`)
            return false

        } catch (error: any) {
            console.error(`[❌ Device Auth Error] ${error?.message} at ${new Date().toISOString()}`)
            logger.error('[DeviceStore] Authentication failed:', error)
            errorMessage.value = error?.response?.data?.message || 'Authentication failed'
            return false
        } finally {
            isLoading.value = false
        }
    }

    async function register(formData: { code: string; name?: string }): Promise<void> {
        isLoading.value = true
        errorMessage.value = null
        
        try {
            const api = useApi()
            // Let the backend detect the client IP from the incoming request.
            // include name if provided; backend expects device name in some deployments
            const payload: any = { ...formData }

            const response = await api.post('/api/devices/register', payload)
            const { token: authToken, device: authDevice, table: authTable, expires_at } = response.data
            const ipUsedFromServer: string | undefined = response.data?.ip_used
            // store raw response for diagnostics
            lastAuthResponse.value = response.data
            if (ipUsedFromServer) lastServerIpUsed.value = ipUsedFromServer

            // Require at least the device object; token/table may be provided later by backend.
                    if (authDevice) {
                        if (ipUsedFromServer) (authDevice as any).ip_address = ipUsedFromServer
                        device.value = authDevice
                    }
                    if (authToken) {
                        token.value = authToken
                        try { if (typeof window !== 'undefined' && (window as any).updateEchoAuth) (window as any).updateEchoAuth(token.value) } catch (e) { logger.debug('[DeviceStore] updateEchoAuth not available') }
                    }
            device.value = authDevice
            expiration.value = expires_at

            if (authToken) {
                token.value = authToken
            } else {
                // no token returned yet; remain unauthenticated but remember device
                token.value = token.value || null
            }

            if (authTable) {
                table.value = normalizeTable(authTable)
                // If the server included a table name or id, we're no longer waiting
                waitingForTable.value = !( (table.value as any).id || (table.value as any).name )
            } else {
                table.value = null
                // mark that we're awaiting table assignment from the server
                waitingForTable.value = true
                // start background polling to detect table assignment
                startTablePolling()
            }

            // Prefer server-provided `ip_used` as canonical for diagnostics only.
            if (ipUsedFromServer && device.value) {
                ;(device.value as any).ip_address = ipUsedFromServer
            }

            // Apply broadcasting config from server response
            applyBroadcastConfig(response.data)

        } catch (error: any) {
            logger.error('[DeviceStore] Registration failed:', error)

            // If the server returned a body that includes device details, treat as registered
            const resp = error?.response?.data
            if (resp && (resp.device || resp.token || resp.success)) {
                // store raw response for diagnostics if present
                lastAuthResponse.value = resp
                const ipUsedFromServer: string | undefined = resp?.ip_used
                if (ipUsedFromServer) lastServerIpUsed.value = ipUsedFromServer
                if (resp.device) device.value = resp.device
                if (resp.token) token.value = resp.token
                    if (resp.table) {
                        table.value = normalizeTable(resp.table)
                        waitingForTable.value = !( (table.value as any).id || (table.value as any).name )
                    } else {
                        waitingForTable.value = true
                    }

                // Apply broadcasting config even from error responses (409 includes it)
                applyBroadcastConfig(resp)
                // Friendly message informing that device exists but assignment pending
                errorMessage.value = 'Device was registered on the server; waiting for table assignment. Use "Check for Table" in Settings.'
                // Do not re-throw — caller should treat this as handled
                return
            }

            // Extract error message for genuine failures
            if (error?.response?.data?.errors) {
                errorMessage.value = error.response.data.errors
            } else if (error?.response?.data?.message) {
                errorMessage.value = error.response.data.message
            } else {
                errorMessage.value = error?.message || 'Registration failed'
            }

            throw error // Re-throw to allow caller to handle
        } finally {
            isLoading.value = false
        }
    }

        // Checks if the server has assigned a table after registration.
        // Calls `authenticate()` to fetch latest device info and returns true when a table is present.
        async function checkTableAssignment(): Promise<boolean> {
            // If we don't have any device or token at all, nothing to check
                if (!device.value && !token.value) return false
                logger.debug('[DeviceStore] checkTableAssignment running — device present?', !!device.value, 'token?', !!token.value)

            try {
                const ok = await authenticate()
                const t = table.value as any
                if (t && (t.id || t.name)) {
                    waitingForTable.value = false
                    return true
                }
                // still no table
                waitingForTable.value = true
                return false
            } catch (e) {
                logger.warn('[DeviceStore] checkTableAssignment failed', e)
                return false
            }
        }

    
    function clearAuth(): void {
        device.value = null
        token.value = null
        table.value = null
        expiration.value = null
        errorMessage.value = null
            lastAuthResponse.value = null
            lastServerIpUsed.value = null
                waitingForTable.value = false
    }

    onScopeDispose(() => {
        stopTablePolling()
    })

    return {
        // State
        device,
        code,
        table,
        token,
        expiration,
        isLoading,
        errorMessage,
            waitingForTable,
            isPollingForTable,
            pollAttempts,
            maxPollAttempts,
        
        // Getters
        isAuthenticated,
        hasDevice,
        tableName,
        // Actions
        authenticate,
        register,
        checkTableAssignment,
        startTablePolling,
        stopTablePolling,
            // Diagnostics
            lastAuthResponse,
            lastServerIpUsed,
            // Broadcasting config (server-provided)
            broadcastConfig,
        clearAuth,
    }
}, {
    persist: {
        key: 'device-store',
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        paths: ['device', 'token', 'expiration', 'table', 'broadcastConfig'],
    }
})
