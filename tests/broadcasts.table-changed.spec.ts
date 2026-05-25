import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { useBroadcasts } from "~/composables/useBroadcasts"
import { useDeviceStore } from "~/stores/Device"

// vi.hoisted ensures refs are initialised before vi.mock() factories run
const { mockElNotification, mockElMessage, mockPost } = vi.hoisted(() => {
    const elMsg = Object.assign(vi.fn(), {
        warning: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        info: vi.fn(),
    })
    return {
        mockElNotification: vi.fn(),
        mockElMessage: elMsg,
        mockPost: vi.fn(),
    }
})

vi.mock("element-plus", () => ({
    ElNotification: mockElNotification,
    ElMessage: mockElMessage,
}))

vi.mock("~/composables/useApi", () => ({
    useApi: () => ({ get: vi.fn(), post: mockPost }),
}))

vi.mock("vue-router", () => ({
    useRouter: () => ({ replace: vi.fn() }),
}))

// ─── Fixtures ────────────────────────────────────────────────────────────────

const NON_NULL_TABLE_RESPONSE = {
    data: {
        success: true,
        token: "fresh-token",
        device: { id: 1, name: "Test Device" },
        table: { id: 5, name: "Table 5", status: "active", is_available: true, is_locked: false },
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    },
}

const NULL_TABLE_RESPONSE = {
    data: {
        success: true,
        token: "fresh-token",
        device: { id: 1, name: "Test Device" },
        table: null,
        expires_at: new Date(Date.now() + 3_600_000).toISOString(),
    },
}

/** Flush all queued microtasks and one macrotask tick */
function flushPromises (): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0))
}

// ─── Echo mock ───────────────────────────────────────────────────────────────

let capturedListeners: Record<string, (...args: any[]) => unknown> = {}

function setupEcho () {
    capturedListeners = {}
    const makeChannel = () => {
        const ch: any = {
            name: "device.1",
            listen (event: string, cb: (...args: any[]) => unknown) {
                capturedListeners[event] = cb
                return ch
            },
        }
        return ch
    }
    ;(window as any).Echo = {
        channel: () => makeChannel(),
        leave: vi.fn(),
    }
}

function setupDevice (device: ReturnType<typeof useDeviceStore>) {
    device.setToken("test-token")
    ;(device as any).device = { id: 1, name: "Test Device" }
    ;(device as any).expiration = Date.now() + 3_600_000
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useBroadcasts — table_changed handler", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockElNotification.mockReset()
        mockElMessage.warning.mockReset()
        mockElMessage.info.mockReset()
        mockPost.mockReset()
        mockPost.mockResolvedValue(NON_NULL_TABLE_RESPONSE)
        setupEcho()
    })

    it("fires POST /api/devices/refresh when table_changed is received", async () => {
        const device = useDeviceStore()
        setupDevice(device)

        const { initializeBroadcasts, cleanup } = useBroadcasts()
        initializeBroadcasts()

        expect(capturedListeners[".device.control"]).toBeDefined()

        capturedListeners[".device.control"]!({ action: "table_changed", payload: {}, deviceId: 1 })
        await flushPromises()

        expect(mockPost).toHaveBeenCalledWith("/api/devices/refresh")

        cleanup()
    })

    it("shows ElNotification (not ElMessage.warning) when refresh resolves to a non-null table", async () => {
        mockPost.mockResolvedValue(NON_NULL_TABLE_RESPONSE)
        const device = useDeviceStore()
        setupDevice(device)

        const { initializeBroadcasts, cleanup } = useBroadcasts()
        initializeBroadcasts()

        capturedListeners[".device.control"]!({ action: "table_changed", payload: {}, deviceId: 1 })
        await flushPromises()

        expect(mockElNotification).toHaveBeenCalledWith(
            expect.objectContaining({ title: "Table Updated" })
        )
        expect(mockElMessage.warning).not.toHaveBeenCalled()

        cleanup()
    })

    it("shows ElMessage.warning (not Table Updated notification) when refresh resolves to a null table", async () => {
        mockPost.mockResolvedValue(NULL_TABLE_RESPONSE)
        const device = useDeviceStore()
        setupDevice(device)

        const { initializeBroadcasts, cleanup } = useBroadcasts()
        initializeBroadcasts()

        capturedListeners[".device.control"]!({ action: "table_changed", payload: {}, deviceId: 1 })
        await flushPromises()

        expect(mockElMessage.warning).toHaveBeenCalledWith(
            "Table assignment removed. Contact an administrator."
        )
        expect(mockElNotification).not.toHaveBeenCalledWith(
            expect.objectContaining({ title: "Table Updated" })
        )

        cleanup()
    })
})
