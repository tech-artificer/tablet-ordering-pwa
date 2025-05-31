<template>
    <div class="min-h-screen bg-background text-text p-8">
        <CommonThemeSwitcher/>
        <div class="flex justify-between items-center mb-8">
            <div>
                <h1 class="text-3xl font-bold mb-4">
                    Dynamic Theme System
                </h1>
            </div>
            <div>
                <CommonLink name="Back" to="/" class="bg-surface border border-border px-4 py-2 rounded"/>
            </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="bg-surface border border-border rounded-lg p-6">
                <h3 class="text-xl font-semibold text-primary mb-2">Primary Card</h3>
                <p class="text-text-secondary mb-4">
                    This card demonstrates the primary theme colors and styling.
                </p>
                <button class="bg-primary text-white px-4 py-2 rounded hover:opacity-90">
                    Primary Button
                </button>
            </div>

            <div class="bg-surface border border-border rounded-lg p-6">
                <h3 class="text-xl font-semibold text-secondary mb-2">Secondary Card</h3>
                <p class="text-text-secondary mb-4">
                    This card shows secondary colors and accent elements.
                </p>
                <button class="bg-accent text-white px-4 py-2 rounded hover:opacity-90">
                    Accent Button
                </button>
            </div>

            <div class="bg-surface border border-border rounded-lg p-6">
                <h3 class="text-xl font-semibold text-text mb-2">Status Colors</h3>
                <div class="space-y-2 mb-4">
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded-full bg-success" />
                        <span class="text-text-secondary">Success</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded-full bg-warning" />
                        <span class="text-text-secondary">Warning</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-4 h-4 rounded-full bg-error" />
                        <span class="text-text-secondary">Error</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-8 bg-surface border border-border rounded-lg p-6">
            <h3 class="text-xl font-semibold mb-4">Current Theme: {{ currentTheme.name }}</h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div v-for="(color, name) in currentTheme.colors" :key="name" class="text-center">
                    <div
                        class="w-16 h-16 rounded-lg mx-auto mb-2 border border-border"
                        :style="{ backgroundColor: color }"
                    />
                    <p class="text-sm font-medium">{{ name }}</p>
                    <p class="text-xs text-text-secondary">{{ color }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
    const { currentTheme } = useTheme()
</script>
