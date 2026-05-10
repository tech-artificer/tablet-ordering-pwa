<script setup lang="ts">
import { computed } from "vue"
import { useRuntimeConfigOverride } from "~/composables/useRuntimeConfigOverride"

const config = useRuntimeConfigOverride()

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
</script>

<template>
    <div class="build-info-panel">
        <h3 class="text-lg font-semibold text-[#e9d3aa] mb-4">
            Build Information
        </h3>
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
    </div>
</template>
