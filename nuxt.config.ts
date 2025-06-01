// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
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
        '@nuxt/devtools',
        '@nuxt/fonts'
    ],
    fonts: {
        provider: 'google',
        google: {
            families: {
                Inter: [300, 400, 500, 600, 700],
                Kanit: [300, 400, 500, 600, 700],
                Raleway: [300, 400, 500, 600, 700],
            }
        }
    },
    app: {
        head: {
            link: [
            { rel: 'manifest', href: '/manifest.json' }
            ]
        }
    }
})
