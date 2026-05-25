<script setup lang="ts">
import { computed, ref } from "vue"
import { useRuntimeConfigOverride } from "~/composables/useRuntimeConfigOverride"
import { useDeviceStore } from "~/stores/Device"
import { useSessionStore } from "~/stores/Session"
import { useOrderStore } from "~/stores/Order"
import { useConnectionStore } from "~/stores/Connection"
import { useBuildVersion } from "~/composables/useBuildVersion"

const config = useRuntimeConfigOverride()
const deviceStore = useDeviceStore()
const sessionStore = useSessionStore()
const orderStore = useOrderStore()
const connectionStore = useConnectionStore()
const { hasMismatch } = useBuildVersion()

const copyLabel = ref("Copy Snapshot")
let copyResetTimer: ReturnType<typeof setTimeout> | null = null

const buildInfo = computed(() => [
    { label: "App Version", value: config.appVersion },
    { label: "Environment", value: config.appEnv },
    { label: "Build SHA", value: config.buildSha },
    { label: "Build Branch", value: config.buildBranch },
    { label: "Build Time", value: config.buildTime },
    { label: "API Base URL", value: config.apiBaseUrl },
    { label: "Reverb Host", value: config.reverb.host },
    { label: "Reverb Port", value: config.reverb.port },
    { label: "Reverb Scheme", value: config.reverb.scheme },
    { label: "Reverb Path", value: config.reverb.path },
])

function formatValue (value: string | number | undefined): string {
    if (value === undefined || value === null || value === "") {
        return "—"
    }
    return String(value)
}

function maskToken (token: string | null): string {
    if (!token) { return "—" }
    if (token.length <= 4) { return "****" }
    return `****${token.slice(-4)}`
}

async function copySnapshot () {
    const rawToken = deviceStore.token
    const snapshot = {
        timestamp: new Date().toISOString(),
        build: {
            sha: config.buildSha,
            branch: config.buildBranch,
            time: config.buildTime,
            version: config.appVersion,
            mismatch: hasMismatch.value,
        },
        device: {
            id: deviceStore.getDeviceId(),
            token: maskToken(rawToken),
            table: deviceStore.getTableName(),
            tableId: deviceStore.getTableId(),
        },
        session: {
            id: sessionStore.sessionId,
            orderId: sessionStore.orderId,
            isActive: sessionStore.isActive,
        },
        order: {
            serverOrderId: orderStore.serverOrderId,
            serverStatus: orderStore.serverStatus,
        },
        connection: {
            online: connectionStore.online,
            reverbState: connectionStore.reverbState,
            phase: connectionStore.phase,
            pollingActive: connectionStore.pollingActive,
        },
        api: {
            host: config.apiBaseUrl,
        },
    }

    try {
        await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
        copyLabel.value = "Copied ✓"
        if (copyResetTimer) { clearTimeout(copyResetTimer) }
        copyResetTimer = setTimeout(() => { copyLabel.value = "Copy Snapshot" }, 2000)
    } catch {
        copyLabel.value = "Copy failed"
        if (copyResetTimer) { clearTimeout(copyResetTimer) }
        copyResetTimer = setTimeout(() => { copyLabel.value = "Copy Snapshot" }, 2000)
    }
}
</script>

<template>
    <div class="build-info-panel">
        <h3 class="text-lg font-semibold text-[#e9d3aa] mb-4">
            Build Information
        </h3>

        <div
            v-if="hasMismatch"
            class="mb-3 px-3 py-2 rounded bg-yellow-900/40 border border-yellow-600/50 text-yellow-300 text-xs"
        >
            Build mismatch detected — update pending safe reload
        </div>

        <div class="grid gap-2">
            <div
                v-for="item in buildInfo"
                :key="item.label"
                class="flex items-center justify-between py-2 px-3 rounded bg-[#1e1a16] border border-[#3a3530]"
            >
                <span class="text-sm text-[#8a8578]">{{ item.label }}</span>
                <span class="text-sm font-mono text-[#f0e6d2] truncate max-w-[60%]">
                    {{ formatValue(item.value) }}
                </span>
            </div>
        </div>

        <button
            class="mt-4 w-full py-2 px-4 rounded text-sm font-medium bg-[#2a2520] border border-[#3a3530] text-[#e9d3aa] hover:bg-[#3a3020] transition-colors"
            @click="copySnapshot"
        >
            {{ copyLabel }}
        </button>
    </div>
</template>
