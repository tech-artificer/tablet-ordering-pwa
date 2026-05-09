<script setup lang="ts">
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
        v-if="props.visible"
        class="fixed inset-x-4 bottom-4 z-[90] rounded-2xl border border-primary/35 bg-black/80 p-4 shadow-2xl backdrop-blur"
        role="status"
        aria-live="polite"
    >
        <div class="flex items-center justify-between gap-4">
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
