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
        textLightPrimary: string
        textLightSecondary: string
        textDarkPrimary: string
        textDarkSecondary: string
        textLight: string
        border: string
        success: string
        warning: string
        error: string
        info: string
        muted: string
        cardBackground: string
        hover: string
        rose: string
        lightRose: string
        PeachPuff: string
        darkGreen: string
    }
}

export const themes: Record<string, ThemeConfig> = {
    woosooWarm: {
        name: 'woosoo-warm',
        colors: {
            background: '#fefcfa',
            primary: '#F6B56D',
            secondary: '#8b7355',
            lightGreen: '#F6B56D',
            darkGreen: '#4AD775',
            accent: '#d4752a',
            surface: '#f8f5f1',
            textLightPrimary: '#f8f5f1',
            textLightSecondary: '#D3D3D3',
            textDarkPrimary: '#2d1b12',
            textDarkSecondary: '#6b5b4d',
            rose: '#FFA0A2',
            lightRose: '#FCCCCC',
            textLight: '#efc086',
            border: '#e8ddd4',
            success: '#4AD775',
            warning: '#FFB01D',
            error: '#dc2626',
            info: '#3b82f6',
            muted: '#D3D3D3',
            PeachPuff: '#FFD88E',
            cardBackground: '#ffffff',
            hover: '#f0e6db',
        }
    },

}

export const useTheme = () => {
    const { public: { NUXT_PUBLIC_APP_THEME } } = useRuntimeConfig()
    const defaultTheme = NUXT_PUBLIC_APP_THEME || 'woosooWarm'
    const currentThemeName = useState<string>('theme', () => defaultTheme)
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
