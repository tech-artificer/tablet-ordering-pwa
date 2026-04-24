import { describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useSessionEndStore } from "../stores/SessionEnd"

describe("SessionEnd store", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it("starts with inactive state", () => {
        const store = useSessionEndStore()
        expect(store.active).toBe(false)
        expect(store.reason).toBe("unknown")
        expect(store.orderNumber).toBeNull()
        expect(store.startedAt).toBeNull()
    })

    it("startTransition sets state correctly", () => {
        const store = useSessionEndStore()
        store.startTransition({ reason: "completed", orderNumber: "ORD-001", source: "polling" })
        expect(store.active).toBe(true)
        expect(store.reason).toBe("completed")
        expect(store.orderNumber).toBe("ORD-001")
        expect(store.source).toBe("polling")
        expect(store.startedAt).toBeTypeOf("number")
    })

    it("second startTransition call while active is a no-op", () => {
        const store = useSessionEndStore()
        store.startTransition({ reason: "completed", orderNumber: "ORD-001", source: "polling" })
        const firstStartedAt = store.startedAt

        store.startTransition({ reason: "voided", orderNumber: "ORD-999", source: "watcher" })

        expect(store.reason).toBe("completed")
        expect(store.orderNumber).toBe("ORD-001")
        expect(store.source).toBe("polling")
        expect(store.startedAt).toBe(firstStartedAt)
    })

    it("clearTransition resets all state", () => {
        const store = useSessionEndStore()
        store.startTransition({ reason: "voided", source: "broadcast" })
        store.clearTransition()

        expect(store.active).toBe(false)
        expect(store.reason).toBe("unknown")
        expect(store.orderNumber).toBeNull()
        expect(store.startedAt).toBeNull()
    })

    it("isTerminalReason identifies valid reasons", () => {
        const store = useSessionEndStore()
        expect(store.isTerminalReason("completed")).toBe(true)
        expect(store.isTerminalReason("voided")).toBe(true)
        expect(store.isTerminalReason("cancelled")).toBe(true)
        expect(store.isTerminalReason("unknown")).toBe(true)
        expect(store.isTerminalReason("pending")).toBe(false)
        expect(store.isTerminalReason("confirmed")).toBe(false)
    })

    it("startTransition works without optional orderNumber", () => {
        const store = useSessionEndStore()
        store.startTransition({ reason: "cancelled", source: "watcher" })
        expect(store.active).toBe(true)
        expect(store.orderNumber).toBeNull()
    })
})
