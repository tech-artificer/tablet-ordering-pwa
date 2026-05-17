import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it, vi } from "vitest"
import {
    deleteAllCaches,
    deleteTabletPwaCaches,
    isTabletPwaCacheName,
    unregisterAllServiceWorkers,
    unregisterCurrentAppServiceWorkers
} from "../utils/pwaReset"

function readSource (relativePath: string): string {
    return readFileSync(resolve(__dirname, `../${relativePath}`), "utf-8")
}

function createCacheStorageMock (cacheNames: string[]) {
    const deleteMock = vi.fn().mockResolvedValue(true)

    return {
        cacheStorage: {
            keys: vi.fn().mockResolvedValue(cacheNames),
            delete: deleteMock,
        },
        deleteMock,
    }
}

describe("pwa reset helpers", () => {
    it("matches only formalized tablet cache names and prefixes", () => {
        expect(isTabletPwaCacheName("menus-cache")).toBe(true)
        expect(isTabletPwaCacheName("images-cache")).toBe(true)
        expect(isTabletPwaCacheName("workbox-precache-v2-app-shell")).toBe(true)
        expect(isTabletPwaCacheName("workbox-runtime-some-hash")).toBe(true)
        expect(isTabletPwaCacheName("admin-cache")).toBe(false)
        expect(isTabletPwaCacheName("shared-origin-assets")).toBe(false)
    })

    it("deletes only tablet pwa caches during normal refresh", async () => {
        const { cacheStorage, deleteMock } = createCacheStorageMock([
            "menus-cache",
            "images-cache",
            "workbox-precache-v2-app-shell",
            "workbox-runtime-some-hash",
            "admin-cache",
            "shared-origin-assets",
        ])

        const deletedCaches = await deleteTabletPwaCaches(cacheStorage)

        expect(deletedCaches).toEqual([
            "menus-cache",
            "images-cache",
            "workbox-precache-v2-app-shell",
            "workbox-runtime-some-hash",
        ])
        expect(deleteMock).toHaveBeenCalledTimes(4)
        expect(deleteMock).toHaveBeenCalledWith("menus-cache")
        expect(deleteMock).toHaveBeenCalledWith("images-cache")
        expect(deleteMock).toHaveBeenCalledWith("workbox-precache-v2-app-shell")
        expect(deleteMock).toHaveBeenCalledWith("workbox-runtime-some-hash")
        expect(deleteMock).not.toHaveBeenCalledWith("admin-cache")
        expect(deleteMock).not.toHaveBeenCalledWith("shared-origin-assets")
    })

    it("deletes every cache during the emergency reset path", async () => {
        const { cacheStorage, deleteMock } = createCacheStorageMock([
            "menus-cache",
            "admin-cache",
            "shared-origin-assets",
        ])

        const deletedCaches = await deleteAllCaches(cacheStorage)

        expect(deletedCaches).toEqual([
            "menus-cache",
            "admin-cache",
            "shared-origin-assets",
        ])
        expect(deleteMock).toHaveBeenCalledTimes(3)
        expect(deleteMock).toHaveBeenCalledWith("menus-cache")
        expect(deleteMock).toHaveBeenCalledWith("admin-cache")
        expect(deleteMock).toHaveBeenCalledWith("shared-origin-assets")
    })

    it("unregisters only the current app service workers during scoped refresh", async () => {
        const currentRegistration = { unregister: vi.fn().mockResolvedValue(true) }
        const readyRegistration = { unregister: vi.fn().mockResolvedValue(true) }

        const unregisteredCount = await unregisterCurrentAppServiceWorkers({
            getRegistration: vi.fn().mockResolvedValue(currentRegistration),
            ready: Promise.resolve(readyRegistration),
        } as any)

        expect(unregisteredCount).toBe(2)
        expect(currentRegistration.unregister).toHaveBeenCalledTimes(1)
        expect(readyRegistration.unregister).toHaveBeenCalledTimes(1)
    })

    it("keeps settings refresh separate from emergency /sw-reset behavior", async () => {
        const registrationA = { unregister: vi.fn().mockResolvedValue(true) }
        const registrationB = { unregister: vi.fn().mockResolvedValue(true) }

        const unregisteredCount = await unregisterAllServiceWorkers({
            getRegistrations: vi.fn().mockResolvedValue([registrationA, registrationB]),
        } as any)

        const settingsSource = readSource("pages/settings.vue")
        const resetSource = readSource("pages/sw-reset.vue")

        expect(unregisteredCount).toBe(2)
        expect(registrationA.unregister).toHaveBeenCalledTimes(1)
        expect(registrationB.unregister).toHaveBeenCalledTimes(1)
        expect(settingsSource).toContain("deleteTabletPwaCaches")
        expect(settingsSource).toContain("unregisterCurrentAppServiceWorkers")
        expect(settingsSource).toContain("/sw-reset")
        expect(settingsSource).not.toContain("getRegistrations()")
        expect(resetSource).toContain("deleteAllCaches")
        expect(resetSource).toContain("unregisterAllServiceWorkers")
    })
})
