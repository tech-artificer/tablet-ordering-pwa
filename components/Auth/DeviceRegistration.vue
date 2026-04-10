<script setup lang="ts">

import { useDeviceStore } from '~/stores/Device'
import { logger } from '../../utils/logger'

const props = defineProps<{ inline?: boolean }>()

const deviceStore = useDeviceStore()
const router = useRouter()

logger.debug(deviceStore)
const formData = ref({
  deviceCode: '',
  deviceName: ''
})
const localIp = ref<string | null>(null)

const isLoading = computed(() => Boolean(deviceStore.isLoading))
const errorMessage = computed(() => String(deviceStore.errorMessage || ''))
const hasError = computed(() => Boolean(errorMessage.value))
const registered = ref(false)
const attempted = ref(false)

const waitingForTable = computed(() => Boolean(deviceStore.waitingForTable))
const isPolling = computed(() => Boolean(deviceStore.isPollingForTable))
const hasToken = computed(() => Boolean(deviceStore.token))
const suggestedDeviceName = computed(() => String(localIp.value || (typeof window !== 'undefined' ? window.location.hostname : 'kiosk') || 'kiosk').replace(/[^a-zA-Z0-9.\-]/g, '').replace(/\./g, '-'))

const checkForTable = async () => {
  try {
    // Call the refresh endpoint directly to force the server to re-evaluate table assignment
    await deviceStore.refresh()
    const t = deviceStore.table as any
    if (t && (t.id || t.name)) {
      // stop polling if running and navigate away
      try { deviceStore.stopTablePolling() } catch (e) { /* ignore */ }
      registered.value = true
      ;(deviceStore as any).waitingForTable = false
      try {
        const currentPath = router.currentRoute?.value?.path
        if (currentPath !== '/settings') await router.replace('/')
      } catch (e) { /* ignore */ }
    } else {
      // still no table; UI will show waiting state
    }
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
      ;(deviceStore as any).waitingForTable = false
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
  ;(deviceStore as any).errorMessage = null
  formData.value.deviceCode = ''
  formData.value.deviceName = ''
}

onMounted(() => {
  // If a device is already present in the store, mark as registered
  if (deviceStore.device) {
    registered.value = true
  }

  // Try to obtain a local LAN IP (preferred) to use as suggested device name.
  ;(async () => {
    try {
      // Prefer server-provided last_ip_address when available
      const lastIp = (deviceStore.device && (deviceStore.device as any).last_ip_address) || null
      if (lastIp) {
        localIp.value = String(lastIp)
      } else {
        const { getLocalIp } = await import('~/utils/getLocalIp')
        const ip = await getLocalIp()
        if (ip) localIp.value = ip
      }

      // If no explicit device name provided, prefill with formatted IP (dots -> hyphens)
      if (!formData.value.deviceName) {
        if (localIp.value) {
          formData.value.deviceName = String(localIp.value).replace(/[^a-zA-Z0-9.\-]/g, '').replace(/\./g, '-')
        } else if (typeof window !== 'undefined' && window.location && window.location.hostname) {
          formData.value.deviceName = String(window.location.hostname).replace(/[^a-zA-Z0-9\-]/g, '-')
        }
      }
    } catch (e) {
      // ignore failures and fall back to hostname
      try {
        if (!formData.value.deviceName && typeof window !== 'undefined' && window.location && window.location.hostname) {
          formData.value.deviceName = String(window.location.hostname).replace(/[^a-zA-Z0-9\-]/g, '-')
        }
      } catch (e) { /* ignore */ }
    }
  })()
})

const handleRegistration = async () => {
  // If device already exists, do not re-register — trigger a refresh to check assignment
  if (deviceStore.device) {
    try {
      await deviceStore.refresh()
      const t = deviceStore.table as any
      if (t && (t.id || t.name)) {
        registered.value = true
        ;(deviceStore as any).waitingForTable = false
        try {
          const currentPath = router.currentRoute?.value?.path
          if (currentPath !== '/settings') await router.replace('/')
        } catch (e) { /* ignore */ }
      }
      return
    } catch (e) {
      logger.error('Refresh during handleRegistration failed', e)
      return
      return
    }
  }

  attempted.value = true

  // If not inline, require a device name; inline mode keeps the UI compact and
  // only requires the code so registration can proceed from Settings quickly.
  if (!props.inline && !formData.value.deviceName) {
    ;(deviceStore as any).errorMessage = 'Device name is required.'
    return
  }

  if (!formData.value.deviceCode) {
    ;(deviceStore as any).errorMessage = 'Device code is required.'
    return
  }

  // Clear previous errors
  ;(deviceStore as any).errorMessage = null

  try {
    const payload: any = { code: formData.value.deviceCode, name: formData.value.deviceName }
    if (localIp && localIp.value) payload.ip_address = localIp.value
    else if (deviceStore.device && (deviceStore.device as any).last_ip_address) payload.ip_address = (deviceStore.device as any).last_ip_address
    await deviceStore.register(payload)

    // If registration returned a device (with or without token), mark as registered; table may still be pending.
    if (deviceStore.device) {
      registered.value = true
      ;(deviceStore as any).errorMessage = null

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
      } else {
        // remain on page; show refresh button to check assignment
      }
    } else {
      ;(deviceStore as any).errorMessage = 'Registration succeeded but device details missing from server response. Please contact management.'
    }
  } catch (error) {
    // Error is already set in deviceStore.errorMessage by the register action
    logger.error('Registration failed:', error)
  }
}
</script>


<template>
  <div v-if="!props.inline" class="flex h-screen w-screen items-center justify-center p-4 z-5">
    <div class="shadow-2xl max-w-lg w-full z-10">
      <div class="flex justify-center items-center">
        <div class="rounded-xl max-w-6xl w-full mx-auto max-h-[90vh] overflow-y-auto" :class="['relative', 'bg-gray-950/80', 'backdrop-blur-sm']">
          <div class="relative p-8 z-10 text-white">
            <div class="text-center mb-10">
              <WoosooLogo class="w-16 h-16 mx-auto mb-4" />
              <h1 class="text-3xl font-extrabold text-white font-raleway">Device Registration</h1>
              <p class="text-light mt-2 font-kanit">Enter the unique code to assign this device to a table.</p>
            </div>

            <slot name="form">
              <el-form :model="formData" @submit.prevent="handleRegistration" class="mb-3">
                <div class="grid gap-3">
                  <el-form-item label="Device Name" required>
                    <el-input v-model="formData.deviceName" placeholder="e.g. Table 4 - Kiosk" size="large"
                      class="w-full text-lg font-kanit" :class="{ 'border-red-500': hasError }" :disabled="registered || hasToken" />
                  </el-form-item>

                  <el-form-item label="Device Code" required>
                    <el-input v-model="formData.deviceCode" placeholder="e.g. 123456" size="large"
                      class="w-full text-lg font-kanit" :class="{ 'border-red-500': hasError }" :disabled="registered || hasToken" />
                  </el-form-item>
                </div>

                <div class="space-y-2">
                  <button
                    class="w-full py-3 bg-primary/20 text-primary border border-primary/30 font-semibold rounded-lg"
                    @click="handleRegistration()" :disabled="isLoading || !formData.deviceName || !formData.deviceCode || registered || hasToken">
                    <span>{{ isLoading ? 'Registering...' : (registered || hasToken ? 'Registered' : 'Register Device') }}</span>
                  </button>

                  <div v-if="registered || hasToken" class="mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
                    <p class="text-sm text-white/70 mb-2">Device registered. Waiting for table assignment.</p>
                    <div class="flex gap-2">
                      <button v-if="!isPolling" @click="deviceStore.startTablePolling()" :disabled="isLoading" class="px-4 py-2 rounded bg-primary/20">Start Auto-Check</button>
                      <button v-else @click="deviceStore.stopTablePolling()" class="px-4 py-2 rounded bg-red-500/20">Stop Auto-Check</button>
                      <button @click="checkForTable" :disabled="isLoading" class="px-4 py-2 rounded bg-primary/20">Check for Table</button>
                      <button @click="resetRegistration" class="px-4 py-2 rounded bg-white/10">Retry Register</button>
                    </div>
                  </div>
                </div>
              </el-form>
            </slot>

            <div v-if="hasError && attempted" class="mt-4">
              <div class="p-3 bg-red-600/10 border border-red-600/20 rounded-lg text-red-300 text-sm flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.516 9.8A1.75 1.75 0 0116.75 16.5H3.25a1.75 1.75 0 01-1.508-2.601l5.515-9.8zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-8a.9.9 0 00-.9.9v4.2c0 .5.4.9.9.9s.9-.4.9-.9V5.9A.9.9 0 0010 5z" clip-rule="evenodd" />
                </svg>
                <div>
                  <div class="font-semibold">Registration Error</div>
                  <div class="text-sm mt-1">{{ errorMessage }}</div>
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
        <h3 class="text-xl font-semibold">Device Registration</h3>
        <p class="text-sm text-white/60">Quick register this device. Using the suggested name speeds setup.</p>
      </div>
    </div>

    <el-form :model="formData" @submit.prevent="handleRegistration" class="mb-3">
      <div class="grid gap-3">
          <div>
            <el-input v-model="formData.deviceCode" placeholder="Enter device code" size="default"
              class="w-full text-sm" :class="{ 'border-red-500': hasError }" :disabled="registered || hasToken" />
            <p v-if="hasError && attempted" class="mt-2 text-sm text-red-400">{{ errorMessage }}</p>
          </div>
      </div>

      <div class="mt-4 flex gap-3">
        <button
          class="flex-1 px-4 py-3 rounded-lg bg-primary text-white border border-primary/40 font-semibold min-h-[44px] hover:opacity-95 transition"
          @click="handleRegistration()" :disabled="isLoading || !formData.deviceCode || registered || hasToken">
          <span>{{ isLoading ? 'Registering...' : (registered || hasToken ? 'Registered' : 'Register Device') }}</span>
        </button>
        <button v-if="registered || hasToken" @click="checkForTable" class="px-4 py-3 rounded bg-primary/20 min-h-[44px]">Check for Table</button>
      </div>

      <div v-if="hasError && attempted" class="mt-3">
        <el-alert title="Registration Failed" :description="errorMessage" type="error" show-icon />
      </div>

      <div class="mt-3 text-xs text-white/50">
        <div class="flex items-center justify-between">
          <div>Suggested name: <span class="font-mono">{{ formData.deviceName }}</span></div>
          <button v-if="!formData.deviceName" @click="formData.deviceName = suggestedDeviceName" class="text-sm text-blue-300">Use suggested</button>
        </div>
      </div>
    </el-form>
  </div>
</template>