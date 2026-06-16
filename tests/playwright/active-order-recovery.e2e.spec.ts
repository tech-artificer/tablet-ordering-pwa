import { test, expect } from "@playwright/test"
import {
    ACTIVE_ORDER_RECOVERY_STATUS_PARAM,
    seedPiniaPersistenceScript
} from "./helpers/pinia-seed"
import { installRecoveryApiMocks } from "./helpers/api-mocks"

test.describe("TAB-CASE-011 active-order recovery (mocked API)", () => {
    test.beforeEach(async ({ context }) => {
        await context.addInitScript(seedPiniaPersistenceScript())
    })

    test("GET /api/device-orders uses five-status param on welcome bootstrap", async ({ page }) => {
        await installRecoveryApiMocks(page, { orderId: 42, status: "in_progress" })

        const deviceOrdersRequest = page.waitForRequest((req) => {
            return req.method() === "GET" && req.url().includes("/api/device-orders")
        })

        await page.goto("/")
        const request = await deviceOrdersRequest
        const statusParam = new URL(request.url()).searchParams.get("status")

        expect(statusParam).toBe(ACTIVE_ORDER_RECOVERY_STATUS_PARAM)
    })

    test("recovers in_progress order and resumes to /menu", async ({ page }) => {
        await installRecoveryApiMocks(page, { orderId: 42, status: "in_progress" })

        await page.goto("/")
        await page.waitForURL("**/menu**", { timeout: 30_000 })

        expect(page.url()).toContain("/menu")
        expect(page.url()).toContain("resumeMenu=1")

        const sessionStoreRaw = await page.evaluate(() => localStorage.getItem("session-store"))
        expect(sessionStoreRaw).toBeTruthy()
        const sessionStore = JSON.parse(sessionStoreRaw as string) as { orderId?: number | null }
        expect(sessionStore.orderId).toBe(42)
    })

    test("recovers served order and resumes to /menu", async ({ page }) => {
        await installRecoveryApiMocks(page, { orderId: 77, status: "served" })

        await page.goto("/")
        await page.waitForURL("**/menu**", { timeout: 30_000 })

        const sessionStoreRaw = await page.evaluate(() => localStorage.getItem("session-store"))
        const sessionStore = JSON.parse(sessionStoreRaw as string) as { orderId?: number | null }
        expect(sessionStore.orderId).toBe(77)
    })
})
