<script setup lang="ts">
defineProps<{
    visible: boolean
    disabled?: boolean
    isApplying?: boolean
    errorMessage?: string | null
}>()

const emit = defineEmits<{
    apply: []
}>()
</script>

<template>
    <div
        v-if="visible"
        class="fixed inset-x-0 top-0 z-[90] flex justify-center px-4 py-3"
        role="status"
        aria-live="polite"
    >
        <div class="w-full max-w-3xl rounded-xl border border-amber-400/70 bg-amber-100 px-4 py-3 text-amber-900 shadow-lg">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <p class="text-sm font-semibold">
                    A new app update is available.
                </p>
                <button
                    class="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-amber-300"
                    :disabled="Boolean(disabled) || Boolean(isApplying)"
                    @click="emit('apply')"
                >
                    {{ isApplying ? "Updating..." : "Apply update" }}
                </button>
            </div>
            <p v-if="disabled" class="mt-2 text-xs">
                Finish the current session or order before updating.
            </p>
            <p v-if="errorMessage" class="mt-2 text-xs text-red-700">
                {{ errorMessage }}
            </p>
        </div>
    </div>
</template>
