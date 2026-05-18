<script setup lang="ts">
import { computed, onMounted } from "vue"
import { logger } from "./utils/logger"

const props = defineProps<{
  error: {
    statusCode?: number
    message?: string
    statusMessage?: string
  }
}>()

const router = useRouter()

const isNotFound = computed(() => props.error?.statusCode === 404)

// Detect chunk load errors in error boundary
const isChunkError = computed(() => {
    const msg = props.error?.message || props.error?.statusMessage || ""
    return (
        msg.includes("chunk") ||
        msg.includes("ChunkLoadError") ||
        msg.includes("Loading chunk") ||
        msg.includes("Failed to fetch dynamically") ||
        msg.includes("import()")
    )
})

const title = computed(() => {
    if (isNotFound.value) { return "Page Not Found" }
    if (isChunkError.value) { return "App Update Required" }
    return "Something Went Wrong"
})

const subtitle = computed(() => {
    if (isNotFound.value) {
        return "The page you requested does not exist."
    }
    if (isChunkError.value) {
        return "The app was updated and needs to reload. Please use the recovery option below."
    }
    return "An unexpected error occurred. Please tap the button below to return to the start screen."
})

function handleError () {
    // For chunk errors, go to recovery page instead of just router.replace
    if (isChunkError.value) {
        window.location.href = "/recovery?type=chunk-load&source=error-boundary"
        return
    }
    router.replace("/")
}

function goToRecovery () {
    window.location.href = "/recovery?type=error&source=error-page"
}

onMounted(() => {
    logger.error("[ErrorPage] Error boundary caught:", props.error)
})
</script>

<template>
    <div class="min-h-screen bg-secondary flex flex-col items-center justify-center px-8 text-center">
        <!-- Icon -->
        <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-8">
            <svg
                v-if="isNotFound"
                class="w-10 h-10 text-primary"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                viewBox="0 0 24 24"
            >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <svg
                v-else
                class="w-10 h-10 text-primary"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                viewBox="0 0 24 24"
            >
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
        </div>

        <!-- Error code -->
        <p v-if="error?.statusCode" class="text-primary/60 text-sm font-mono tracking-widest uppercase mb-3">
            Error {{ error.statusCode }}
        </p>

        <!-- Title -->
        <h1 class="text-white text-3xl font-bold mb-4">
            {{ title }}
        </h1>

        <!-- Subtitle -->
        <p class="text-white/60 text-base leading-relaxed max-w-sm mb-10">
            {{ subtitle }}
        </p>

        <!-- CTA -->
        <div class="space-y-3">
            <button
                class="min-h-[52px] px-10 rounded-xl bg-primary text-secondary font-bold text-base tracking-wide active:scale-95 transition-transform w-full"
                @click="handleError"
            >
                {{ isChunkError ? "Reload App" : "Return to Start" }}
            </button>

            <button
                v-if="!isNotFound"
                class="min-h-[48px] px-6 rounded-xl border border-white/20 text-white/80 font-medium text-sm active:scale-95 transition-transform w-full"
                @click="goToRecovery"
            >
                Recovery Options
            </button>
        </div>

        <!-- Debug info -->
        <div class="mt-8 text-center">
            <p class="text-white/20 text-xs font-mono">
                {{ isChunkError ? "Chunk load error detected" : `Error ${props.error?.statusCode || ""}` }}
            </p>
        </div>
    </div>
</template>
