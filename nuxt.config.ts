// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: true },
    compatibilityDate: '2025-06-01',
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
        '@nuxt/devtools',
        '@nuxt/fonts',
        'nuxt-lucide-icons'
    ],

    fonts: {
        families: [
            { name: 'Kanit', provider: 'google', weights: [300, 400, 500, 600, 700] },
            { name: 'Inter', provider: 'google', weights: [300, 400, 500, 600, 700] },
            { name: 'Raleway', provider: 'google', weights: [300, 400, 500, 600, 700] }
        ]
    },

    app: {
        head: {
            link: [
                { rel: 'manifest', href: '/manifest.json' }
            ]
        }
    },

    runtimeConfig: {
        public: {
            // App Configuration
            appVersion: process.env.APP_VERSION,
            appEnv: process.env.APP_ENV,
            // API Configuration
            mainApiUrl: process.env.MAIN_API_URL,
            staticBaseUrl: process.env.CLIENT_BASE_URL,
            // Broadcasting Configuration
            broadcastConnection: process.env.NUXT_PUBLIC_BROADCAST_CONNECTION,
            // Reverb Configuration
            reverb: {
                appId: process.env.NUXT_PUBLIC_REVERB_APP_ID,
                appKey: process.env.NUXT_PUBLIC_REVERB_APP_KEY,
                appSecret: process.env.NUXT_PUBLIC_REVERB_APP_SECRET,
                host: process.env.NUXT_PUBLIC_REVERB_HOST,
                port: parseInt(process.env.NUXT_PUBLIC_REVERB_PORT || '8081'),
                scheme: process.env.NUXT_PUBLIC_REVERB_SCHEME,
                serverHost: process.env.NUXT_PUBLIC_REVERB_SERVER_HOST,
                serverPort: parseInt(process.env.NUXT_PUBLIC_REVERB_SERVER_PORT || '8081'),
                serverPath: process.env.NUXT_PUBLIC_REVERB_SERVER_PATH,
            },
            // Laravel Echo Configuration
            echo: {
                host: process.env.NUXT_PUBLIC_ECHO_HOST,
                port: parseInt(process.env.NUXT_PUBLIC_ECHO_PORT || '8081'),
                encrypted: process.env.NUXT_PUBLIC_ECHO_ENCRYPTED === 'true'
            }
        }
    },
})