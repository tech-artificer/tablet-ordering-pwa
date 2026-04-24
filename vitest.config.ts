import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            "~": fileURLToPath(new URL(".", import.meta.url)),
            "@": fileURLToPath(new URL(".", import.meta.url)),
            "#app": fileURLToPath(new URL("./tests/mocks/nuxt-app.ts", import.meta.url)),
        },
    },
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: "tests/setup.ts",
        include: [
            "tests/**/*.spec.ts",
            "tests/**/*.spec.tsx",
            "tests/**/*.spec.js",
            "tests/**/*.test.ts",
            "tests/**/*.test.tsx",
            "tests/**/*.test.js",
            "tests/**/*.ui.spec.ts",
        ]
    }
})
