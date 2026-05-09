<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
import { ElMessageBox, ElNotification } from "element-plus"
import { useDeviceStore } from "../stores/Device"
import { logger } from "../utils/logger"
import { useKioskFullscreen } from "~/composables/useKioskFullscreen"

// @ts-ignore - Nuxt auto-imports
definePageMeta({
    layout: "default"
})

const deviceStore = useDeviceStore()
const config = useRuntimeConfig()
const router = useRouter()

const SETTINGS_PIN_AUTH_KEY = "settings.pin.auth_until"
const SETTINGS_PIN_HIDDEN_AT_KEY = "settings.pin.hidden_at"
const SETTINGS_PIN_MAX_BACKGROUND_MS = computed(() => {
    const raw = Number(config.public.settingsPinBackgroundTimeoutMs)
    if (!Number.isFinite(raw) || raw <= 0) { return 2 * 60 * 1000 }
    return raw
})

const clearSettingsPinAuth = () => {
    if (typeof sessionStorage === "undefined") { return }
    sessionStorage.removeItem(SETTINGS_PIN_AUTH_KEY)
    sessionStorage.removeItem(SETTINGS_PIN_HIDDEN_AT_KEY)
}

const hasValidSettingsPinAuth = () => {
    if (typeof sessionStorage === "undefined") { return false }
    const raw = sessionStorage.getItem(SETTINGS_PIN_AUTH_KEY)
    const authUntil = Number(raw || 0)
    return Number.isFinite(authUntil) && authUntil > Date.now()
}

const enforceSettingsPinGate = async () => {
    if (hasValidSettingsPinAuth()) { return true }
    clearSettingsPinAuth()
    await router.replace({ path: "/", query: { settingsLocked: "1" } })
    return false
}

const handleSettingsVisibilityChange = () => {
    if (typeof document === "undefined" || typeof sessionStorage === "undefined") { return }

    if (document.hidden) {
        sessionStorage.setItem(SETTINGS_PIN_HIDDEN_AT_KEY, String(Date.now()))
        return
    }

    const hiddenAt = Number(sessionStorage.getItem(SETTINGS_PIN_HIDDEN_AT_KEY) || 0)
    if (!hiddenAt) { return }

    const elapsed = Date.now() - hiddenAt
    sessionStorage.removeItem(SETTINGS_PIN_HIDDEN_AT_KEY)

    if (elapsed >= SETTINGS_PIN_MAX_BACKGROUND_MS.value) {
        clearSettingsPinAuth()
        router.replace({ path: "/", query: { settingsLocked: "1" } }).catch((error) => {
            logger.debug("[Settings] settings PIN redirect failed", error)
        })
    }
}

// Settings state
const normalizeApiOrigin = (value: string) => {
    const trimmed = String(value || "").trim().replace(/\/+$/, "")
    return trimmed.replace(/\/api$/i, "")
}

const apiUrl = ref(normalizeApiOrigin(String(config.public.apiBaseUrl || "")))
const localIpAddress = ref("Loading...")
const isVerifyingToken = ref(false)
const isRefreshingToken = ref(false)
const isLoggingIn = ref(false)
const tokenStatus = ref<"valid" | "invalid" | "unknown">("unknown")
const tokenMessage = ref("")

// No local banner — use Element Plus notification on successful registration

// Backend diagnostic state
const isTestingBackend = ref(false)
const testOrderPayload = ref<any>(null)
const testOrderResponse = ref<any>(null)
const testOrderError = ref("")
const showDiagnostics = ref(false)

// Display helpers: support both Ref<T> (store before/after persist) and plain objects
const displayDevice = computed(() => {
    // deviceStore.device may be a Ref or a plain object depending on rehydration
    return (deviceStore.device && (deviceStore.device as any).value) ? (deviceStore.device as any).value : (deviceStore.device as any)
})

const displayTable = computed(() => {
    return (deviceStore.table && (deviceStore.table as any).value) ? (deviceStore.table as any).value : (deviceStore.table as any)
})

const displayDeviceId = computed(() => displayDevice.value?.id ?? "Not registered")
const displayDeviceCode = computed(() => displayDevice.value?.security_code ?? displayDevice.value?.device_uuid ?? "N/A")
const displayIpAddress = computed(() => displayDevice.value?.ip_address ?? localIpAddress.value ?? "—")
const displayTableName = computed(() => displayTable.value?.name ?? deviceStore.tableName ?? "")
const displayIsAdmin = computed(() => !!(displayDevice.value && displayDevice.value.is_admin))
const buildTime = computed(() => String(config.public.buildTime || "unknown"))
const buildTimeDisplay = computed(() => {
    const timestamp = Date.parse(buildTime.value)
    if (Number.isNaN(timestamp)) { return buildTime.value }
    return new Date(timestamp).toISOString()
})

// Collapsible sections state (persisted to localStorage)
const STORAGE_KEY = "settings.collapsed"
const collapsed = reactive({
    registration: false,
    deviceInfo: false,
    authentication: false,
    apiConfig: false,
    buildInfo: false,
    display: false,
    diagnostics: false
})

const toggle = (key: keyof typeof collapsed) => { collapsed[key] = !collapsed[key] }

// Restore persisted collapsed state
onMounted(() => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) {
            const parsed = JSON.parse(raw)
            Object.keys(parsed || {}).forEach((k) => {
                if (k in collapsed) { (collapsed as any)[k] = parsed[k] }
            })
        }
    } catch (e) {
    // ignore
    }
    // Always show registration when device is not fully authenticated
    if (!deviceStore.isAuthenticated) {
        collapsed.registration = false
    }
})

// Persist when collapsed changes
watch(collapsed, (val) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
    // ignore
    }
}, { deep: true })

/** Minimal IPv4 check — avoids importing private isIpv4Address from Device store. */
const isValidIpv4 = (v: unknown): v is string =>
    typeof v === "string" && /^(\d{1,3}\.){3}\d{1,3}$/.test(v)

// Get local IP address
const getLocalIpAddress = async () => {
    try {
        // 1. Use stored IP from authenticated device (most reliable).
        if (isValidIpv4(displayDevice.value?.last_ip_address)) {
            localIpAddress.value = displayDevice.value!.last_ip_address!
            return
        }

        // 2. WebRTC ICE candidate detection (works without network round-trip).
        try {
            const { getLocalIp } = await import("~/utils/getLocalIp")
            const ip = await getLocalIp()
            if (isValidIpv4(ip)) {
                localIpAddress.value = ip
                return
            }
        } catch (e) {
            logger.warn("[Settings] WebRTC local IP detection failed:", e)
        }

        // 3. Server-side detection fallback: ask the API what IP it sees for this request.
        //    Requires nginx to forward X-Forwarded-For to PHP-FPM (now configured).
        try {
            const { useApi } = await import("~/composables/useApi")
            const api = useApi()
            const res = await api.get("/api/device/ip")
            const serverIp = res?.data?.ip
            if (isValidIpv4(serverIp)) {
                localIpAddress.value = serverIp
                return
            }
        } catch (e) {
            logger.warn("[Settings] /api/device/ip server-side fallback failed:", e)
        }

        localIpAddress.value = "Unable to detect"
    } catch (error) {
        localIpAddress.value = "Unable to detect"
    }
}

// Fullscreen helpers
const { isFullscreen, adminUnlock, adminLock } = useKioskFullscreen()
const startInFullscreen = ref(false)

// Helper to copy text to clipboard (safe for template use)
const copyToClipboard = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text)
    }
}

// Helper to save fullscreen preference
const saveFullscreenPreference = (value: boolean) => {
    if (typeof localStorage !== "undefined") {
        localStorage.setItem("START_FULLSCREEN", value ? "true" : "false")
    }
}

const toggleFullscreen = async () => {
    try {
        if (!isFullscreen.value) {
            await adminLock(deviceStore)
            startInFullscreen.value = true
            saveFullscreenPreference(true)
        } else {
            await adminUnlock(deviceStore)
            startInFullscreen.value = false
            saveFullscreenPreference(false)
        }
    } catch (err) {
        logger.warn("Fullscreen toggle failed", err)
    }
}

onMounted(() => {
    try {
        const v = localStorage.getItem("START_FULLSCREEN")
        startInFullscreen.value = v !== "false"
    } catch (e) {
    // ignore storage errors
    }

    if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", handleSettingsVisibilityChange)
    }
})

onBeforeUnmount(() => {
    if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleSettingsVisibilityChange)
    }
})

// Try to resolve device & table by local IP. Server may accept POST or GET for this helper.
const fetchDeviceByIp = async (ip: string | null) => {
    if (!isValidIpv4(ip)) { return false } // guard: never send non-IP strings to the API
    try {
        const { useApi } = await import("~/composables/useApi")
        const api = useApi()

        // Prefer POST body lookup (some deployments register this route as POST).
        try {
            const res = await api.post("/api/device/table", { ip })
            if (res && res.data && res.data.success) {
                if (res.data.device) { deviceStore.device = res.data.device }
                if (res.data.table) { deviceStore.table = res.data.table }
                return true
            }
        } catch (err: any) {
            // If server rejects POST with 405, try GET fallback below
            if (err?.response?.status && err.response.status !== 405) {
                logger.warn("[Settings] POST /api/device/table failed:", err)
            }
        }

        // Fallback to GET (some servers expose GET /api/device/table)
        try {
            const res2 = await api.get("/api/device/table", { params: { ip } })
            if (res2 && res2.data && res2.data.success) {
                if (res2.data.device) { deviceStore.device = res2.data.device }
                if (res2.data.table) { deviceStore.table = res2.data.table }
                return true
            }
        } catch (err2: any) {
            logger.warn("[Settings] GET /api/device/table fallback failed:", err2)
        }
    } catch (error) {
        logger.warn("[Settings] fetchDeviceByIp unexpected error:", error)
    }
    return false
}

// Save API URL
const saveApiUrl = async () => {
    try {
        await ElMessageBox.confirm(
            "Changing the API URL requires app restart. Continue?",
            "Warning",
            {
                confirmButtonText: "OK",
                cancelButtonText: "Cancel",
                type: "warning",
            }
        )

        // Save normalized origin to localStorage
        localStorage.setItem("NUXT_PUBLIC_MAIN_API_URL", normalizeApiOrigin(String(apiUrl.value)))

        // ElMessage.success('API URL saved. Please restart the app.')

        // Reload after 2 seconds
        setTimeout(() => {
            window.location.reload()
        }, 2000)
    } catch (e) {
        logger.debug("[Settings] saveApiUrl canceled or failed", e)
    }
}

// Reset API URL to default
const resetApiUrl = () => {
    apiUrl.value = normalizeApiOrigin(String(config.public.apiBaseUrl || ""))
    localStorage.removeItem("NUXT_PUBLIC_MAIN_API_URL")
    // ElMessage.info('API URL reset to default')
}

// Test API connection
const testConnection = async () => {
    try {
        const normalizedOrigin = normalizeApiOrigin(String(apiUrl.value))
        const response = await fetch(`${normalizedOrigin}/api/health`)
        if (response.ok) {
            // ElMessage.success('API connection successful!')
        } else {
            // ElMessage.error('API responded but with an error')
        }
    } catch (error) {
    // ElMessage.error('Failed to connect to API')
    }
}

// Verify authentication token
const verifyToken = async () => {
    if (!deviceStore.token) {
        tokenStatus.value = "invalid"
        tokenMessage.value = "No token found. Please authenticate device."
        return
    }

    isVerifyingToken.value = true
    tokenStatus.value = "unknown"
    tokenMessage.value = "Verifying..."

    try {
        const { useApi } = await import("~/composables/useApi")
        const api = useApi()

        const response = await api.get("/api/token/verify")

        logger.debug("Token verification response:", response.data)

        // Check if backend returned success: false (authentication failed)
        if (response.data?.success === false) {
            tokenStatus.value = "invalid"
            tokenMessage.value = response.data?.debug?.message || "Authentication failed on server"
            logger.error("❌ Token verification failed:", response.data)
            return
        }

        // Token is valid
        if (response.data) {
            tokenStatus.value = "valid"
            tokenMessage.value = `Token valid for Device #${response.data.tokenable_id || response.data.device?.id}`
            logger.debug("✅ Token verification successful:", response.data)
        }
    } catch (error: any) {
        tokenStatus.value = "invalid"
        logger.error("❌ Token verification failed:", error)

        if (error.response?.status === 401) {
            tokenMessage.value = "Token is invalid or expired (401)"
        } else if (error.response?.data?.exception === "authentication") {
            tokenMessage.value = `Authentication error: ${error.response?.data?.debug?.message || "Unknown"}`
        } else {
            tokenMessage.value = error.message || "Verification failed"
        }
    } finally {
        isVerifyingToken.value = false
    }
}

// Refresh authentication token
const refreshToken = async () => {
    if (!deviceStore.device?.value?.id) {
        tokenMessage.value = "No device registered"
        return
    }

    isRefreshingToken.value = true
    tokenStatus.value = "unknown"
    tokenMessage.value = "Refreshing token..."

    try {
        await deviceStore.refresh()
        tokenStatus.value = "valid"
        tokenMessage.value = "Token refreshed successfully!"
        logger.debug("✅ Token refreshed")
    } catch (error: any) {
        tokenStatus.value = "invalid"
        tokenMessage.value = error.message || "Token refresh failed"
        logger.error("❌ Token refresh failed:", error)
    } finally {
        isRefreshingToken.value = false
    }
}

// Device login/authentication (IP-only)
const authenticateDevice = async () => {
    isLoggingIn.value = true
    try {
        const clientIp = String(displayDevice.value?.last_ip_address || localIpAddress.value || "").trim()
        const success = await deviceStore.authenticate(clientIp || undefined)
        if (success) {
            tokenStatus.value = "valid"
            tokenMessage.value = "Device authenticated successfully"
            logger.debug("✅ Device authenticated via IP")
        } else {
            tokenStatus.value = "invalid"
            tokenMessage.value = "Device not registered or authentication failed"
            logger.warn("Authentication returned no device")
        }
    } catch (err: any) {
        tokenStatus.value = "invalid"
        tokenMessage.value = err?.message || "Authentication failed"
        logger.error("❌ Authentication error", err)
    } finally {
        isLoggingIn.value = false
    }
}

// PIN modal removed - now handled on home page (index.vue)

const logout = async () => {
    try {
        await ElMessageBox.confirm(
            "This will clear device authentication. Continue?",
            "Logout",
            {
                confirmButtonText: "Logout",
                cancelButtonText: "Cancel",
                type: "warning",
            }
        )

        deviceStore.clearAuth()
        tokenStatus.value = "invalid"
        tokenMessage.value = "Device logged out"
        logger.debug("✅ Device logged out")
    } catch (e) {
        logger.debug("[Settings] logout canceled or failed", e)
    }
}

// Local table override state and save helper
const editingTable = ref(false)
const tableOverride = ref("")
const isSavingTable = ref(false)

const saveTableOverride = async () => {
    if (!tableOverride.value) { return }
    isSavingTable.value = true

    try {
    // If device is registered on backend, attempt to persist the table assignment
        if (displayDevice.value?.id) {
            const { useApi } = await import("~/composables/useApi")
            const api = useApi()
            // Attempt to update device's table by PUT /api/devices/{id}
            // UpdateDeviceRequest requires: name (required), ip_address (required), table_id (nullable)
            const asNum = Number(tableOverride.value)
            const payload: any = {
                name: displayDevice.value?.name || "",
                ip_address: displayDevice.value?.ip_address || "",
                port: (displayDevice.value as any)?.port ?? null,
            }

            if (!Number.isNaN(asNum) && asNum > 0) {
                payload.table_id = asNum
            }

            try {
                const resp = await api.put(`/api/devices/${displayDevice.value.id}`, payload)
                if (resp?.data) {
                    // Update local store with returned device/table if provided
                    if (resp.data.device) { deviceStore.device = resp.data.device }
                    if (resp.data.table) { deviceStore.table = resp.data.table }
                }
            } catch (err) {
                logger.warn("Persisting table override failed:", err)
                // Even if persistence fails, update local UI so staff can continue
                deviceStore.table = { id: asNum > 0 ? asNum : null, name: tableOverride.value } as any
            }
        } else {
            // Not registered: just update local store for immediate effect
            deviceStore.table = { id: null, name: tableOverride.value } as any
        }

        editingTable.value = false
        tableOverride.value = ""
    } finally {
        isSavingTable.value = false
    }
}

// Test backend order creation
const testBackendOrder = async () => {
    if (!deviceStore.token) {
        testOrderError.value = "No authentication token. Please login first."
        return
    }

    isTestingBackend.value = true
    testOrderError.value = ""
    testOrderResponse.value = null

    // Build minimal test payload
    const payload = {
        guest_count: 2,
        subtotal: 100.00,
        tax: 10.00,
        discount: 0,
        total_amount: 110.00,
        items: [
            {
                menu_id: 1,
                ordered_menu_id: null,
                name: "Test Item",
                quantity: 1,
                price: 50.00,
                note: "Test order from diagnostics",
                subtotal: 50.00,
                tax: 5.00,
                discount: 0
            },
            {
                menu_id: 2,
                ordered_menu_id: null,
                name: "Test Item 2",
                quantity: 1,
                price: 50.00,
                note: null,
                subtotal: 50.00,
                tax: 5.00,
                discount: 0
            }
        ]
    }

    testOrderPayload.value = payload

    try {
        const { useApi } = await import("~/composables/useApi")
        const api = useApi()

        logger.debug("🧪 Testing backend order creation...")
        logger.debug("📦 Payload:", JSON.stringify(payload, null, 2))

        const response = await api.post("/api/devices/create-order", payload)

        logger.debug("✅ Backend test SUCCESS:", response.data)
        testOrderResponse.value = response.data
        testOrderError.value = ""
    } catch (error: any) {
        logger.error("❌ Backend test FAILED:", error)

        const errorDetails = {
            message: error.message,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            headers: error.response?.headers,
            fullError: error
        }

        testOrderResponse.value = errorDetails

        // Build detailed error message
        let errorMsg = `HTTP ${error.response?.status || "ERROR"}: ${error.message}\n\n`

        if (error.response?.status === 500) {
            errorMsg += "🔴 SERVER ERROR (500)\n"
            errorMsg += "The Laravel backend crashed when processing this request.\n\n"
            errorMsg += "📋 Next Steps:\n"
            errorMsg += "1. Check Laravel logs: storage/logs/laravel.log\n"
            errorMsg += "2. Enable debug mode: Set APP_DEBUG=true in .env\n"
            errorMsg += "3. Check database connection and migrations\n"
            errorMsg += "4. Verify OrderService and DeviceOrderApiController\n\n"
            errorMsg += `Response data: ${JSON.stringify(error.response?.data, null, 2)}\n`
        } else if (error.response?.status === 401) {
            errorMsg += "🔐 AUTHENTICATION ERROR\n"
            errorMsg += "Token is invalid or expired.\n"
        } else if (error.response?.status === 422) {
            errorMsg += "📝 VALIDATION ERROR\n"
            errorMsg += JSON.stringify(error.response?.data?.errors, null, 2)
        } else {
            errorMsg += JSON.stringify(errorDetails, null, 2)
        }

        testOrderError.value = errorMsg
    } finally {
        isTestingBackend.value = false
    }
}

onMounted(async () => {
    if (!(await enforceSettingsPinGate())) { return }

    await getLocalIpAddress()

    // After detecting local IP, attempt to resolve device/table.
    // fetchDeviceByIp validates the IP itself — only sends if it's a real IPv4 address.
    try {
        const ip = (deviceStore.device?.value?.last_ip_address) || localIpAddress.value
        const lookedUp = await fetchDeviceByIp(isValidIpv4(ip) ? ip : null)
        if (!lookedUp) {
            tokenMessage.value = "Register this tablet with the setup code above."
        }

    // If after lookup/auth there is no authenticated device, the registration UI will be
    // available on this Settings page (rendered when unauthenticated).
    } catch (e) {
        logger.warn("[Settings] device/table lookup fallback error", e)
    }

    // Watch for device authentication: show a transient Element Plus notification when device becomes authenticated
    try {
        watch(() => deviceStore.isAuthenticated, (newVal, oldVal) => {
            if (newVal && !oldVal) {
                try {
                    ElNotification({
                        title: "Device Registered",
                        message: "✅ Device registered successfully — you can now continue.",
                        type: "success",
                        duration: 3000
                    })
                } catch (e) {
                    // Fallback: no-op
                }
            }
        })
    } catch (e) {
    // ignore if watch is not available in this runtime (unlikely)
    }

    // Load saved API URL if exists
    const savedApiUrl = localStorage.getItem("NUXT_PUBLIC_MAIN_API_URL")
    if (savedApiUrl) {
        apiUrl.value = normalizeApiOrigin(savedApiUrl)
    }
})
</script>

<template>
    <div class="h-screen overflow-y-auto bg-app-grid text-white p-6">
        <div class="max-w-4xl mx-auto pb-12">
            <!-- Header -->
            <div class="mb-8 flex items-center justify-between gap-4">
                <div>
                    <h1 class="text-4xl font-bold mb-2">
                        ⚙️ Settings
                    </h1>
                    <p class="text-white/60">
                        Configure device and connection settings
                    </p>
                </div>
                <div>
                    <NuxtLink
                        to="/"
                        class="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 active:scale-95 transition-all font-semibold"
                    >
                        ← Back to Home
                    </NuxtLink>
                </div>
            </div>

            <!-- Device Registration (always visible) -->
            <div class="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
                <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <div class="flex items-center gap-2">
                        <span>🛠️</span>
                        <span>Device Registration</span>
                    </div>
                </h2>

                <div class="space-y-4">
                    <DeviceRegistration inline />
                    <div v-if="deviceStore.isAuthenticated" class="p-4 bg-white/5 rounded-lg border border-white/10">
                        <p class="text-sm text-white/60">
                            Already registered? You can still use <span class="text-white">Re-register</span> above if this tablet needs a new setup code.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Registration success notification will appear via Element Plus -->

            <!-- Device Information -->
            <div class="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
                <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2 justify-between">
                    <div class="flex items-center gap-2">
                        <span>📱</span>
                        <span>Device Information</span>
                    </div>
                    <button class="text-sm text-white/60" aria-label="Toggle Device Information" @click.prevent="toggle('deviceInfo')">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-4 h-4 transition-transform duration-150"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            :style="{ transform: collapsed.deviceInfo ? 'rotate(0deg)' : 'rotate(90deg)' }"
                        >
                            <path fill-rule="evenodd" d="M6.293 4.293a1 1 0 011.414 0L13.414 10l-5.707 5.707a1 1 0 01-1.414-1.414L10.586 10 6.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </h2>

                <div v-show="!collapsed.deviceInfo" class="space-y-4">
                    <!-- Device ID -->
                    <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div>
                            <label class="text-sm text-white/50 block mb-1">Device ID</label>
                            <span class="font-mono text-lg">{{ displayDeviceId }}</span>
                        </div>
                    </div>

                    <!-- Device Code -->
                    <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div>
                            <label class="text-sm text-white/50 block mb-1">Device Code</label>
                            <span class="font-mono text-lg">{{ displayDeviceCode }}</span>
                        </div>
                    </div>

                    <!-- IP Address -->
                    <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div>
                            <label class="text-sm text-white/50 block mb-1">IP Address</label>
                            <span class="font-mono text-lg">{{ displayIpAddress }}</span>
                        </div>
                    </div>

                    <!-- IP Diagnostics -->
                    <div class="p-4 bg-white/5 rounded-lg border border-white/10">
                        <label class="text-sm text-white/50 block mb-2">IP Diagnostics</label>
                        <div class="text-sm text-white/60 space-y-1">
                            <div class="flex items-center justify-between">
                                <span>Detected Client IP</span>
                                <span class="font-mono">{{ localIpAddress }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span>Server Device IP (device.last_ip_address)</span>
                                <span class="font-mono">{{ deviceStore.device?.value?.last_ip_address || '—' }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span>Last server ip_used</span>
                                <span class="font-mono">{{ deviceStore.lastServerIpUsed ?? '—' }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Raw registration response (diagnostics) -->
                    <div v-if="deviceStore.lastAuthResponse" class="p-4 bg-white/5 rounded-lg border border-white/10">
                        <label class="text-sm text-white/50 block mb-2">Last Registration Response</label>
                        <div class="flex items-start gap-3">
                            <pre class="text-xs text-white/40 whitespace-pre-wrap font-mono overflow-x-auto flex-1">{{ JSON.stringify(deviceStore.lastAuthResponse, null, 2) }}</pre>
                            <div class="flex flex-col gap-2">
                                <button class="px-3 py-2 rounded bg-primary/20" @click="copyToClipboard(JSON.stringify(deviceStore.lastAuthResponse, null, 2))">
                                    Copy
                                </button>
                                <button class="px-3 py-2 rounded bg-white/10" @click="deviceStore.lastAuthResponse = null">
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Table Assignment -->
                    <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div>
                            <label class="text-sm text-white/50 block mb-1">Assigned Table</label>
                            <div class="flex items-center gap-3">
                                <span class="font-mono text-lg">{{ displayTableName }}</span>
                                <button v-if="displayIsAdmin" class="px-2 py-1 text-xs bg-white/5 rounded" @click="editingTable = !editingTable">
                                    {{ editingTable ? 'Cancel' : 'Edit' }}
                                </button>
                            </div>
                            <div v-if="editingTable" class="mt-3 flex gap-2">
                                <input v-model="tableOverride" placeholder="Table name or id" class="px-3 py-2 rounded bg-white/5 w-48">
                                <button :disabled="isSavingTable" class="px-3 py-2 rounded bg-primary/20" @click="saveTableOverride()">
                                    {{ isSavingTable ? 'Saving...' : 'Save' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Authentication & Token Management -->
            <div class="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
                <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2 justify-between">
                    <div class="flex items-center gap-2">
                        <span>🔐</span>
                        <span>Authentication</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <button class="text-sm text-white/60" aria-label="Toggle Authentication" @click.prevent="toggle('authentication')">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="w-4 h-4 transition-transform duration-150"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                :style="{ transform: collapsed.authentication ? 'rotate(0deg)' : 'rotate(90deg)' }"
                            >
                                <path fill-rule="evenodd" d="M6.293 4.293a1 1 0 011.414 0L13.414 10l-5.707 5.707a1 1 0 01-1.414-1.414L10.586 10 6.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </h2>

                <div v-show="!collapsed.authentication" class="space-y-4">
                    <!-- Device registration moved to top of the page to be more prominent -->
                    <!-- Token Status -->
                    <div class="p-4 bg-white/5 rounded-lg border border-white/10">
                        <label class="text-sm text-white/50 block mb-2">Token Status</label>
                        <div class="flex items-center gap-2 mb-3">
                            <div
                                :class="[
                                    'w-3 h-3 rounded-full',
                                    tokenStatus === 'valid' ? 'bg-green-500' :
                                    tokenStatus === 'invalid' ? 'bg-red-500' : 'bg-gray-500'
                                ]"
                            />
                            <span
                                :class="[
                                    'font-semibold',
                                    tokenStatus === 'valid' ? 'text-green-400' :
                                    tokenStatus === 'invalid' ? 'text-red-400' : 'text-gray-400'
                                ]"
                            >
                                {{ tokenStatus === 'valid' ? 'Valid' : tokenStatus === 'invalid' ? 'Invalid' : 'Unknown' }}
                            </span>
                        </div>
                        <p v-if="tokenMessage" class="text-sm text-white/60">
                            {{ tokenMessage }}
                        </p>
                        <p v-if="deviceStore.token" class="text-xs text-white/40 font-mono mt-2 break-all">
                            {{ String(deviceStore.token).substring(0, 40) }}...
                        </p>
                    </div>

                    <!-- Token Actions -->
                    <div class="flex gap-3">
                        <button
                            :disabled="isVerifyingToken || !deviceStore.token"
                            class="flex-1 px-6 py-3 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 active:scale-95 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            @click="verifyToken"
                        >
                            <span v-if="isVerifyingToken" class="animate-spin">⏳</span>
                            <span v-else>🔍</span>
                            {{ isVerifyingToken ? 'Verifying...' : 'Verify Token' }}
                        </button>
                        <button
                            :disabled="isRefreshingToken || !deviceStore.device?.value?.id"
                            class="flex-1 px-6 py-3 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 active:scale-95 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            @click="refreshToken"
                        >
                            <span v-if="isRefreshingToken" class="animate-spin">⏳</span>
                            <span v-else>🔄</span>
                            {{ isRefreshingToken ? 'Refreshing...' : 'Refresh Token' }}
                        </button>
                    </div>

                    <!-- Device Login/Logout -->
                    <div class="border-t border-white/10 pt-4">
                        <div v-if="!deviceStore.isAuthenticated" class="space-y-3">
                            <div class="p-4 bg-white/5 rounded-lg border border-white/10">
                                <p class="text-sm text-white/60">
                                    Register this tablet with the setup code above, or authenticate via IP.
                                </p>
                            </div>

                            <button
                                :disabled="isLoggingIn"
                                class="w-full px-6 py-3 min-h-[48px] rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 active:scale-95 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                @click="authenticateDevice"
                            >
                                <span v-if="isLoggingIn" class="animate-spin">⏳</span>
                                <span v-else>🔑</span>
                                {{ isLoggingIn ? 'Authenticating...' : 'Authenticate Device (IP)' }}
                            </button>

                            <p v-if="deviceStore.errorMessage" class="text-sm text-red-400">
                                {{ deviceStore.errorMessage }}
                            </p>
                        </div>

                        <!-- Logout Button -->
                        <button
                            v-else
                            class="w-full px-6 py-3 min-h-[48px] rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 active:scale-95 transition-all font-semibold flex items-center justify-center gap-2"
                            @click="logout"
                        >
                            <span>🚪</span>
                            Logout Device
                        </button>
                    </div>

                    <!-- Inline registration moved to the top Device Registration card -->

                    <!-- Authentication Status -->
                    <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div>
                            <label class="text-sm text-white/50 block mb-1">Authenticated</label>
                            <span :class="deviceStore.isAuthenticated ? 'text-green-400' : 'text-red-400'" class="font-semibold">
                                {{ deviceStore.isAuthenticated ? 'Yes' : 'No' }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- API Configuration -->
            <div class="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
                <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2 justify-between">
                    <div class="flex items-center gap-2">
                        <span>🌐</span>
                        <span>API Configuration</span>
                    </div>
                    <button class="text-sm text-white/60" aria-label="Toggle API Configuration" @click.prevent="toggle('apiConfig')">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-4 h-4 transition-transform duration-150"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            :style="{ transform: collapsed.apiConfig ? 'rotate(0deg)' : 'rotate(90deg)' }"
                        >
                            <path fill-rule="evenodd" d="M6.293 4.293a1 1 0 011.414 0L13.414 10l-5.707 5.707a1 1 0 01-1.414-1.414L10.586 10 6.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </h2>

                <div v-show="!collapsed.apiConfig" class="space-y-4">
                    <!-- API URL Input -->
                    <div>
                        <label class="text-sm text-white/50 block mb-2">API Base URL</label>
                        <div class="flex gap-3">
                            <input
                                v-model="apiUrl"
                                type="text"
                                placeholder="https://woosoo.local"
                                class="flex-1 px-4 py-3 bg-white/10 rounded-lg border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-primary transition-all"
                            >
                        </div>
                        <p class="text-xs text-white/40 mt-2">
                            Current: {{ config.public.apiBaseUrl }}
                        </p>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-3">
                        <button
                            class="px-6 py-3 min-h-[48px] rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 active:scale-95 transition-all font-semibold"
                            @click="testConnection"
                        >
                            🔍 Test Connection
                        </button>
                        <button
                            class="px-6 py-3 min-h-[48px] rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 active:scale-95 transition-all font-semibold"
                            @click="saveApiUrl"
                        >
                            💾 Save & Restart
                        </button>
                        <button
                            class="px-6 py-3 min-h-[48px] rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 active:scale-95 transition-all font-semibold"
                            @click="resetApiUrl"
                        >
                            🔄 Reset
                        </button>
                    </div>
                </div>
            </div>

            <!-- Build & Runtime Information -->
            <div class="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
                <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2 justify-between">
                    <div class="flex items-center gap-2">
                        <span>🧾</span>
                        <span>Build & Runtime Information</span>
                    </div>
                    <button class="text-sm text-white/60" aria-label="Toggle Build & Runtime Information" @click.prevent="toggle('buildInfo')">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-4 h-4 transition-transform duration-150"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            :style="{ transform: collapsed.buildInfo ? 'rotate(0deg)' : 'rotate(90deg)' }"
                        >
                            <path fill-rule="evenodd" d="M6.293 4.293a1 1 0 011.414 0L13.414 10l-5.707 5.707a1 1 0 01-1.414-1.414L10.586 10 6.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </h2>

                <div v-show="!collapsed.buildInfo" class="space-y-3">
                    <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <label class="text-sm text-white/50">App Version</label>
                        <span class="font-mono text-sm">{{ config.public.appVersion || "unknown" }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <label class="text-sm text-white/50">App Environment</label>
                        <span class="font-mono text-sm">{{ config.public.appEnv || "unknown" }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <label class="text-sm text-white/50">Build SHA</label>
                        <span class="font-mono text-sm break-all text-right">{{ config.public.buildSha || "unknown" }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <label class="text-sm text-white/50">Build Branch</label>
                        <span class="font-mono text-sm">{{ config.public.buildBranch || "unknown" }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <label class="text-sm text-white/50">Build Time</label>
                        <span class="font-mono text-sm">{{ buildTimeDisplay }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <label class="text-sm text-white/50">API Base URL</label>
                        <span class="font-mono text-sm break-all text-right">{{ config.public.apiBaseUrl || "unknown" }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <label class="text-sm text-white/50">Reverb Host</label>
                        <span class="font-mono text-sm">{{ config.public.reverb?.host || "unknown" }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <label class="text-sm text-white/50">Reverb Port</label>
                        <span class="font-mono text-sm">{{ config.public.reverb?.port || "unknown" }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <label class="text-sm text-white/50">Reverb Scheme</label>
                        <span class="font-mono text-sm">{{ config.public.reverb?.scheme || "unknown" }}</span>
                    </div>
                    <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                        <label class="text-sm text-white/50">Reverb Path</label>
                        <span class="font-mono text-sm">{{ config.public.reverb?.path || "unknown" }}</span>
                    </div>
                </div>
            </div>

            <!-- Display / Fullscreen -->
            <div class="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
                <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2 justify-between">
                    <div class="flex items-center gap-2">
                        <span>🖥️</span>
                        <span>Display</span>
                    </div>
                    <button class="text-sm text-white/60" aria-label="Toggle Display" @click.prevent="toggle('display')">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="w-4 h-4 transition-transform duration-150"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            :style="{ transform: collapsed.display ? 'rotate(0deg)' : 'rotate(90deg)' }"
                        >
                            <path fill-rule="evenodd" d="M6.293 4.293a1 1 0 011.414 0L13.414 10l-5.707 5.707a1 1 0 01-1.414-1.414L10.586 10 6.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </h2>

                <div v-show="!collapsed.display" class="space-y-4">
                    <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div>
                            <label class="text-sm text-white/50 block mb-1">Fullscreen Mode</label>
                            <p class="text-xs text-white/60">
                                Toggle kiosk fullscreen for a distraction-free ordering experience.
                            </p>
                        </div>
                        <div class="flex items-center gap-3">
                            <button class="px-4 py-2 rounded-lg bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all" @click="toggleFullscreen">
                                {{ isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen' }}
                            </button>
                        </div>
                    </div>

                    <div class="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                        <div>
                            <label class="text-sm text-white/50 block mb-1">Kiosk Fullscreen Policy</label>
                            <p class="text-xs text-white/60">
                                This tablet enforces fullscreen mode. Admin unlock allows temporary exit for maintenance.
                            </p>
                        </div>
                        <div class="text-xs px-3 py-1 rounded-full border border-white/20 text-white/70">
                            {{ startInFullscreen ? 'Enforced' : 'Temporarily Unlocked' }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Backend Diagnostics -->
            <div class="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
                <h2 class="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <span>🧪</span>
                    <span>Backend Diagnostics</span>
                </h2>

                <div class="space-y-4">
                    <p class="text-white/60 text-sm">
                        Test backend order creation endpoint directly to diagnose 500 errors.
                    </p>

                    <!-- Test Button -->
                    <button
                        :disabled="isTestingBackend || !deviceStore.token"
                        class="w-full px-6 py-3 min-h-[48px] rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 active:scale-95 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        @click="testBackendOrder"
                    >
                        <span v-if="isTestingBackend" class="animate-spin">⏳</span>
                        <span v-else>🧪</span>
                        {{ isTestingBackend ? 'Testing...' : 'Test Order Creation (POST /api/devices/create-order)' }}
                    </button>

                    <!-- Show/Hide Diagnostics -->
                    <button
                        v-if="testOrderPayload || testOrderResponse || testOrderError"
                        class="w-full px-4 py-2 rounded-lg bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all text-sm"
                        @click="showDiagnostics = !showDiagnostics"
                    >
                        {{ showDiagnostics ? '▼ Hide Details' : '▶ Show Details' }}
                    </button>

                    <!-- Diagnostic Details -->
                    <div v-if="showDiagnostics" class="space-y-4">
                        <!-- Error Message -->
                        <div v-if="testOrderError" class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <h3 class="text-red-400 font-semibold mb-2">
                                ❌ Error
                            </h3>
                            <pre class="text-xs text-red-300 whitespace-pre-wrap font-mono overflow-x-auto">{{ testOrderError }}</pre>
                        </div>

                        <!-- Request Payload -->
                        <div v-if="testOrderPayload" class="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <h3 class="text-blue-400 font-semibold mb-2">
                                📤 Request Payload
                            </h3>
                            <pre class="text-xs text-blue-200 whitespace-pre-wrap font-mono overflow-x-auto">{{ JSON.stringify(testOrderPayload, null, 2) }}</pre>
                        </div>

                        <!-- Response Data -->
                        <div v-if="testOrderResponse" class="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                            <h3 class="text-green-400 font-semibold mb-2">
                                📥 Response Data
                            </h3>
                            <pre class="text-xs text-green-200 whitespace-pre-wrap font-mono overflow-x-auto">{{ JSON.stringify(testOrderResponse, null, 2) }}</pre>
                        </div>
                    </div>

                    <!-- Instructions -->
                    <div class="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <h3 class="text-yellow-400 font-semibold mb-2">
                            💡 How to Debug 500 Errors
                        </h3>
                        <ul class="text-sm text-yellow-200 space-y-1 list-disc list-inside">
                            <li>Check Laravel logs: <code class="text-xs bg-black/30 px-1 rounded">storage/logs/laravel.log</code></li>
                            <li>Enable debug mode: <code class="text-xs bg-black/30 px-1 rounded">APP_DEBUG=true</code> in <code class="text-xs bg-black/30 px-1 rounded">.env</code></li>
                            <li>Run Laravel: <code class="text-xs bg-black/30 px-1 rounded">php artisan serve</code></li>
                            <li>Check database: <code class="text-xs bg-black/30 px-1 rounded">php artisan migrate:status</code></li>
                            <li>Clear cache: <code class="text-xs bg-black/30 px-1 rounded">php artisan cache:clear</code></li>
                        </ul>
                    </div>
                </div>
            </div>

            <!-- Back Button was moved to header -->

            <!-- Inline Device Registration was moved into the Authentication card -->
        </div>
    </div>
</template>

<style scoped>
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
