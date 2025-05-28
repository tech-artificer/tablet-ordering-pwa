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
            name: 'Tap To Order',
            short_name: 'Tap To Order',
            description: 'Tap To Order',
            theme_color: '#ffffff',
            background_color: '#ffffff',
            display: 'standalone',
            orientation: 'portrait-primary',
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
            defaultTheme: 'light'
        }
    }
})
