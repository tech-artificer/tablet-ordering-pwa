import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ref, nextTick } from "vue"
import { useAppUpdate } from "../composables/useAppUpdate"

function createServiceWorkerMocks (options?: { hasWaiting?: boolean }) {
    const serviceWorkerContainer = new EventTarget() as EventTarget & {
        ready: Promise<ServiceWorkerRegistration>
        controller: Record<string, unknown>
        getRegistrations: () => Promise<ServiceWorkerRegistration[]>
        getRegistration: () => Promise<ServiceWorkerRegistration | undefined>
    }

    const waiting = {
        postMessage: vi.fn(),
    } as unknown as ServiceWorker

    const registration = Object.assign(new EventTarget(), {
        waiting: options?.hasWaiting ? waiting : null,
        installing: null,
        update: vi.fn().mockResolvedValue(undefined),
    }) as unknown as ServiceWorkerRegistration

    serviceWorkerContainer.ready = Promise.resolve(registration)
    serviceWorkerContainer.controller = {}
    serviceWorkerContainer.getRegistrations = vi.fn().mockResolvedValue([registration])
    serviceWorkerContainer.getRegistration = vi.fn().mockResolvedValue(registration)

    Object.defineProperty(globalThis.navigator, "serviceWorker", {
        configurable: true,
        value: serviceWorkerContainer,
    })

    return { serviceWorkerContainer, registration, waiting }
}

describe("useAppUpdate", () => {
    beforeEach(() => {
        vi.restoreAllMocks()
    })

    afterEach(() => {
        Object.defineProperty(globalThis.navigator, "serviceWorker", {
            configurable: true,
            value: undefined,
        })
    })

    it("shows banner only after explicit update signal", async () => {
        const { serviceWorkerContainer } = createServiceWorkerMocks()
        const update = useAppUpdate()

        await update.initializeAppUpdate()
        expect(update.showUpdateBanner.value).toBe(false)

        serviceWorkerContainer.dispatchEvent(new MessageEvent("message", { data: { type: "UPDATE_AVAILABLE" } }))
        await nextTick()

        expect(update.showUpdateBanner.value).toBe(true)
        update.disposeAppUpdate()
    })

    it("blocks apply while active session/order is flagged", async () => {
        const { serviceWorkerContainer } = createServiceWorkerMocks()
        const blocked = ref(true)
        const update = useAppUpdate({ isUpdateApplyBlocked: blocked })

        await update.initializeAppUpdate()
        serviceWorkerContainer.dispatchEvent(new MessageEvent("message", { data: { type: "UPDATE_AVAILABLE" } }))
        await nextTick()
        expect(update.canApplyUpdate.value).toBe(false)

        blocked.value = false
        await nextTick()
        expect(update.canApplyUpdate.value).toBe(true)
        update.disposeAppUpdate()
    })

    it("applyUpdate unregisters all SWs, clears caches, and reloads", async () => {
        const reload = vi.fn()
        const unregister = vi.fn().mockResolvedValue(true)
        const { serviceWorkerContainer, registration } = createServiceWorkerMocks({ hasWaiting: true })
        ;(registration as any).unregister = unregister
        vi.spyOn(navigator.serviceWorker, "getRegistrations").mockResolvedValue([registration])

        const cacheDelete = vi.fn().mockResolvedValue(true)
        vi.stubGlobal("caches", { keys: vi.fn().mockResolvedValue(["v1", "v2"]), delete: cacheDelete })

        const update = useAppUpdate({ reload })
        await update.initializeAppUpdate()
        serviceWorkerContainer.dispatchEvent(new MessageEvent("message", { data: { type: "UPDATE_AVAILABLE" } }))
        await nextTick()

        await update.applyUpdate()

        expect(unregister).toHaveBeenCalled()
        expect(cacheDelete).toHaveBeenCalledWith("v1")
        expect(cacheDelete).toHaveBeenCalledWith("v2")
        expect(reload).toHaveBeenCalledOnce()
        update.disposeAppUpdate()
    })

    it("applyUpdate does nothing when canApplyUpdate is false", async () => {
        const reload = vi.fn()
        const blocked = ref(true)
        const { serviceWorkerContainer } = createServiceWorkerMocks({ hasWaiting: true })
        const update = useAppUpdate({ isUpdateApplyBlocked: blocked, reload })

        await update.initializeAppUpdate()
        serviceWorkerContainer.dispatchEvent(new MessageEvent("message", { data: { type: "UPDATE_AVAILABLE" } }))
        await nextTick()

        await update.applyUpdate()
        expect(reload).not.toHaveBeenCalled()
        update.disposeAppUpdate()
    })
})
