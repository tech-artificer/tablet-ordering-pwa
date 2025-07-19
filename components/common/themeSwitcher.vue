<template>
    <nav class="bg-surface border-b border-border p-2">
        <div class="container mx-auto flex justify-between items-center">
            <div class="flex gap-2">
                <button
                    v-for="(theme, key) in themes"
                    :key="key"
                    :class="[
                        'px-3 py-1 text-sm rounded border transition-all',
                        currentThemeName === key
                            ? 'border-primary bg-primary text-white'
                            : 'border-border hover:border-primary'
                    ]"
                    @click="setTheme(key)"
                >
                    {{ theme.name }}
                </button>
            </div>
        </div>
    </nav>
</template>

<script setup>
    const { currentThemeName, themes, setTheme } = useTheme()
</script>
