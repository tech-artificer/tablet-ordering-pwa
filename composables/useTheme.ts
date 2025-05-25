export interface ThemeConfig {
    name: string
    colors: {
        primary: string
        secondary: string
        accent: string
        background: string
        surface: string
        text: string
        textSecondary: string
        border: string
        success: string
        warning: string
        error: string
    }
}

export const themes: Record<string, ThemeConfig> = {
    light: {
        name: 'light',
        colors: {
            primary: '#3b82f6',
            secondary: '#64748b',
            accent: '#8b5cf6',
            background: '#ffffff',
            surface: '#f8fafc',
            text: '#0f172a',
            textSecondary: '#64748b',
            border: '#e2e8f0',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444'
        }
    },
    dark: {
        name: 'dark',
        colors: {
            primary: '#60a5fa',
            secondary: '#94a3b8',
            accent: '#a78bfa',
            background: '#0f172a',
            surface: '#1e293b',
            text: '#f8fafc',
            textSecondary: '#cbd5e1',
            border: '#334155',
            success: '#34d399',
            warning: '#fbbf24',
            error: '#f87171'
        }
    },
    ocean: {
        name: 'ocean',
        colors: {
            primary: '#0891b2',
            secondary: '#0f766e',
            accent: '#06b6d4',
            background: '#f0fdfa',
            surface: '#ccfbf1',
            text: '#134e4a',
            textSecondary: '#047857',
            border: '#5eead4',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444'
        }
    },
    sunset: {
        name: 'sunset',
        colors: {
            primary: '#ea580c',
            secondary: '#dc2626',
            accent: '#f59e0b',
            background: '#fefce8',
            surface: '#fef3c7',
            text: '#92400e',
            textSecondary: '#b45309',
            border: '#fcd34d',
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444'
        }
    }
}


export const useTheme = () => {
    const currentThemeName = useState<string>('theme', () => 'light')
    const currentTheme = computed(() => themes[currentThemeName.value] || themes.light)
    const setTheme = (themeName: string) => {
        if (themes[themeName]) {
            currentThemeName.value = themeName
            applyThemeToDocument(themes[themeName])
        }
    }
    const applyThemeToDocument = (theme: ThemeConfig) => {
        if (import.meta.client) {
            const root = document.documentElement
            Object.entries(theme.colors).forEach(([key, value]) => {
                root.style.setProperty(`--color-${key}`, value)
            })
            root.setAttribute('data-theme', theme.name)
        }
    }
    // onMounted(() => {
    //     applyThemeToDocument(currentTheme.value)
    // })
    watch(currentTheme, (newTheme) => {
        applyThemeToDocument(newTheme)
    })

    return {
        currentTheme: readonly(currentTheme),
        currentThemeName: readonly(currentThemeName),
        themes,
        setTheme
    }
}
