// import { defineNuxtConfig } from 'nuxt/config';
import "dotenv/config"
import { readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

function readBooleanEnv (name: string, defaultValue = false): boolean {
    const value = process.env[name]

    if (value === undefined || value === "") {
        return defaultValue
    }

    return ["1", "true", "yes", "on"].includes(value.toLowerCase())
}

const enableNuxtDevtools = process.env.NODE_ENV !== "production" && readBooleanEnv("NUXT_DEVTOOLS", false)

async function normalizeWindowsDevClientManifestPaths (buildDir: string): Promise<void> {
    if (process.platform !== "win32") {
        return
    }

    const workspacePrefix = `${process.cwd().replace(/\\/g, "/")}/`
    const manifestFiles = [
        resolve(buildDir, "dist/server/client.manifest.mjs"),
        resolve(buildDir, "dist/server/client.precomputed.mjs"),
    ]

    await Promise.all(manifestFiles.map(async (filePath) => {
        try {
            const original = await readFile(filePath, "utf8")
            const normalized = original.split(workspacePrefix).join("")

            if (normalized !== original) {
                await writeFile(filePath, normalized, "utf8")
            }
        } catch {
            // The files are generated only after Nuxt finishes preparing the dev client manifest.
        }
    }))
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devtools: { enabled: enableNuxtDevtools },

    hooks: {
        "build:done": async () => {
            await normalizeWindowsDevClientManifestPaths(resolve(process.cwd(), ".nuxt"))
        },
    },

    debug: false,

    compatibilityDate: "2025-01-01",

    experimental: {
        payloadExtraction: false,
    },

    ssr: false,

    router: {
        middleware: ["auth"]
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
        ...(enableNuxtDevtools ? ["@nuxt/devtools"] : []),
        "@nuxt/fonts",
        "@vite-pwa/nuxt",
        "@vueuse/motion/nuxt"
    ],

    fonts: {
        // Disable external CDN providers to avoid firewall blocks in CI/agent environments
        providers: {
            google: false,
            bunny: false,
            fontshare: false,
            fontsource: false,
        },
        // Use only local/system fonts
        defaults: {
            styles: ["normal"],
            subsets: ["latin"],
        },
    },

    components: [
        {
            path: "~/components",
            pathPrefix: false, // Allow <cart-sidebar> instead of <OrderCartSidebar>
        }
    ],

    typescript: {
        strict: false,
        typeCheck: false
    },

    nitro: {
        prerender: {
            crawlLinks: false,
            routes: ["/"],
        },
    },

    pwa: {
        registerType: "autoUpdate",

        // Explicitly include icon files so they survive nuxt generate output
        includeAssets: [
            "favicon.ico",
            "icons/pwa-icon-192.png",
            "icons/pwa-icon-512.png",
            "icons/pwa-icon-maskable.png",
            "icons/apple-touch-icon.png",
        ],

        manifest: {
            name: "Woosoo Grillpad",
            short_name: "Grillpad",
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

        // Custom service worker via injectManifest strategy.
        // BackgroundSyncPlugin and precaching are handled in public/sw.ts.
        strategies: "injectManifest" as const,
        srcDir: "public",
        filename: "sw.ts",

        // Keep existing runtime caching config for menus and images in the injectManifest
        // by referencing it from the custom SW. The workbox key is unused in injectManifest mode.
        injectManifest: {
            maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
            globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"],
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
                protocol: process.env.NUXT_DEV_HMR_PROTOCOL || process.env.DEV_HMR_PROTOCOL || "ws",
                port: process.env.NUXT_DEV_HMR_PORT ? Number(process.env.NUXT_DEV_HMR_PORT) : undefined
            }
        },
    },

    app: {
        // Cross-fade (no "out-in") so the entering page mounts immediately and
        // overlaps the leaving page — eliminates the perceived "blank gap" between
        // routes. The leaving page is positioned absolutely via CSS so the two
        // siblings can coexist without affecting layout.
        pageTransition: {
            name: "page-fade",
        },
        head: {
            script: [
                { src: "/runtime-config.js", async: false, defer: false },
            ],
            meta: [
                {
                    name: "viewport",
                    content: "width=device-width, height=device-height, initial-scale=1.0"
                },
                { name: "theme-color", content: "#F6B56D" },
                { name: "mobile-web-app-capable", content: "yes" },
                { name: "apple-mobile-web-app-capable", content: "yes" },
                { name: "apple-mobile-web-app-status-bar-style", content: "black" },
                { name: "apple-mobile-web-app-title", content: "Grillpad" },
            ],
            link: [
                { rel: "manifest", href: "/manifest.webmanifest" },
                { rel: "icon", href: "/favicon.ico", sizes: "any" },
                { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
            ],
        },
    },

    runtimeConfig: {
        public: {
            // App Configuration
            appVersion: process.env.APP_VERSION || process.env.NUXT_PUBLIC_APP_VERSION || "1.0.0",
            appEnv: process.env.APP_ENV || process.env.NODE_ENV || "production",
            buildSha: process.env.BUILD_SHA || "unknown",
            buildBranch: process.env.BUILD_BRANCH || "unknown",
            buildTime: process.env.BUILD_TIME || new Date().toISOString(),

            // Feature Flags
            offlineOrderSync: process.env.NUXT_PUBLIC_OFFLINE_ORDER_SYNC === "true",

            // API Configuration
            apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL || "/api",
            staticBaseUrl: process.env.NUXT_APP_BASE_URL || "",
            deviceAuthPasscode: process.env.NUXT_PUBLIC_DEVICE_AUTH_PASSCODE || "",

            // Settings PIN lock behavior
            settingsPinBackgroundTimeoutMs: parseInt(process.env.NUXT_PUBLIC_SETTINGS_PIN_BACKGROUND_TIMEOUT_MS || "120000"),

            // Broadcasting Configuration
            broadcastConnection: process.env.NUXT_PUBLIC_BROADCAST_CONNECTION || "reverb",

            // Reverb WebSocket Configuration
            // In production (Docker), these are injected by docker-compose.yml
            // In development (local), fallbacks provide sensible defaults
            reverb: {
                appId: process.env.NUXT_PUBLIC_REVERB_APP_ID || "woosoo",
                appKey: process.env.NUXT_PUBLIC_REVERB_APP_KEY || "",
                host: process.env.NUXT_PUBLIC_REVERB_HOST || "",
                port: parseInt(process.env.NUXT_PUBLIC_REVERB_PORT || "0"),
                scheme: process.env.NUXT_PUBLIC_REVERB_SCHEME || "http",
                path: process.env.NUXT_PUBLIC_REVERB_PATH || "/app",
            },
        },
    },
})
