// import { defineNuxtConfig } from 'nuxt/config';
import path from 'path';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    // server/middleware/ is auto-scanned by Nuxt 3 — no manual registration needed.
    // Global route middleware uses .global.ts suffix (middleware/auth.global.ts).

    devtools: { enabled: process.env.NODE_ENV !== 'production' },
    
    debug: false,
    
    compatibilityDate: "2025-01-01",

    experimental: {
        payloadExtraction: false,
    },
    
    ssr: false,
    
    css: [
        "./assets/css/input.css",
        "./assets/css/main.css"
    ],
    
    modules: [
        "@pinia/nuxt",
        "pinia-plugin-persistedstate",
        "@nuxtjs/tailwindcss",
        "@nuxt/icon",
        "@nuxt/image",
        "@element-plus/nuxt",
        "@nuxt/devtools",
        "@nuxt/fonts",
        '@vite-pwa/nuxt',
        '@vueuse/motion/nuxt'
    ],
    
    components: [
        {
            path: '~/components',
            pathPrefix: false, // Allow <cart-sidebar> instead of <OrderCartSidebar>
        }
    ],
    
    typescript: {
        strict: false,
        typeCheck: false
    },

    // Build output goes to dist/ — separate from the source public/ static assets dir.
    // nginx serves from dist/; static assets in public/ are copied to dist/ on every build.
    // This prevents nuxt generate from wiping static files (icons, favicon) during builds.
    // Keep in sync with nginx root directive (apps/tablet-ordering-pwa/dist).
    nitro: {
        output: {
            publicDir: 'dist',
        },
    },

    pwa: {
        registerType: "autoUpdate",

        // Explicitly include icon files so they survive nuxt generate output
        includeAssets: [
            'favicon.ico',
            'icons/pwa-icon-192.png',
            'icons/pwa-icon-512.png',
            'icons/pwa-icon-maskable.png',
            'icons/apple-touch-icon.png',
        ],

        manifest: {
            name: "Wooserve KBBQ Ordering",
            short_name: "Wooserve",
            start_url: "/",
            display: "fullscreen",
            orientation: "landscape",
            background_color: "#0F0F0F",
            theme_color: "#F6B56D",
            icons: [
                {
                    src: "/icons/pwa-icon-192.png",
                    sizes: "192x192",
                    type: "image/png",
                    purpose: "any",
                },
                {
                    src: "/icons/pwa-icon-512.png",
                    sizes: "512x512",
                    type: "image/png",
                    purpose: "any",
                },
                {
                    src: "/icons/pwa-icon-maskable.png",
                    sizes: "512x512",
                    type: "image/png",
                    purpose: "maskable",
                },
            ],
        },
        
        workbox: {
            maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
            globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
            navigateFallback: "/",
            navigateFallbackDenylist: [/^\/api/],
            cleanupOutdatedCaches: true,
            
            runtimeCaching: [
                {
                    urlPattern: /^https:\/\/.*\/api\/menus/i,
                    handler: "NetworkFirst",
                    options: {
                        cacheName: "menus-cache",
                        expiration: {
                            maxEntries: 50,
                            maxAgeSeconds: 86400 // 1 day
                        },
                        networkTimeoutSeconds: 3,
                    },
                },
                {
                    urlPattern: /\.(png|jpg|jpeg|webp|svg)$/i,
                    handler: "CacheFirst",
                    options: {
                        cacheName: "images-cache",
                        expiration: {
                            maxEntries: 200,
                            maxAgeSeconds: 604800 // 7 days
                        },
                    },
                },
            ],
        },
        
        client: {
            installPrompt: true,
            periodicSyncForUpdates: 3600,
        },
    },
    
    vite: {
        build: {
                chunkSizeWarningLimit: 1200,
        },
        // Ensure Vite dev server listens on network interfaces and allow
        // HMR to be configured via environment variables when testing on LAN.
        server: {
            // `true` allows listening on all addresses (0.0.0.0)
            host: true,
            // Allow overriding HMR host/port when needed (e.g., testing from other devices)
            hmr: {
                host: process.env.NUXT_DEV_HMR_HOST || process.env.DEV_HMR_HOST || undefined,
                protocol: process.env.NUXT_DEV_HMR_PROTOCOL || process.env.DEV_HMR_PROTOCOL || 'ws',
                port: process.env.NUXT_DEV_HMR_PORT ? Number(process.env.NUXT_DEV_HMR_PORT) : undefined
            }
        },
        resolve: {
            alias: {
                '~': path.resolve(__dirname, './'),
                '@': path.resolve(__dirname, './')
            }
        },
        test: {
            globals: true,
            environment: 'jsdom',
            include: ['tests/**/*.spec.ts'],
            setupFiles: ['./tests/setup.ts']
        }
    },
    
    app: {
        head: {
            meta: [
                {
                    name: "viewport",
                    content: "width=device-width, height=device-height, initial-scale=1.0"
                },
                { name: 'theme-color', content: '#F6B56D' },
                { name: 'mobile-web-app-capable', content: 'yes' },
                { name: 'apple-mobile-web-app-capable', content: 'yes' },
                { name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
                { name: 'apple-mobile-web-app-title', content: 'Wooserve' },
            ],
            link: [
                { rel: 'manifest', href: '/manifest.webmanifest' },
                { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
                { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
            ],
        },
    },
    
    runtimeConfig: {
        public: {
            // App Configuration
            appVersion: process.env.APP_VERSION || '1.0.0',
            appEnv: process.env.APP_ENV || 'production',

            // API Configuration
            mainApiUrl: process.env.MAIN_API_URL || 'https://192.168.100.7:8443',
            staticBaseUrl: process.env.NUXT_APP_BASE_URL || '',

            // Broadcasting Configuration
            broadcastConnection: process.env.NUXT_PUBLIC_BROADCAST_CONNECTION || 'reverb',

            // Reverb WebSocket Configuration
            // Client connects via nginx TLS termination on port 8443 — NOT directly to Reverb (6002).
            reverb: {
                appId:      process.env.NUXT_PUBLIC_REVERB_APP_ID     || '',
                appKey:     process.env.NUXT_PUBLIC_REVERB_APP_KEY    || '',
                host:       process.env.NUXT_PUBLIC_REVERB_HOST       || '192.168.100.7',
                port:       parseInt(process.env.NUXT_PUBLIC_REVERB_PORT   || '8443'),
                scheme:     process.env.NUXT_PUBLIC_REVERB_SCHEME     || 'https',
                serverHost: process.env.NUXT_PUBLIC_REVERB_SERVER_HOST || '192.168.100.7',
                serverPort: parseInt(process.env.NUXT_PUBLIC_REVERB_SERVER_PORT || '6002'),
                serverPath: process.env.NUXT_PUBLIC_REVERB_SERVER_PATH || '',
            },

            // Laravel Echo (mirrors reverb config — kept for backwards compat)
            echo: {
                host:      process.env.NUXT_PUBLIC_ECHO_HOST      || '192.168.100.7',
                port:      parseInt(process.env.NUXT_PUBLIC_ECHO_PORT  || '8443'),
                encrypted: process.env.NUXT_PUBLIC_ECHO_ENCRYPTED === 'true',
            },
        },
    },
});