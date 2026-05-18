<script setup lang="ts">
const props = withDefaults(defineProps<{
    visible: boolean
    disabled?: boolean
    isApplying?: boolean
    errorMessage?: string | null
}>(), {
    disabled: false,
    isApplying: false,
    errorMessage: null,
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
    <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-2"
    >
        <div
            v-if="visible"
            class="fixed bottom-4 right-4 z-[90] flex items-center gap-2 rounded-full border border-amber-400/60 bg-amber-50 px-3 py-1.5 shadow-md"
            role="status"
            aria-live="polite"
        >
            <span class="text-xs font-medium text-amber-900">New version available - tap to apply.</span>
            <button
                type="button"
                class="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-amber-300"
                :disabled="disabled || isApplying"
                @click="onApply"
            >
                {{ isApplying ? '…' : 'Apply' }}
            </button>
            <p v-if="errorMessage" class="text-xs text-red-600">
                {{ errorMessage }}
            </p>
        </div>
    </Transition>
</template>
