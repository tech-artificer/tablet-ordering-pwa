export interface ThemeConfig {
    name: string
    colors: {
        background: string
        primary: string
        secondary: string
        accent: string
        surface: string
        textPrimary: string
        textSecondary: string
        textLight: string
        border: string
        success: string
        warning: string
        error: string
        info: string
        muted: string
        cardBackground: string
        hover: string
    }
}

export const themes: Record<string, ThemeConfig> = {
    woosooWarm: {
        name: 'woosoo-warm',
        colors: {
            background: '#fefcfa',
            primary: '#ea7c2b',
            secondary: '#8b7355',
            accent: '#d4752a',
            surface: '#f8f5f1',
            textPrimary: '#2d1b12',
            textSecondary: '#6b5b4d',
            textLight: '#efc086',
            border: '#e8ddd4',
            success: '#22c55e',
            warning: '#ea7c2b',
            error: '#dc2626',
            info: '#3b82f6',
            muted: '#f3ede6',
            cardBackground: '#ffffff',
            hover: '#f0e6db'
        }
    },

}

export const useTheme = () => {
    const currentThemeName = useState<string>('theme', () => 'woosooWarm')
    const currentTheme = computed(() => themes[currentThemeName.value] || themes.woosooWarm)
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
