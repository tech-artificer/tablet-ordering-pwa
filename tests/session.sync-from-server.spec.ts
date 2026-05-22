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

    it("does nothing when session is inactive", async () => {
        const session = useSessionStore()
        session.setIsActive(false)

        await session.syncFromServer()

        expect(mockGet).not.toHaveBeenCalled()
    })

    it("calls /api/session/latest when session is active", async () => {
        const session = useSessionStore()
        session.setIsActive(true)
        mockGet.mockResolvedValueOnce({ data: { data: { id: 1 } } })

        await session.syncFromServer()

        expect(mockGet).toHaveBeenCalledWith("/api/session/latest")
    })

    it("does not modify sessionEndsAt regardless of server response", async () => {
        const session = useSessionStore()
        session.setIsActive(true)
        // POS session age / start time must never drive the tablet session timer
        mockGet.mockResolvedValueOnce({
            data: {
                data: { id: 1 },
                server_time: new Date().toISOString(),
                session_started_at: new Date(Date.UTC(2026, 0, 1, 12, 0, 0)).toISOString(),
                session_duration_seconds: 120,
            },
        })
        const before = (session as any).sessionEndsAt

        await session.syncFromServer()

        expect((session as any).sessionEndsAt).toBe(before)
    })

    it("does not throw when POS session is null", async () => {
        const session = useSessionStore()
        session.setIsActive(true)
        mockGet.mockResolvedValueOnce({ data: { data: null } })

        await expect(session.syncFromServer()).resolves.toBeUndefined()
    })
})
