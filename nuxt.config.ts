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
        '@nuxt/fonts'
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
            appVersion: process.env.APP_VERSION,
            MAIN_API_URL: process.env.MAIN_API_URL,

            NUXT_PUBLIC_BROADCAST_CONNECTION: process.env.NUXT_PUBLIC_BROADCAST_CONNECTION,
            NUXT_PUBLIC_REVERB_APP_ID: process.env.NUXT_PUBLIC_REVERB_APP_ID,
            NUXT_PUBLIC_REVERB_APP_KEY: process.env.NUXT_PUBLIC_REVERB_APP_KEY,
            NUXT_PUBLIC_REVERB_APP_SECRET: process.env.NUXT_PUBLIC_REVERB_APP_SECRET,
            NUXT_PUBLIC_REVERB_HOST: process.env.NUXT_PUBLIC_REVERB_HOST,
            NUXT_PUBLIC_REVERB_PORT: process.env.NUXT_PUBLIC_REVERB_PORT,
            NUXT_PUBLIC_REVERB_SCHEME: process.env.NUXT_PUBLIC_REVERB_SCHEME,
        },
    },
})
