export const TABLET_PWA_CACHE_NAMES = [
    "menus-cache",
    "images-cache",
] as const

export const TABLET_PWA_CACHE_PREFIXES = [
    "workbox-precache",
    "workbox-runtime",
] as const

type CacheStorageLike = Pick<CacheStorage, "keys" | "delete">
type ServiceWorkerRegistrationLike = Pick<ServiceWorkerRegistration, "unregister">
type ScopedServiceWorkerContainerLike = Pick<ServiceWorkerContainer, "getRegistration" | "ready">
type ServiceWorkerContainerLike = Pick<ServiceWorkerContainer, "getRegistrations">

export const isTabletPwaCacheName = (name: string): boolean => {
    return TABLET_PWA_CACHE_NAMES.includes(name as (typeof TABLET_PWA_CACHE_NAMES)[number]) ||
        TABLET_PWA_CACHE_PREFIXES.some(prefix => name.startsWith(prefix))
}

export async function deleteTabletPwaCaches (cacheStorage: CacheStorageLike = caches): Promise<string[]> {
    const cacheNames = await cacheStorage.keys()
    const tabletCacheNames = cacheNames.filter(isTabletPwaCacheName)

    await Promise.all(tabletCacheNames.map(name => cacheStorage.delete(name)))

    return tabletCacheNames
}

export async function deleteAllCaches (cacheStorage: CacheStorageLike = caches): Promise<string[]> {
    const cacheNames = await cacheStorage.keys()

    await Promise.all(cacheNames.map(name => cacheStorage.delete(name)))

    return cacheNames
}

async function unregisterRegistrations (
    registrations: ReadonlyArray<ServiceWorkerRegistrationLike | null | undefined>
): Promise<number> {
    const uniqueRegistrations = Array.from(new Set(registrations.filter(Boolean)))

    await Promise.all(uniqueRegistrations.map(registration => registration.unregister()))

    return uniqueRegistrations.length
}

export async function unregisterCurrentAppServiceWorkers (
    serviceWorker: ScopedServiceWorkerContainerLike = navigator.serviceWorker
): Promise<number> {
    const currentRegistration = await serviceWorker.getRegistration().catch(() => null)
    const readyRegistration = await serviceWorker.ready.catch(() => null)

    return unregisterRegistrations([currentRegistration, readyRegistration])
}

export async function unregisterAllServiceWorkers (
    serviceWorker: ServiceWorkerContainerLike = navigator.serviceWorker
): Promise<number> {
    const registrations = await serviceWorker.getRegistrations().catch(() => [])

    return unregisterRegistrations(registrations)
}
