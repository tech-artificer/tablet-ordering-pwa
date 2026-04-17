import { defineStore } from 'pinia'
import { reactive, computed, toRefs, onScopeDispose } from 'vue'
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

    let pollTimerId: number | null = null
    let pollStartedAt: number | null = null
    const defaultPollIntervalMs = 5000
    const defaultMaxPollAttempts = 24
    const defaultMaxPollRuntimeMs = 2 * 60 * 1000

    function normalizeTable(tbl: any): Table | null {
        if (!tbl) return null
        if (typeof tbl === 'string') {
            return { id: null as any, name: tbl, status: 'unknown', is_available: false, is_locked: false }
        }
        return tbl as Table
    }

    function applyAuthPayload(payload: any) {
        const authToken = payload?.token
        const authDevice = payload?.device
        const authTable = payload?.table
        const expiresAt = payload?.expires_at
        const ipUsedFromServer: string | undefined = payload?.ip_used

        state.lastAuthResponse = payload ?? null
        if (ipUsedFromServer) state.lastServerIpUsed = ipUsedFromServer

        if (authDevice) {
            if (ipUsedFromServer) authDevice.ip_address = ipUsedFromServer
            state.device = authDevice
        }

        if (authToken) {
            state.token = authToken
            try {
                if (typeof window !== 'undefined' && window.updateEchoAuth) {
                    window.updateEchoAuth(state.token)
                }
            } catch (e) {
                logger.debug('[DeviceStore] updateEchoAuth not available', e)
            }
        }

        if (expiresAt) state.expiration = expiresAt
        if (authTable) state.table = normalizeTable(authTable)
    }

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
        state.isPollingForTable = false
        state.pollAttempts = 0
    }

    async function refresh(): Promise<boolean> {
        state.isLoading = true
        state.errorMessage = null

        try {
            const api = useApi()
            const response = await api.post('/api/devices/refresh')
            applyAuthPayload(response.data)

            if (state.table) {
                state.waitingForTable = !(state.table.id || state.table.name)
            } else {
                state.waitingForTable = true
            }

            return !!state.token
        } catch (error: any) {
            logger.error('[DeviceStore] Token refresh failed:', error)
            state.errorMessage = error?.response?.data?.message || 'Token refresh failed'
            return false
        } finally {
            state.isLoading = false
        }
    }

    async function authenticate(): Promise<boolean> {
        state.isLoading = true
        state.errorMessage = null

        try {
            const api = useApi()
            const authStart = performance.now()
            const response = await api.get('/api/devices/login')
            applyAuthPayload(response.data)

            if (state.device && state.token && state.table) {
                const authMs = (performance.now() - authStart).toFixed(1)
                logger.info(`[Device] Authenticated device_id=${state.device.id} table_id=${state.table?.id} table_name=${state.table?.name} latency=${authMs}ms at ${new Date().toISOString()}`)
                logger.info(`[Device] Authenticated as device_id=${state.device.id}`)
                state.waitingForTable = false
                return true
            }

            logger.warn(`[Device] Auth failed: incomplete response at ${new Date().toISOString()}`)
            return false
        } catch (error: any) {
            logger.error(`[Device] Auth error ${error?.message} at ${new Date().toISOString()}`)
            logger.error('[DeviceStore] Authentication failed:', error)
            state.errorMessage = error?.response?.data?.message || 'Authentication failed'
            return false
        } finally {
            state.isLoading = false
        }
    }

    function startTablePolling(intervalMs = defaultPollIntervalMs, maxAttempts = defaultMaxPollAttempts) {
        if (state.isPollingForTable) return
        if (typeof window === 'undefined') {
            logger.warn('[DeviceStore] startTablePolling: window unavailable (SSR)')
            return
        }

        logger.debug('[DeviceStore] startTablePolling')
        state.isPollingForTable = true
        state.waitingForTable = true
        state.pollAttempts = 0
        state.maxPollAttempts = maxAttempts
        pollStartedAt = Date.now()

        pollTimerId = window.setInterval(async () => {
            state.pollAttempts += 1

            if (pollStartedAt && (Date.now() - pollStartedAt) > defaultMaxPollRuntimeMs) {
                logger.warn('[DeviceStore] table polling max runtime exceeded')
                stopTablePolling()
                return
            }

            try {
                const ok = state.token ? await refresh() : await authenticate()
                const t = state.table

                if (ok && t && (t.id || t.name)) {
                    state.waitingForTable = false
                    logger.debug('[DeviceStore] table assigned during polling', t)
                    stopTablePolling()
                    return
                }

                if (state.pollAttempts >= maxAttempts) {
                    logger.debug('[DeviceStore] table polling max attempts reached')
                    stopTablePolling()
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
        }, intervalMs) as unknown as number
    }

    const isAuthenticated = computed((): boolean => !!(state.token && state.table?.id))
    const hasDevice = computed((): boolean => !!state.token)
    const tableName = computed((): string | undefined => state.table?.name)

    async function register(formData: { code: string; name?: string }): Promise<void> {
        state.isLoading = true
        state.errorMessage = null

        try {
            const api = useApi()
            const payload: any = { ...formData }
            const response = await api.post('/api/devices/register', payload)
            applyAuthPayload(response.data)

            if (state.table) {
                state.waitingForTable = !(state.table.id || state.table.name)
            } else {
                state.waitingForTable = true
            }

            if (state.waitingForTable) {
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

            if (error?.response?.data?.errors) {
                state.errorMessage = error.response.data.errors
            } else if (error?.response?.data?.message) {
                state.errorMessage = error.response.data.message
            } else {
                state.errorMessage = error?.message || 'Registration failed'
            }

            throw error
        } finally {
            state.isLoading = false
        }
    }

    async function checkTableAssignment(): Promise<boolean> {
        if (!state.device && !state.token) return false
        logger.debug('[DeviceStore] checkTableAssignment running — device present?', !!state.device, 'token?', !!state.token)

        try {
            const ok = state.token ? await refresh() : await authenticate()
            const t = state.table
            if (ok && t && (t.id || t.name)) {
                state.waitingForTable = false
                return true
            }
            state.waitingForTable = true
            return false
        } catch (e) {
            logger.warn('[DeviceStore] checkTableAssignment failed', e)
            return false
        }
    }

    function clearAuth(): void {
        stopTablePolling()
        state.device = null
        state.token = null
        state.table = null
        state.expiration = null
        state.errorMessage = null
        state.lastAuthResponse = null
        state.lastServerIpUsed = null
        state.waitingForTable = false
    }

    function getDeviceId(): number | null { return state.device?.id ?? null }
    function getDeviceLastIpAddress(): string | undefined { return state.device?.last_ip_address }
    function getLastServerIpUsed(): string | null { return state.lastServerIpUsed }
    function getTableId(): number | null { return state.table?.id ?? null }
    function getTableName(): string | undefined { return state.table?.name }
    function getToken(): string | null { return state.token }
    function getTable(): Table | null { return state.table }

    function setToken(val: string | null) { state.token = val }
    function setTable(val: Table | null) { state.table = val }

    onScopeDispose(() => {
        stopTablePolling()
    })

    return {
        ...toRefs(state),
        isAuthenticated,
        hasDevice,
        tableName,
        authenticate,
        register,
        refresh,
        checkTableAssignment,
        startTablePolling,
        stopTablePolling,
            // Diagnostics
            lastAuthResponse,
            lastServerIpUsed,
            // Broadcasting config (server-provided)
            broadcastConfig,
        clearAuth,
        getDeviceId,
        getDeviceLastIpAddress,
        getLastServerIpUsed,
        getTableId,
        getTableName,
        getToken,
        getTable,
        setToken,
        setTable,
    }
}, {
    persist: {
        key: 'device-store',
        storage: typeof window !== 'undefined' ? localStorage : undefined,
        paths: ['device', 'token', 'expiration', 'table', 'broadcastConfig'],
    }
})
