import { describe, it, expect, beforeEach, vi } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useDeviceStore } from "~/stores/Device"

const mockPost = vi.fn()

vi.mock("~/composables/useApi", () => ({
    useApi: () => ({ post: mockPost, get: vi.fn() }),
}))

vi.mock("~/utils/logger", () => ({
    logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const FIFTEEN_MIN_MS = 15 * 60 * 1000

function freshAuthResponse () {
    return {
        data: {
            token: "new-token",
            device: { id: 1, name: "T1" },
            table: { id: 1, name: "T1", status: "open", is_available: true, is_locked: false },
            expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        },
    }
}

describe("Device store — checkTokenExpiry (P1: boot-time stale token)", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockPost.mockReset()
    })

    it("calls refresh when token is already expired", async () => {
        mockPost.mockResolvedValueOnce(freshAuthResponse())
        const device = useDeviceStore()
        ;(device as any).token = "stale-token"
        ;(device as any).expiration = Date.now() - 1000

        device.checkTokenExpiry()

        await new Promise(resolve => setTimeout(resolve, 0))
        expect(mockPost).toHaveBeenCalledWith("/api/devices/refresh")
    })

    it("calls refresh when token is within the 15-minute threshold", async () => {
        mockPost.mockResolvedValueOnce(freshAuthResponse())
        const device = useDeviceStore()
        ;(device as any).token = "near-expiry-token"
        ;(device as any).expiration = Date.now() + FIFTEEN_MIN_MS - 1000

        device.checkTokenExpiry()

        await new Promise(resolve => setTimeout(resolve, 0))
        expect(mockPost).toHaveBeenCalledWith("/api/devices/refresh")
    })

    it("does not call refresh when token is fresh", () => {
        const device = useDeviceStore()
        ;(device as any).token = "fresh-token"
        ;(device as any).expiration = Date.now() + FIFTEEN_MIN_MS + 60_000

        device.checkTokenExpiry()

        expect(mockPost).not.toHaveBeenCalled()
    })

    it("does nothing when no token is present", () => {
        const device = useDeviceStore()
        device.checkTokenExpiry()
        expect(mockPost).not.toHaveBeenCalled()
    })

    it("does not issue a second refresh call when one is already in flight", async () => {
        let resolveFirst!: () => void
        const firstCall = new Promise<ReturnType<typeof freshAuthResponse>>((resolve) => { resolveFirst = () => resolve(freshAuthResponse()) })
        mockPost.mockReturnValueOnce(firstCall).mockResolvedValueOnce(freshAuthResponse())

        const device = useDeviceStore()
        ;(device as any).token = "stale-token"
        ;(device as any).expiration = Date.now() - 1000

        device.checkTokenExpiry()
        device.checkTokenExpiry()

        await new Promise(resolve => setTimeout(resolve, 0))
        expect(mockPost).toHaveBeenCalledTimes(1)

        resolveFirst()
        await new Promise(resolve => setTimeout(resolve, 0))
    })

    it("clears errorMessage after a failed boot-time refresh", async () => {
        mockPost.mockRejectedValueOnce(new Error("Network error"))
        const device = useDeviceStore()
        ;(device as any).token = "stale-token"
        ;(device as any).expiration = Date.now() - 1000

        device.checkTokenExpiry()

        await new Promise(resolve => setTimeout(resolve, 10))
        expect(device.errorMessage).toBeNull()
    })
})
