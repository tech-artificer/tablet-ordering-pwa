import fs from 'node:fs'; // Import fs module for reading files
import path from 'path'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: true },
    debug: true,
    compatibilityDate: '2025-06-01',
    ssr: false,
    css: ['~/assets/css/main.css'],
    // devServer: {
    //     https: {
    //         key: process.env.NUXT_DEV_SERVER_HTTPS_KEY,
    //         cert: process.env.NUXT_DEV_SERVER_HTTPS_CERT
    //     }
    // },
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

    pwa: {
        "name": "Woosoo",
        "short_name": "Woosoo",
        "description": "Woosoo tablet",
        "start_url": "/",
        "display": "fullscreen",
        "background_color": "#ffffff",
        "theme_color": "#000000",
        "orientation": "landscape",
        "orientation-lock": "landscape",
        "icons": [
            {
                "src": "/icons/android-launchericon-192-192.png",
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": "/icons/android-launchericon-512-512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any"
            },
            {
                "src": "/icons/android-launchericon-512-512.png",
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "maskable"
            }
        ]
    },

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

    // devServer: {
    //     // https: {
    //     //     key: '../certs/localhost-key.pem',
    //     //     cert: '../certs/localhost.pem'
    //     // }
    // },

    runtimeConfig: {
        public: {
            // App Configuration
            appVersion: process.env.APP_VERSION,
            appEnv: process.env.APP_ENV,

            // API Configuration    
            mainApiUrl: process.env.MAIN_API_URL,
            staticBaseUrl: process.env.NUXT_APP_BASE_URL,

            // Broadcasting Configuration
            broadcastConnection: process.env.NUXT_PUBLIC_BROADCAST_CONNECTION,

            // Reverb Configuration
            reverb: {
                appId: process.env.NUXT_PUBLIC_REVERB_APP_ID,
                appKey: process.env.NUXT_PUBLIC_REVERB_APP_KEY,
                host: process.env.NUXT_PUBLIC_REVERB_HOST,
                port: parseInt(process.env.NUXT_PUBLIC_REVERB_PORT || '6001'),
                scheme: process.env.NUXT_PUBLIC_REVERB_SCHEME,
                serverHost: process.env.NUXT_PUBLIC_REVERB_SERVER_HOST,
                serverPort: parseInt(process.env.NUXT_PUBLIC_REVERB_SERVER_PORT || '6001'),
                serverPath: process.env.NUXT_PUBLIC_REVERB_SERVER_PATH || '',
            },
            // Laravel Echo Configuration
            echo: {
                host: process.env.NUXT_PUBLIC_ECHO_HOST,
                port: parseInt(process.env.NUXT_PUBLIC_ECHO_PORT || '6001'),
                encrypted: process.env.NUXT_PUBLIC_ECHO_ENCRYPTED === 'true'
            }
        }
    },
})
