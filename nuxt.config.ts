// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2025-05-15',
    devtools: { enabled: true },
    ssr: false,
    css: ['~/assets/css/main.css'],
    modules: [
        '@pinia/nuxt',
        'pinia-plugin-persistedstate',
        '@nuxtjs/tailwindcss',
        '@nuxt/icon',
        '@nuxt/image',
        '@nuxt/eslint',
        '@element-plus/nuxt',
        'nuxt-charts',
        '@vite-pwa/nuxt',
        '@nuxt/devtools'
    ],
    pwa: {
        registerType: 'autoUpdate',
        workbox: {
            navigateFallback: '/',
            globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        },
        client: {
            installPrompt: true,
        },
        devOptions: {
            enabled: true,
            suppressWarnings: true,
            navigateFallbackAllowlist: [/^\/$/],
            type: 'module',
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        disable: false,
        manifest: {
            name: process.env.NUXT_PUBLIC_APP_NAME,
            short_name: process.env.NUXT_PUBLIC_APP_NAME,
            description: process.env.NUXT_PUBLIC_APP_DESCRIPTION,
            theme_color: process.env.NUXT_PUBLIC_THEME_COLOR,
            background_color: process.env.NUXT_PUBLIC_BACKGROUND_COLOR,
            display: process.env.NUXT_PUBLIC_DISPLAY_NAME,
            orientation: process.env.NUXT_PUBLIC_ORIENTATION,
            icons: [
                {
                    src: '/icons/android-launchericon-48-48.png',
                    sizes: '48x48',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/icons/android-launchericon-72-72.png',
                    sizes: '72x72',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/icons/android-launchericon-96-96.png',
                    sizes: '96x96',
                    type: 'image/png',
                    purpose: 'maskable'
                },
                {
                    src: '/icons/android-launchericon-144-144.png',
                    sizes: '144x144',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/icons/android-launchericon-192-192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any'
                },
                {
                    src: '/icons/android-launchericon-512-512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any'
                }
            ]
        }
    },
    runtimeConfig: {
        public: {
            APP_NAME: process.env.APP_NAME,
            APP_SHORT_NAME: process.env.APP_SHORT_NAME,
            APP_DESCRIPTION: process.env.APP_DESCRIPTION,
            MAIN_API_URL: process.env.MAIN_API_URL,
            defaultTheme: process.env.NUXT_PUBLIC_APP_THEME,
        }
    },
    build: {
        transpile: ['pinia-plugin-persistedstate']
    },
})
