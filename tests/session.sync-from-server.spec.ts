import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import { useSessionStore } from "../stores/Session"

const mockGet = vi.fn()

vi.mock("../composables/useApi", () => ({
    useApi: () => ({ get: mockGet }),
}))

describe("session server sync", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockGet.mockReset()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("accepts a real server session in its final 30 seconds", async () => {
        const session = useSessionStore()
        const sessionStart = Date.UTC(2026, 0, 1, 12, 0, 0)
        const durationSeconds = 120
        const durationMs = durationSeconds * 1000
        const serverNow = sessionStart + durationMs - 29_000
        const expectedSessionEndsAt = sessionStart + durationMs

        vi.setSystemTime(serverNow)
        session.setIsActive(true)
        ;(session as any).sessionStartedAt = sessionStart
        ;(session as any).sessionEndsAt = expectedSessionEndsAt + 60_000
        mockGet.mockResolvedValueOnce({
            data: {
                server_time: new Date(serverNow).toISOString(),
                session_started_at: new Date(sessionStart).toISOString(),
                session_duration_seconds: durationSeconds,
            },
        })

        await session.syncFromServer()

        expect(session.sessionEndsAt).toBe(expectedSessionEndsAt)
    })
})
