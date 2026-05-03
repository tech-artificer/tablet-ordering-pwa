import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { unref } from "vue"

import { useSessionStore } from "../stores/Session"
import { useOrderStore } from "../stores/Order"
import { useDeviceStore } from "../stores/Device"

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockLoadAllMenus = vi.fn()

vi.mock("../composables/useApi", () => ({
    useApi: () => ({
        get: mockGet,
        post: mockPost,
    }),
}))

vi.mock("../stores/Menu", () => ({
    useMenuStore: () => ({
        loadAllMenus: mockLoadAllMenus,
    }),
}))

describe("session start flow", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockGet.mockReset()
        mockPost.mockReset()
        mockLoadAllMenus.mockReset()

        mockGet.mockResolvedValue({ data: null })
        mockPost.mockResolvedValue({ data: {} })
        mockLoadAllMenus.mockResolvedValue(undefined)
    })

    it("preserves selected guestCount and package when starting session from package selection", async () => {
        const session = useSessionStore()
        const order = useOrderStore()
        const device = useDeviceStore()

        device.setToken("test-device-token")
        ;(device as any).expiration = Date.now() + 60 * 60 * 1000

        order.setGuestCount(6)
        order.setPackage({
            id: 101,
            name: "Premium Grill",
            price: 799,
            modifiers: [],
            is_taxable: false,
            tax: { percentage: 0 },
        } as any)

        const started = await session.start({ preserveSelection: true })

        expect(started).toBe(true)
        expect(order.guestCount).toBe(6)
        expect(unref(order.package)?.id).toBe(101)
    })

    it("resets guestCount and package by default when starting a fresh session", async () => {
        const session = useSessionStore()
        const order = useOrderStore()
        const device = useDeviceStore()

        device.setToken("test-device-token")
        ;(device as any).expiration = Date.now() + 60 * 60 * 1000

        order.setGuestCount(9)
        order.setPackage({
            id: 202,
            name: "Reset Check Package",
            price: 999,
            modifiers: [],
            is_taxable: false,
            tax: { percentage: 0 },
        } as any)

        const started = await session.start()

        expect(started).toBe(true)
        expect(order.guestCount).toBe(2)
        expect(order.package).toBeNull()
    })
})
