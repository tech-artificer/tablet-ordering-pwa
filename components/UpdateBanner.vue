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
const props = withDefaults(defineProps<{
  visible: boolean
  updating: boolean
  disabled?: boolean
  disabledMessage?: string
}>(), {
    disabled: false,
    disabledMessage: "Apply after this session ends.",
})

const emit = defineEmits<{
  apply: []
}>()

const onApply = () => {
    if (props.disabled || props.updating) {
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
            <div class="space-y-1">
                <p class="text-sm font-semibold text-white/90">
                    New version available.
                </p>
                <p class="text-xs text-white/60">
                    {{ props.disabled ? props.disabledMessage : "Tap to apply when safe." }}
                </p>
            </div>

            <button
                type="button"
                class="rounded-xl border border-primary/40 bg-primary/20 px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="props.updating || props.disabled"
                @click="onApply"
            >
                {{ props.updating ? "Updating..." : "Apply update" }}
            </button>

        </div>
    </div>
</template>
