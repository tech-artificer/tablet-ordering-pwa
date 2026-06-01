import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"
import { useBroadcasts } from "~/composables/useBroadcasts"
import { useConnectionStore } from "~/stores/Connection"
import { useDeviceStore } from "~/stores/Device"

vi.mock("element-plus", () => ({
    ElNotification: vi.fn(),
    ElMessage: Object.assign(vi.fn(), {
        warning: vi.fn(),
        error: vi.fn(),
        success: vi.fn(),
        info: vi.fn(),
    }),
}))

vi.mock("~/composables/useApi", () => ({
    useApi: () => ({ get: vi.fn(), post: vi.fn() }),
}))

vi.mock("vue-router", () => ({
    useRouter: () => ({ replace: vi.fn() }),
}))

// ─── Constants (must match useBroadcasts internals) ──────────────────────────

const WATCHDOG_INTERVAL_MS = 30_000
const WATCHDOG_SILENCE_THRESHOLD_MS = 180_000

// ─── Echo mock ───────────────────────────────────────────────────────────────

let capturedListeners: Record<string, (...args: any[]) => unknown> = {}
let capturedConnectionHandlers: Record<string, (...args: any[]) => unknown> = {}
let mockDisconnect: ReturnType<typeof vi.fn>

function setupEcho () {
    capturedListeners = {}
    capturedConnectionHandlers = {}
    mockDisconnect = vi.fn()
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
        connector: {
            pusher: {
                connection: {
                    disconnect: mockDisconnect,
                    bind: vi.fn((event: string, cb: (...args: any[]) => unknown) => {
                        capturedConnectionHandlers[event] = cb
                    }),
                    unbind: vi.fn((event: string) => {
                        delete capturedConnectionHandlers[event]
                    }),
                },
            },
        },
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("useBroadcasts — silent-death watchdog", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        vi.useFakeTimers()
        setupEcho()
    })

    afterEach(() => {
        vi.useRealTimers()
        delete (window as any).Echo
    })

    it("forces disconnect after 3 min of silence while nominally connected (zombie)", () => {
        const connectionStore = useConnectionStore()
        connectionStore.setReverbState("connected")

        const { initializeBroadcasts, cleanup } = useBroadcasts()
        initializeBroadcasts()

        // Advance past the silence threshold without firing any events
        vi.advanceTimersByTime(WATCHDOG_SILENCE_THRESHOLD_MS + WATCHDOG_INTERVAL_MS)

        expect(mockDisconnect).toHaveBeenCalledTimes(1)

        cleanup()
    })

    it("does NOT disconnect when events keep arriving within the threshold", () => {
        const connectionStore = useConnectionStore()
        connectionStore.setReverbState("connected")

        // Device must be set so subscribeToDeviceChannel() captures the listener
        const device = useDeviceStore()
        device.setToken("test-token")
        ;(device as any).device = { id: 1, name: "Test Device" }
        ;(device as any).expiration = Date.now() + 3_600_000

        const { initializeBroadcasts, cleanup } = useBroadcasts()
        initializeBroadcasts()

        // Fire an event every 2 minutes — well within the 3-min threshold
        const TICK_MS = 120_000
        const iterations = Math.ceil((WATCHDOG_SILENCE_THRESHOLD_MS + WATCHDOG_INTERVAL_MS) / TICK_MS) + 1
        for (let i = 0; i < iterations; i++) {
            capturedListeners[".device.control"]?.({
                action: "message",
                payload: { message: "ping" },
                deviceId: 1,
            })
            vi.advanceTimersByTime(TICK_MS)
        }

        expect(mockDisconnect).not.toHaveBeenCalled()

        cleanup()
    })

    it("does NOT disconnect a healthy idle socket kept alive by transport traffic only", () => {
        // A quiet tablet receives zero app-level broadcasts but the transport stays
        // healthy — the server's ping/pong keepalive surfaces as connection "message"
        // frames. Those alone must satisfy the watchdog (regression guard for the
        // false-positive where idle-but-connected sockets were force-disconnected).
        const connectionStore = useConnectionStore()
        connectionStore.setReverbState("connected")

        const { initializeBroadcasts, cleanup } = useBroadcasts()
        initializeBroadcasts()

        // The composable binds touchLastEvent to the connection's "message" event.
        expect(capturedConnectionHandlers.message).toBeTypeOf("function")

        // Emit a transport frame every 2 minutes — no business events at all.
        const TICK_MS = 120_000
        const iterations = Math.ceil((WATCHDOG_SILENCE_THRESHOLD_MS + WATCHDOG_INTERVAL_MS) / TICK_MS) + 1
        for (let i = 0; i < iterations; i++) {
            capturedConnectionHandlers.message?.({ event: "pusher:pong", data: {} })
            vi.advanceTimersByTime(TICK_MS)
        }

        expect(mockDisconnect).not.toHaveBeenCalled()

        cleanup()
    })

    it("unbinds the transport message handler on cleanup", () => {
        const connectionStore = useConnectionStore()
        connectionStore.setReverbState("connected")

        const { initializeBroadcasts, cleanup } = useBroadcasts()
        initializeBroadcasts()
        expect(capturedConnectionHandlers.message).toBeTypeOf("function")

        cleanup()
        expect(capturedConnectionHandlers.message).toBeUndefined()
    })

    it("skips disconnect when reverbState is not connected", () => {
        const connectionStore = useConnectionStore()
        connectionStore.setReverbState("disconnected")

        const { initializeBroadcasts, cleanup } = useBroadcasts()
        initializeBroadcasts()

        vi.advanceTimersByTime(WATCHDOG_SILENCE_THRESHOLD_MS + WATCHDOG_INTERVAL_MS)

        expect(mockDisconnect).not.toHaveBeenCalled()

        cleanup()
    })

    it("stops firing after cleanup()", () => {
        const connectionStore = useConnectionStore()
        connectionStore.setReverbState("connected")

        const { initializeBroadcasts, cleanup } = useBroadcasts()
        initializeBroadcasts()
        cleanup()

        // Advance well past threshold — watchdog should be cleared
        vi.advanceTimersByTime(WATCHDOG_SILENCE_THRESHOLD_MS * 2)

        expect(mockDisconnect).not.toHaveBeenCalled()
    })
})
