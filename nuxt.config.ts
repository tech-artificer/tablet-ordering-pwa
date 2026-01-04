// import { defineNuxtConfig } from 'nuxt/config';
import path from 'path';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: true },
    
    debug: true,
    
    compatibilityDate: "2025-01-01",
    
    ssr: false,
    
    router: {
        middleware: ['auth']
    },
    
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
        '@vite-pwa/nuxt'
    ],
    
    typescript: {
        strict: false,
        typeCheck: false
    },
    
    pwa: {
        registerType: "autoUpdate",
        
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
                },
                {
                    src: "/icons/pwa-icon-512.png",
                    sizes: "512x512",
                    type: "image/png",
                },
            ],
        },
        
        workbox: {
            maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
            globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
            navigateFallback: "/",
            navigateFallbackDenylist: [/^\/api/],
            
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
            periodicSyncForUpdates: 50,
        },
    },
    
    vite: {
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
                    content: "width=device-width, height=device-height, user-scalable=no, initial-scale=1.0, maximum-scale=1.0"
                },
                { name: 'theme-color', content: '#F6B56D' },
                { name: 'apple-mobile-web-app-capable', content: 'yes' },
                { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }
            ],
            link: [
                { rel: 'manifest', href: '/manifest.webmanifest' }
            ],
        },
    },
    
    runtimeConfig: {
        public: {
            // App Configuration
            appVersion: process.env.APP_VERSION || '1.0.0',
            appEnv: process.env.APP_ENV || 'development',
            
            // API Configuration
            mainApiUrl: process.env.MAIN_API_URL || "http://localhost:8000/api",
            staticBaseUrl: process.env.NUXT_APP_BASE_URL || '',
            
            // Broadcasting Configuration
            broadcastConnection: process.env.NUXT_PUBLIC_BROADCAST_CONNECTION || "pusher",
            
            // Reverb Configuration
            reverb: {
                appId: process.env.NUXT_PUBLIC_REVERB_APP_ID || '',
                appKey: process.env.NUXT_PUBLIC_REVERB_APP_KEY || '',
                host: process.env.NUXT_PUBLIC_REVERB_HOST || 'localhost',
                port: parseInt(process.env.NUXT_PUBLIC_REVERB_PORT || "6001"),
                scheme: process.env.NUXT_PUBLIC_REVERB_SCHEME || 'http',
                serverHost: process.env.NUXT_PUBLIC_REVERB_SERVER_HOST || 'localhost',
                serverPort: parseInt(process.env.NUXT_PUBLIC_REVERB_SERVER_PORT || "6001"),
                serverPath: process.env.NUXT_PUBLIC_REVERB_SERVER_PATH || "",
            },
            
            // Laravel Echo Configuration
            echo: {
                host: process.env.NUXT_PUBLIC_ECHO_HOST || 'localhost',
                port: parseInt(process.env.NUXT_PUBLIC_ECHO_PORT || "6001"),
                encrypted: process.env.NUXT_PUBLIC_ECHO_ENCRYPTED === "true",
            },
        },
    },
});