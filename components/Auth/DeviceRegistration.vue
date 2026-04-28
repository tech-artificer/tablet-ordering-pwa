<script setup lang="ts">

import { logger } from "../../utils/logger"
import { useDeviceStore } from "~/stores/Device"

const props = defineProps<{ inline?: boolean }>()

const deviceStore = useDeviceStore()
const router = useRouter()

const formData = ref({
    deviceSecurityCode: "",
    deviceName: "",
})
const localIp = ref<string | null>(null)

const isLoading = computed(() => Boolean(deviceStore.isLoading))
const errorMessage = computed(() => String(deviceStore.errorMessage || ""))
const hasError = computed(() => Boolean(errorMessage.value))
const registered = ref(false)
const attempted = ref(false)

// Validate security code: must be 6 digits, numeric only
const securityCodeValidation = computed(() => {
    const code = formData.value.deviceSecurityCode
    return /^\d{6}$/.test(code)
})

const isPolling = computed(() => Boolean(deviceStore.isPollingForTable))
const hasToken = computed(() => Boolean(deviceStore.token))
const pollTimedOut = computed(() => Boolean(deviceStore.pollTimedOut))
const suggestedDeviceName = computed(() => String(localIp.value || (typeof window !== 'undefined' ? window.location.hostname : 'kiosk') || 'kiosk').replace(/[^a-zA-Z0-9.\-]/g, '').replace(/\./g, '-'))

const displayDevice = computed(() =>
    (deviceStore.device && (deviceStore.device as any).value)
        ? (deviceStore.device as any).value
        : (deviceStore.device as any)
)

const displayTable = computed(() =>
    (deviceStore.table && (deviceStore.table as any).value)
        ? (deviceStore.table as any).value
        : (deviceStore.table as any)
)

const checkForTable = async () => {
    try {
    // Call the refresh endpoint directly to force the server to re-evaluate table assignment
        await deviceStore.refresh()
        const t = deviceStore.table as any
        if (t && (t.id || t.name)) {
            // stop polling if running and navigate away
            try { deviceStore.stopTablePolling() } catch (e) { /* ignore */ }
            registered.value = true
            deviceStore.setWaitingForTable(false)
            try {
                const currentPath = router.currentRoute?.value?.path
                if (currentPath !== '/settings') await router.replace('/')
            } catch (e) { /* ignore */ }
        }
        // else: still no table; UI shows waiting state
    } catch (err) {
        logger.error('checkForTable failed', err)
    }
}

// React to table assignment happening elsewhere (polling or manual check)
watch(
    () => deviceStore.table,
    (newTable) => {
        const t = newTable as any
        if (t && (t.id || t.name)) {
            logger.debug('[DeviceRegistration] detected table assignment', t)
            // stop background polling if running
            try { deviceStore.stopTablePolling() } catch (e) { /* ignore */ }
            // mark registered and navigate after short delay
            registered.value = true
            deviceStore.setWaitingForTable(false)
            setTimeout(async () => {
                try {
                    const currentPath = router.currentRoute?.value?.path
                    if (currentPath !== '/settings') await router.replace('/')
                } catch (e) { logger.debug('navigate replace ignored', e) }
            }, 600)
        }
    }
)

const resetRegistration = () => {
    registered.value = false
    attempted.value = false
    deviceStore.clearAuth()
    deviceStore.clearError()
    formData.value.deviceSecurityCode = ''
    formData.value.deviceName = ''
}

onMounted(() => {
    // If a device is already present in the store, mark as registered
    if (deviceStore.device) {
        registered.value = true
    }

    // Try to obtain a local LAN IP (preferred) for server-side metadata.
    ;(async () => {
        try {
            // Prefer server-provided last_ip_address when available
            const lastIp = (deviceStore.device && (deviceStore.device as any).last_ip_address) || null
            if (lastIp) {
                localIp.value = String(lastIp)
            } else {
                const { getLocalIp } = await import("~/utils/getLocalIp")
                const ip = await getLocalIp()
                if (ip) { localIp.value = ip }
            }
        } catch (e) {
            logger.debug("[DeviceRegistration] local IP detection failed", e)
        }
    })()
})

const handleRegistration = async () => {
    // Prevent concurrent calls (e.g. double-fire from @click + @submit.prevent)
    if (isLoading.value) { return }

    // If device already exists, do not re-register — trigger a refresh to check assignment
    if (deviceStore.device) {
        try {
            await deviceStore.refresh()
            const t = deviceStore.table as any
            if (t && (t.id || t.name)) {
                registered.value = true
                deviceStore.setWaitingForTable(false)
                try {
                    const currentPath = router.currentRoute?.value?.path
                    if (currentPath !== '/settings') await router.replace('/')
                } catch (e) { /* ignore */ }
            }
            return
        } catch (e) {
            logger.error('Refresh during handleRegistration failed', e)
            return
        }
    }

    attempted.value = true

    // If not inline, require a device name; inline mode keeps the UI compact and
    // only requires the code so registration can proceed from Settings quickly.
    if (!props.inline && !formData.value.deviceName) {
        deviceStore.errorMessage = 'Device name is required.'
        return
    }

    if (!formData.value.deviceSecurityCode) {
        deviceStore.errorMessage = 'Security code is required.'
        return
    }

    if (!securityCodeValidation.value) {
        deviceStore.errorMessage = 'Security code must be exactly 6 digits.'
        return
    }

    // Clear previous errors
    deviceStore.clearError()

    try {
        const payload: any = { security_code: formData.value.deviceSecurityCode, name: formData.value.deviceName }
        if (localIp && localIp.value) payload.ip_address = localIp.value
        else if (deviceStore.device && (deviceStore.device as any).last_ip_address) payload.ip_address = (deviceStore.device as any).last_ip_address
        await deviceStore.register(payload)

        // If registration returned a device (with or without token), mark as registered; table may still be pending.
        if (deviceStore.device) {
            registered.value = true
            deviceStore.clearError()

            // If table assigned already, navigate away
            const tableId = (deviceStore.table && (deviceStore.table as any).id) || (deviceStore.table && (deviceStore.table as any).value?.id)
            const tableName = (deviceStore.table && (deviceStore.table as any).name) || null
            if (tableId || tableName) {
                try {
                    const currentPath = router.currentRoute?.value?.path
                    if (currentPath !== '/settings') {
                        await router.replace('/')
                    }
                } catch (e) { /* ignore */ }
            }
            // else: remain on page; show waiting-for-table state
        } else {
            deviceStore.errorMessage = 'Registration succeeded but device details missing from server response. Please contact management.'
        }
    } catch (error) {
        // Error is already set in deviceStore.errorMessage by the register action
        logger.error('Registration failed:', error)
    }
}
</script>

<template>
    <div v-if="!props.inline" class="flex h-screen w-screen items-center justify-center p-4">
        <div class="shadow-2xl max-w-lg w-full z-10">
            <div class="flex justify-center items-center">
                <div class="rounded-xl max-w-6xl w-full mx-auto max-h-[90vh] overflow-y-auto relative bg-secondary-dark/80 backdrop-blur-sm">
                    <div class="relative p-8 z-10 text-white">
                        <div class="text-center mb-10">
                            <WoosooLogo class="w-16 h-16 mx-auto mb-4" />
                            <h1 class="text-3xl font-extrabold text-white font-raleway">
                                Device Registration
                            </h1>
                            <p class="text-white/60 mt-2 font-kanit">
                                Enter the unique code to assign this device to a table.
                            </p>
                        </div>

                        <slot name="form">
                            <el-form :model="formData" class="mb-3" @submit.prevent="handleRegistration">
                                <div class="grid gap-3">
                                    <el-form-item label="Security Code" required>
                                        <el-input
                                            v-model="formData.deviceSecurityCode"
                                            placeholder="e.g. 123456"
                                            type="text"
                                            inputmode="numeric"
                                            maxlength="6"
                                            size="large"
                                            class="w-full text-lg font-kanit"
                                            :class="{ 'border-error': hasError }"
                                            :disabled="registered || hasToken"
                                        />
                                        <div v-if="attempted && formData.deviceSecurityCode && !securityCodeValidation" class="text-error text-xs mt-1">
                                            Must be exactly 6 digits
                                        </div>
                                    </el-form-item>
                                </div>

                                <div class="space-y-2">
                                    <button
                                        type="button"
                                        class="w-full py-3 bg-primary/20 text-primary border border-primary/30 font-semibold rounded-lg"
                                        :disabled="isLoading || !securityCodeValidation || registered || hasToken"
                                        @click="handleRegistration()"
                                    >
                                        <span>{{ isLoading ? 'Registering...' : (registered || hasToken ? 'Registered' : 'Register Device') }}</span>
                                    </button>

                                    <div v-if="registered || hasToken" class="mt-2 p-3 bg-white/5 rounded-lg border border-white/10 space-y-2">
                                        <!-- Already-registered identity display -->
                                        <div v-if="deviceStore.device" class="text-sm text-white/80">
                                            <span class="font-semibold text-white">{{ displayDevice?.name }}</span>
                                            <span v-if="displayTable?.name" class="ml-2 text-green-400">— {{ displayTable.name }}</span>
                                            <span v-else class="ml-2 text-yellow-400">— waiting for table</span>
                                        </div>
                                        <!-- Poll timeout feedback -->
                                        <div v-if="pollTimedOut && !displayTable?.name" class="text-xs text-yellow-400 bg-yellow-400/10 rounded p-2">
                                            Timeout: table not yet assigned. Ask your manager to assign a table to this device, then tap "Check for Table".
                                        </div>
                                        <div class="flex flex-wrap gap-2">
                                            <button v-if="!isPolling" type="button" :disabled="isLoading" class="px-4 py-2 rounded bg-primary/20 text-sm" @click="deviceStore.startTablePolling()">Start Auto-Check</button>
                                            <button v-else type="button" class="px-4 py-2 rounded bg-error/20 text-sm" @click="deviceStore.stopTablePolling()">Stop Auto-Check</button>
                                            <button type="button" :disabled="isLoading" class="px-4 py-2 rounded bg-primary/20 text-sm" @click="checkForTable">Check for Table</button>
                                            <button type="button" class="px-4 py-2 rounded bg-white/10 text-sm" @click="resetRegistration">Re-register</button>
                                        </div>
                                    </div>
                                </div>
                            </el-form>
                        </slot>

                        <div v-if="hasError && attempted" class="mt-4">
                            <div class="p-3 bg-error/10 border border-error/20 rounded-lg text-error/80 text-sm flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-error flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.516 9.8A1.75 1.75 0 0116.75 16.5H3.25a1.75 1.75 0 01-1.508-2.601l5.515-9.8zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a.9.9 0 00-.9.9v4.2c0 .5.4.9.9.9s.9-.4.9-.9V5.9A.9.9 0 0010 5z" clip-rule="evenodd" />
                                </svg>
                                <div>
                                    <div class="font-semibold">
                                        Registration Error
                                    </div>
                                    <div class="text-sm mt-1 text-error">
                                        {{ errorMessage }}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Inline compact card for embedding within Settings -->
    <div v-else class="bg-white/5 rounded-xl border border-white/10 p-6 mb-6">
        <div class="flex items-center gap-3 mb-4">
            <WoosooLogo class="w-10 h-10" />
            <div>
                <h3 class="text-xl font-semibold">
                    Device Registration
                </h3>
                <p class="text-sm text-white/60">
                    Enter the setup code from the device list.
                </p>
            </div>
        </div>

        <el-form :model="formData" class="mb-3" @submit.prevent="handleRegistration">
          <div class="grid gap-3">
            <el-form-item label="Security Code" required>
              <el-input v-model="formData.deviceSecurityCode" placeholder="e.g. 123456" type="text" inputmode="numeric" maxlength="6" size="large"
              class="w-full text-lg font-kanit" :class="{ 'border-error': hasError }" :disabled="registered || hasToken" />
              <div v-if="attempted && formData.deviceSecurityCode && !securityCodeValidation" class="text-error text-xs mt-1">
                Must be exactly 6 digits
              </div>
            </el-form-item>
          </div>

          <div class="space-y-2">
            <button
              type="button"
              class="w-full py-3 bg-primary/20 text-primary border border-primary/30 font-semibold rounded-lg"
              @click="handleRegistration()" :disabled="isLoading || !formData.deviceName || !securityCodeValidation || registered || hasToken">
              <span>{{ isLoading ? 'Registering...' : (registered || hasToken ? 'Registered' : 'Register Device') }}</span>
            </button>

            <div v-if="registered || hasToken" class="mt-2 p-3 bg-white/5 rounded-lg border border-white/10 space-y-2">
              <!-- Already-registered identity display -->
              <div v-if="deviceStore.device" class="text-sm text-white/80">
                <span class="font-semibold text-white">{{ displayDevice?.name }}</span>
                <span v-if="displayTable?.name" class="ml-2 text-green-400">— {{ displayTable.name }}</span>
                <span v-else class="ml-2 text-yellow-400">— waiting for table</span>
              </div>
              <!-- Poll timeout feedback -->
              <div v-if="pollTimedOut && !displayTable?.name" class="text-xs text-yellow-400 bg-yellow-400/10 rounded p-2">
                Timeout: table not yet assigned. Ask your manager to assign a table to this device, then tap "Check for Table".
              </div>
              <div class="flex flex-wrap gap-2">
                <button v-if="!isPolling" type="button" @click="deviceStore.startTablePolling()" :disabled="isLoading" class="px-4 py-2 rounded bg-primary/20 text-sm">Start Auto-Check</button>
                <button v-else type="button" @click="deviceStore.stopTablePolling()" class="px-4 py-2 rounded bg-error/20 text-sm">Stop Auto-Check</button>
                <button type="button" @click="checkForTable" :disabled="isLoading" class="px-4 py-2 rounded bg-primary/20 text-sm">Check for Table</button>
                <button type="button" @click="resetRegistration" class="px-4 py-2 rounded bg-white/10 text-sm">Re-register</button>
              </div>
            </div>
          </div>
        </el-form>

        <div v-if="hasError && attempted" class="mt-4">
          <div class="p-3 bg-error/10 border border-error/20 rounded-lg text-error/80 text-sm flex items-start gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-error flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.516 9.8A1.75 1.75 0 0116.75 16.5H3.25a1.75 1.75 0 01-1.508-2.601l5.515-9.8zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a.9.9 0 00-.9.9v4.2c0 .5.4.9.9.9s.9-.4.9-.9V5.9A.9.9 0 0010 5z" clip-rule="evenodd" />
            </svg>
            <div>
              <div class="font-semibold">Registration Error</div>
              <div class="text-sm mt-1 text-error">{{ errorMessage }}</div>
            </div>
          </div>
        </div>
    </div>
</template>
