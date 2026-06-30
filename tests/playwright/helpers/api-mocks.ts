import type { Page } from "@playwright/test"

type ActiveOrderFixture = {
    orderId: number
    status: "in_progress" | "served"
}

const AUTH_PAYLOAD = {
    token: "e2e-playwright-device-token",
    device: { id: 1, name: "E2E Tablet" },
    table: {
        id: 1,
        name: "T1",
        status: "active",
        is_available: true,
        is_locked: false,
    },
}

function isBackendApiPath (pathname: string): boolean {
    return pathname === "/api" || pathname.startsWith("/api/")
}

export async function installRecoveryApiMocks (
    page: Page,
    activeOrder: ActiveOrderFixture
): Promise<void> {
    await page.route("**/runtime-config.js", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/javascript",
            body: "window.__APP_CONFIG__ = { apiBaseUrl: \"/api\" };",
        })
    })

    await page.route("**/build-info.json", async (route) => {
        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
                sha: "e2e-playwright",
                branch: "e2e",
                builtAt: new Date().toISOString(),
            }),
        })
    })

    await page.route("**/*", async (route) => {
        const url = new URL(route.request().url())
        if (!isBackendApiPath(url.pathname)) {
            await route.fallback()
            return
        }

        if (url.pathname.includes("/api/device-orders")) {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({
                    data: [{
                        order_id: activeOrder.orderId,
                        id: activeOrder.orderId,
                        status: activeOrder.status,
                        created_at: new Date().toISOString(),
                    }],
                }),
            })
            return
        }

        if (url.pathname.includes("/api/devices/login") || url.pathname.includes("/api/devices/refresh")) {
            await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify(AUTH_PAYLOAD),
            })
            return
        }

        await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ data: [] }),
        })
    })
}
