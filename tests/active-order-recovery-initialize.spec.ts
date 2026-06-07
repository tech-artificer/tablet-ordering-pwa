import { vi, describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"

import {
    useOrderStore,
    ACTIVE_ORDER_RECOVERY_STATUS_PARAM
} from "../stores/Order"
import { useSessionStore } from "../stores/Session"
import { useDeviceStore } from "../stores/Device"
import { API_ENDPOINTS } from "../config/api"

const mockGet = vi.fn()

vi.mock("../composables/useApi", () => ({
    useApi: () => ({ get: mockGet }),
}))

vi.mock("../utils/logger", () => ({
    logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe("initializeFromSession active-order recovery (TAB-CASE-011)", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockGet.mockReset()
        mockGet.mockResolvedValue({ data: { data: [] } })
    })

    it("queries device-orders with the five-status recovery param when session has no orderId", async () => {
        const device = useDeviceStore()
        device.setToken("device-token")

        const order = useOrderStore()
        await order.initializeFromSession()

        expect(mockGet).toHaveBeenCalledOnce()
        expect(mockGet).toHaveBeenCalledWith(API_ENDPOINTS.DEVICE_ORDERS, {
            params: {
                status: ACTIVE_ORDER_RECOVERY_STATUS_PARAM,
                per_page: 1,
            },
        })
    })

    it("recovers an in_progress order into session and server state", async () => {
        const device = useDeviceStore()
        device.setToken("device-token")

        mockGet.mockResolvedValueOnce({
            data: {
                data: [{
                    order_id: 42,
                    status: "in_progress",
                    created_at: new Date().toISOString(),
                }],
            },
        })

        const order = useOrderStore()
        const session = useSessionStore()

        await order.initializeFromSession()

        expect(session.getOrderId()).toBe(42)
        expect(order.serverOrderId).toBe(42)
        expect(String(order.serverStatus)).toBe("in_progress")
    })
})
