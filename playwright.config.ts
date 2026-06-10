import { defineConfig, devices } from "@playwright/test"

const PORT = Number(process.env.PLAYWRIGHT_PORT || 3000)
const baseURL = `http://127.0.0.1:${PORT}`

export default defineConfig({
    testDir: "tests/playwright",
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [["list"]],
    timeout: 60_000,
    use: {
        baseURL,
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        serviceWorkers: "block",
        viewport: { width: 1280, height: 800 },
    },
    projects: [
        {
            name: "tablet-landscape",
            use: { ...devices["Desktop Chrome"] },
        },
    ],
    webServer: {
        command: `npx nuxi dev --host 127.0.0.1 --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
    },
})
