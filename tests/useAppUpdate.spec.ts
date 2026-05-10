import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ref, nextTick } from "vue"
import { useAppUpdate } from "../composables/useAppUpdate"

function createServiceWorkerMocks (options?: { hasWaiting?: boolean }) {
    const serviceWorkerContainer = new EventTarget() as EventTarget & {
        ready: Promise<ServiceWorkerRegistration>
        controller: Record<string, unknown>
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

    it("posts SKIP_WAITING to waiting worker when applying update", async () => {
        const { serviceWorkerContainer, waiting } = createServiceWorkerMocks({ hasWaiting: true })
        const update = useAppUpdate()

        await update.initializeAppUpdate()
        serviceWorkerContainer.dispatchEvent(new MessageEvent("message", { data: { type: "UPDATE_AVAILABLE" } }))
        await nextTick()

        update.applyUpdate()

        expect(waiting.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" })
        expect(update.isApplyingUpdate.value).toBe(true)
        update.disposeAppUpdate()
    })
})
