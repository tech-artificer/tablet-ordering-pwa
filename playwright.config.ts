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
            // Re-apply the landscape viewport after the device spread — the
            // "Desktop Chrome" preset carries its own 1280x720 viewport that
            // would otherwise override the top-level use.viewport above.
            use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
        },
    ],
    webServer: {
        command: `npx nuxi dev --host 127.0.0.1 --port ${PORT}`,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
    },
})
