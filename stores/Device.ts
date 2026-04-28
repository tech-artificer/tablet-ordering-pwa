import { defineStore } from "pinia"
import { computed, onScopeDispose, reactive, toRefs } from "vue"
import { useApi } from "../composables/useApi"
import { logger } from "../utils/logger"
import type { Device, Table } from "../types/index"

type BroadcastConfig = {
    key: string
    host: string
    port: number
    scheme: string
    authEndpoint: string
}

type DeviceStoreState = {
    device: Device | null
    table: Table | null
    token: string | null
    expiration: number | string | null
    isLoading: boolean
    errorMessage: string | null
    broadcastConfig: BroadcastConfig | null
    lastAuthResponse: any | null
    lastServerIpUsed: string | null
    waitingForTable: boolean
    isPollingForTable: boolean
    pollAttempts: number
    maxPollAttempts: number
    pollTimedOut: boolean
    kioskUnlocked: boolean
}

const defaultPollIntervalMs = 5000
const defaultMaxPollAttempts = 24
const defaultMaxPollRuntimeMs = 2 * 60 * 1000

function isIpv4Address (value: unknown): value is string {
    return typeof value === "string" && /^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)
}

function normalizeTable (tbl: unknown): Table | null {
    if (!tbl) { return null }

    if (typeof tbl === "string") {
        return {
            id: null as any,
            name: tbl,
            status: "unknown",
            is_available: false,
            is_locked: false,
        }
    }

    return tbl as Table
}

export const useDeviceStore = defineStore("device", () => {
    const state = reactive<DeviceStoreState>({
        device: null,
        table: null,
        token: null,
        expiration: null,
        isLoading: false,
        errorMessage: null,
        broadcastConfig: null,
        lastAuthResponse: null,
        lastServerIpUsed: null,
        waitingForTable: false,
        isPollingForTable: false,
        pollAttempts: 0,
        maxPollAttempts: defaultMaxPollAttempts,
        pollTimedOut: false,
        kioskUnlocked: false,
    })

    let pollTimerId: number | null = null
    let pollStartedAt: number | null = null
    let detectedClientIp: string | null | undefined
    let refreshTimerId: ReturnType<typeof setInterval> | null = null

    const REFRESH_INTERVAL_MS = 10 * 60 * 1000 // check every 10 min
    const REFRESH_THRESHOLD_MS = 15 * 60 * 1000 // refresh if expiry < 15 min away

    function parseExpiryMs (raw: number | string | null): number | null {
        if (!raw) { return null }
        if (typeof raw === "number") {
            return raw > 1e10 ? raw : raw * 1000
        }
        const parsed = Date.parse(raw)
        return isNaN(parsed) ? null : parsed
    }

    function startRefreshTimer () {
        if (refreshTimerId !== null) { return }
        refreshTimerId = setInterval(async () => {
            if (!state.token) { return }
            const expiryMs = parseExpiryMs(state.expiration)
            if (expiryMs !== null && expiryMs - Date.now() <= REFRESH_THRESHOLD_MS) {
                logger.info("[DeviceStore] Token nearing expiry; proactive refresh")
                await refresh()
            }
        }, REFRESH_INTERVAL_MS)
    }

    function stopRefreshTimer () {
        if (refreshTimerId !== null) {
            clearInterval(refreshTimerId)
            refreshTimerId = null
        }
    }

    async function resolveClientIpForAuth (): Promise<string | null> {
        const stateDevice = state.device as (Device & { ip_address?: string; last_ip_address?: string }) | null

        const knownCandidates = [
            stateDevice?.ip_address,
            stateDevice?.last_ip_address,
            state.lastServerIpUsed,
        ]

        for (const candidate of knownCandidates) {
            if (isIpv4Address(candidate)) {
                return candidate
            }
        }

        if (detectedClientIp !== undefined) {
            return detectedClientIp
        }

        try {
            const { getLocalIp } = await import("~/utils/getLocalIp")
            const localIp = await getLocalIp()
            if (isIpv4Address(localIp)) {
                detectedClientIp = localIp
                return localIp
            }
        } catch (error) {
            logger.debug("[DeviceStore] resolveClientIpForAuth: getLocalIp failed", error)
        }

        detectedClientIp = null
        return null
    }

    function applyBroadcastConfig (responseData: any) {
        const bc = responseData?.broadcasting
        if (!bc?.key) { return }

        const rawPort = Number(bc.port ?? 0)
        state.broadcastConfig = {
            key: String(bc.key),
            host: String(bc.host ?? ""),
            port: (rawPort === 8080 || rawPort === 6001) ? 0 : rawPort,
            scheme: String(bc.scheme ?? "http"),
            authEndpoint: String(bc.auth_endpoint ?? "/broadcasting/auth"),
        }

        if (typeof window !== "undefined" && typeof (window as any).initEcho === "function") {
            ;(window as any).initEcho(state.broadcastConfig, state.token)
        }
    }

    function applyAuthPayload (payload: any) {
        const authToken = payload?.token
        const authDevice = payload?.device
        const authTable = payload?.table
        const expiresAt = payload?.expires_at
        const ipUsedFromServer = payload?.ip_used

        state.lastAuthResponse = payload ?? null
        if (ipUsedFromServer) {
            state.lastServerIpUsed = String(ipUsedFromServer)
        }

        if (authDevice) {
            const normalizedDevice = { ...(authDevice as Device) } as Device & { ip_address?: string }
            if (state.lastServerIpUsed) {
                normalizedDevice.ip_address = state.lastServerIpUsed
            }
            state.device = normalizedDevice as Device
        }

        if (authToken) {
            state.token = String(authToken)
            try {
                if (typeof window !== "undefined" && typeof (window as any).updateEchoAuth === "function") {
                    ;(window as any).updateEchoAuth(state.token)
                }
            } catch (error) {
                logger.debug("[DeviceStore] updateEchoAuth not available", error)
            }
        }

        if (expiresAt) {
            state.expiration = expiresAt
        }

        if (authTable !== undefined) {
            state.table = normalizeTable(authTable)
        }

        applyBroadcastConfig(payload)
    }

    function syncWaitingForTable () {
        state.waitingForTable = !(state.table?.id || state.table?.name)
    }

    function stopTablePolling () {
        if (pollTimerId) {
            try {
                clearInterval(pollTimerId)
            } catch (error) {
                logger.debug("[DeviceStore] stopTablePolling: clearInterval failed", error)
            }
            pollTimerId = null
        }

        pollStartedAt = null
        state.isPollingForTable = false
        state.pollAttempts = 0
    }

    async function refresh (): Promise<boolean> {
        state.isLoading = true
        state.errorMessage = null

        try {
            const api = useApi()
            const response = await api.post("/api/devices/refresh")
            applyAuthPayload(response.data)
            syncWaitingForTable()
            return Boolean(state.token)
        } catch (error: any) {
            logger.error("[DeviceStore] Token refresh failed:", error)
            state.errorMessage = error?.response?.data?.message || "Token refresh failed"
            return false
        } finally {
            state.isLoading = false
        }
    }

    async function authenticate (clientIp?: string | null): Promise<boolean> {
        state.isLoading = true
        state.errorMessage = null

        try {
            const api = useApi()
            const resolvedIp = (clientIp !== undefined && clientIp !== null) ? clientIp : await resolveClientIpForAuth()
            const authStart = typeof performance !== "undefined" ? performance.now() : Date.now()
            const params = resolvedIp ? { ip_address: resolvedIp, ip: resolvedIp } : undefined
            const response = params
                ? await api.get("/api/devices/login", { params })
                : await api.get("/api/devices/login")
            applyAuthPayload(response.data)
            syncWaitingForTable()

            if (state.device && state.token && state.table) {
                const authEnd = typeof performance !== "undefined" ? performance.now() : Date.now()
                const authMs = (authEnd - authStart).toFixed(1)
                logger.info(`[Device] Authenticated device_id=${state.device.id} table_id=${state.table?.id} table_name=${state.table?.name} latency=${authMs}ms at ${new Date().toISOString()}`)
                logger.info(`[Device] Authenticated as device_id=${state.device.id}`)
                state.waitingForTable = false
                return true
            }

            logger.warn(`[Device] Auth failed: incomplete response at ${new Date().toISOString()}`)
            return false
        } catch (error: any) {
            logger.error(`[Device] Auth error ${error?.message} at ${new Date().toISOString()}`)
            logger.error("[DeviceStore] Authentication failed:", error)
            state.errorMessage = error?.response?.data?.message || error?.response?.data?.error || "Authentication failed"
            return false
        } finally {
            state.isLoading = false
        }
    }

    function startTablePolling (intervalMs = defaultPollIntervalMs, maxAttempts = defaultMaxPollAttempts) {
        if (state.isPollingForTable) { return }
        if (typeof window === "undefined") {
            logger.warn("[DeviceStore] startTablePolling: window unavailable (SSR)")
            return
        }

        state.isPollingForTable = true
        state.waitingForTable = true
        state.pollAttempts = 0
        state.maxPollAttempts = maxAttempts
        state.pollTimedOut = false
        pollStartedAt = Date.now()

        pollTimerId = window.setInterval(async () => {
            state.pollAttempts += 1

            if (pollStartedAt && Date.now() - pollStartedAt > defaultMaxPollRuntimeMs) {
                logger.warn("[DeviceStore] table polling max runtime exceeded")
                state.pollTimedOut = true
                stopTablePolling()
                return
            }

            try {
                const ok = state.token ? await refresh() : await authenticate()
                if (ok && state.table && (state.table.id || state.table.name)) {
                    state.waitingForTable = false
                    logger.debug("[DeviceStore] table assigned during polling", state.table)
                    stopTablePolling()
                    return
                }

                if (state.pollAttempts >= maxAttempts) {
                    logger.debug("[DeviceStore] table polling max attempts reached")
                    state.pollTimedOut = true
                    stopTablePolling()
                }
            } catch (error) {
                logger.error("[DeviceStore] table polling error", { error })
            }
        }, intervalMs) as unknown as number
    }

    async function register (formData: { passcode?: string; security_code?: string; name?: string; ip_address?: string }): Promise<void> {
        state.isLoading = true
        state.errorMessage = null

        // Primary contract: security_code. Keep input aliases but normalize the
        // outgoing payload so the setup code is never retained as login state.
        const payload: any = {}
        const normalizedSecurityCode = String(formData.security_code ?? formData.passcode ?? "").trim()

        if (normalizedSecurityCode) {
            payload.security_code = normalizedSecurityCode
        }

        const formIp = formData.ip_address
        const fallbackIp = await resolveClientIpForAuth()
        const ipToUse = isIpv4Address(formIp) ? formIp : fallbackIp

        if (ipToUse) {
            payload.ip_address = ipToUse
            // Backward-compat for backend variants still reading `ip`
            payload.ip = ipToUse
        }
        if (formData.ip_address) {
            payload.ip_address = formData.ip_address
        }

        if (formData.name) {
            payload.name = formData.name
        }

        try {
            const api = useApi()
            const response = await api.post("/api/devices/register", payload)
            applyAuthPayload(response.data)
            syncWaitingForTable()

            if (state.waitingForTable) {
                startTablePolling()
            }
        } catch (error: any) {
            logger.error("[DeviceStore] Registration failed:", error)

            const responseData = error?.response?.data
            if (responseData && (responseData.device || responseData.token || responseData.success)) {
                state.lastAuthResponse = responseData
                if (responseData?.ip_used) {
                    state.lastServerIpUsed = String(responseData.ip_used)
                }
                if (responseData.device) {
                    state.device = responseData.device as Device
                }
                if (responseData.token) {
                    state.token = String(responseData.token)
                }
                if (responseData.table !== undefined) {
                    state.table = normalizeTable(responseData.table)
                }
                syncWaitingForTable()
                applyBroadcastConfig(responseData)
                state.errorMessage = "Device was registered on the server; waiting for table assignment. Use \"Check for Table\" in Settings."
                return
            }

            if (responseData?.errors) {
                state.errorMessage = responseData.errors
            } else if (responseData?.message) {
                state.errorMessage = responseData.message
            } else {
                state.errorMessage = error?.message || "Registration failed"
            }

            throw error
        } finally {
            state.isLoading = false
        }
    }

    async function checkTableAssignment (): Promise<boolean> {
        if (!state.device && !state.token) { return false }

        try {
            const ok = state.token ? await refresh() : await authenticate()
            if (ok && state.table && (state.table.id || state.table.name)) {
                state.waitingForTable = false
                return true
            }

            state.waitingForTable = true
            return false
        } catch (error) {
            logger.warn("[DeviceStore] checkTableAssignment failed", error)
            return false
        }
    }

    function clearAuth (): void {
        stopTablePolling()
        state.device = null
        state.table = null
        state.token = null
        state.expiration = null
        state.errorMessage = null
        state.broadcastConfig = null
        state.lastAuthResponse = null
        state.lastServerIpUsed = null
        state.waitingForTable = false
        state.pollTimedOut = false
    }

    function getDeviceId (): number | null { return state.device?.id ?? null }
    function getDeviceLastIpAddress (): string | undefined { return (state.device as any)?.last_ip_address }
    function getLastServerIpUsed (): string | null { return state.lastServerIpUsed }
    function getTableId (): number | null { return state.table?.id ?? null }
    function getTableName (): string | undefined { return state.table?.name }
    function getToken (): string | null { return state.token }
    function getTable (): Table | null { return state.table }

    function clearLastAuthResponse () { state.lastAuthResponse = null }
    function setToken (value: string | null) { state.token = value }
    function setTable (value: Table | null) {
        state.table = value
        syncWaitingForTable()
    }
    function setKioskUnlocked (value: boolean) { state.kioskUnlocked = value }
    function getKioskUnlocked (): boolean { return state.kioskUnlocked }
    function clearError () { state.errorMessage = null }
    function setWaitingForTable (value: boolean) {
        state.waitingForTable = value
        if (!value) {
            state.pollTimedOut = false
        }
    }

    const isAuthenticated = computed(() => Boolean(state.token && state.table?.id))
    const hasDevice = computed(() => Boolean(state.token))
    const tableName = computed(() => state.table?.name)

    onScopeDispose(() => {
        stopTablePolling()
        stopRefreshTimer()
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
        clearAuth,
        getDeviceId,
        getDeviceLastIpAddress,
        getLastServerIpUsed,
        getTableId,
        getTableName,
        getToken,
        getTable,
        getKioskUnlocked,
        clearLastAuthResponse,
        setToken,
        setTable,
        setKioskUnlocked,
        startRefreshTimer,
        stopRefreshTimer,
        clearError,
        setWaitingForTable,
    }
}, {
    persist: {
        key: "device-store",
        storage: typeof window !== "undefined" ? localStorage : undefined,
        paths: ["device", "token", "expiration", "table", "broadcastConfig", "kioskUnlocked"],
    },
})
