<script setup lang="ts">
const props = withDefaults(defineProps<{
    visible: boolean
    disabled?: boolean
    isApplying?: boolean
    errorMessage?: string | null
    disabledMessage?: string
}>(), {
    disabled: false,
    isApplying: false,
    errorMessage: null,
    disabledMessage: "Apply after this session ends.",
})

const emit = defineEmits<{
    apply: []
}>()

function onApply () {
    if (props.disabled || props.isApplying) {
        return
    }

    emit("apply")
}
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
                <div>
                    <p class="text-sm font-semibold">
                        New version available - tap to apply.
                    </p>
                    <p v-if="disabled" class="mt-1 text-xs">
                        {{ disabledMessage }}
                    </p>
                    <p v-if="errorMessage" class="mt-1 text-xs text-red-700">
                        {{ errorMessage }}
                    </p>
                </div>

                <button
                    type="button"
                    class="rounded-md bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:bg-amber-300"
                    :disabled="disabled || isApplying"
                    @click="onApply"
                >
                    {{ isApplying ? "Updating..." : "Apply update" }}
                </button>
            </div>
        </div>
    </div>
</template>
