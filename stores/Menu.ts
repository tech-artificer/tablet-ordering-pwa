import { defineStore } from "pinia"
import { useApi } from "../composables/useApi"
import { logger } from "../utils/logger"
import type { Menu, MenuItem, Package } from "../types"

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

const toNumber = (value: unknown): number => {
    const n = Number(value)
    return isNaN(n) ? 0 : n
}

const normalizePrice = <T extends { price?: unknown }>(item: T): T => ({
    ...item,
    price: toNumber(item.price),
})

/** Active AbortController for the current loadAllMenus call. Cancelled on re-entry. */
let menuFetchController: AbortController | null = null

const extractPayload = <T = any>(responseData: any): T | null => {
    if (responseData == null) { return null }
    return (responseData?.data ?? responseData) as T
}

const extractArrayPayload = <T = any>(responseData: any): T[] => {
    const payload = extractPayload<any>(responseData)
    return Array.isArray(payload) ? payload : []
}

const normalizePackage = (pkg: Package): Package => ({
    ...pkg,
    base_price: toNumber((pkg as any).base_price),
    allowed_menus: Array.isArray((pkg as any).allowed_menus)
        ? (pkg as any).allowed_menus.map((m: any) => ({
            ...m,
            extra_price: toNumber(m.extra_price),
        }))
        : [],
})

export const useMenuStore = defineStore("menu", {
    state: () => ({
        menus: [] as Menu[],
        meats: [] as MenuItem[],
        desserts: [] as MenuItem[],
        sides: [] as MenuItem[],
        drinks: [] as MenuItem[],
        packages: [] as Package[],
        loading: {
            meats: false,
            packages: false,
            desserts: false,
            sides: false,
            drinks: false,
        },
        errors: {
            meats: null as string | null,
            packages: null as string | null,
            desserts: null as string | null,
            sides: null as string | null,
            drinks: null as string | null,
        },
        lastFetched: null as number | null,
    }),

    getters: {
        activeMenu: (state: any) => state.menus.find(m => m.is_active),
        isLoading: (state: any) => Object.values(state.loading).some(Boolean),
        isLoadingMeats: (state: any) => state.loading.meats,
        isLoadingPackages: (state: any) => state.loading.packages,
        isLoadingDesserts: (state: any) => state.loading.desserts,
        isLoadingSides: (state: any) => state.loading.sides,
        isLoadingDrinks: (state: any) => state.loading.drinks,
        hasErrors: (state: any) => Object.values(state.errors).some(error => error !== null),
        isCacheStale: (state: any) => {
            if (!state.lastFetched) { return true }
            return Date.now() - state.lastFetched > CACHE_DURATION
        },
    },

    actions: {
        async fetchPackages (this: any, signal?: AbortSignal) {
            this.loading.packages = true
            this.errors.packages = null
            const api = useApi()

            try {
                const response = await api.get("/api/v2/tablet/packages", { signal })
                const packages = extractArrayPayload<Package>(response?.data)
                this.packages = packages.map(normalizePackage)
                logger.debug("✅ Packages loaded:", this.packages.length)
                return { success: true }
            } catch (error) {
                if ((error as Error).name === "AbortError" || (error as Error).name === "CanceledError") {
                    logger.debug("⏹ Packages fetch aborted")
                    return { success: false, aborted: true }
                }
                const errorMessage = (error as Error).message || "Failed to fetch packages"
                this.errors.packages = errorMessage
                logger.error("❌ Packages error:", error)
                throw new Error(errorMessage)
            } finally {
                this.loading.packages = false
            }
        },

        /**
         * Generic fetch function for all menu item types
         * Eliminates code duplication across 6 fetch methods
         */
        async _fetchMenuItem (
            this: any,
            key: "packages" | "modifiers" | "meats" | "desserts" | "sides" | "alacartes" | "drinks",
            endpoint: string,
            params: Record<string, string> = {},
            normalizer: (item: any) => any = normalizePrice
        ) {
            this.loading[key] = true
            this.errors[key] = null
            const api = useApi()

            try {
                const response = await api.get(endpoint, { params })
                const items = extractArrayPayload<any>(response?.data).map(normalizer)
                this[key] = items
                logger.debug(`✅ ${key.charAt(0).toUpperCase() + key.slice(1)} loaded:`, items.length)
                return { success: true }
            } catch (error) {
                const errorMessage = (error as Error).message || `Failed to fetch ${key}`
                this.errors[key] = errorMessage
                logger.error(`❌ ${key.charAt(0).toUpperCase() + key.slice(1)} error:`, error)
                throw new Error(errorMessage)
            } finally {
                this.loading[key] = false
            }
        },

        async fetchDesserts (this: any, signal?: AbortSignal) {
            this.loading.desserts = true
            this.errors.desserts = null
            const api = useApi()
            try {
                const response = await api.get("/api/v2/tablet/categories/desserts/menus", { signal })
                const payload = extractPayload<any>(response?.data)

                if (!Array.isArray(payload)) {
                    logger.warn("⚠️ Desserts API returned non-array data:", payload)
                    this.desserts = []
                    return { success: true }
                }

                const filteredArr = payload.filter((item: any) => {
                    if (item && typeof item === "object" && typeof (item as any).then === "function") {
                        logger.warn("⚠️ Skipping promise-like object in desserts:", item)
                        return false
                    }
                    return true
                })

                this.desserts = filteredArr.map(normalizePrice)
                logger.debug("✅ Desserts loaded:", this.desserts.length)
                return { success: true }
            } catch (error) {
                if ((error as Error).name === "AbortError" || (error as Error).name === "CanceledError") {
                    logger.debug("⏹ Desserts fetch aborted")
                    return { success: false, aborted: true }
                }
                const errorMessage = (error as Error).message || "Failed to fetch desserts"
                this.errors.desserts = errorMessage
                logger.error("❌ Desserts error:", error)
                this.desserts = []
                throw new Error(errorMessage)
            } finally {
                this.loading.desserts = false
            }
        },

        async fetchSides (this: any, signal?: AbortSignal) {
            this.loading.sides = true
            this.errors.sides = null
            const api = useApi()
            try {
                const response = await api.get("/api/v2/tablet/categories/sides/menus", { signal })
                this.sides = extractArrayPayload<MenuItem>(response?.data).map(normalizePrice)
                logger.debug("✅ Sides loaded:", this.sides.length)
                return { success: true }
            } catch (error) {
                if ((error as Error).name === "AbortError" || (error as Error).name === "CanceledError") {
                    logger.debug("⏹ Sides fetch aborted")
                    return { success: false, aborted: true }
                }
                const errorMessage = (error as Error).message || "Failed to fetch sides"
                this.errors.sides = errorMessage
                logger.error("❌ Sides error:", error)
                throw new Error(errorMessage)
            } finally {
                this.loading.sides = false
            }
        },

        async fetchMeats (this: any, signal?: AbortSignal) {
            this.loading.meats = true
            this.errors.meats = null
            const api = useApi()
            try {
                const response = await api.get("/api/v2/tablet/categories/meats/menus", { signal })
                this.meats = extractArrayPayload<MenuItem>(response?.data).map(normalizePrice)
                logger.debug("✅ Meats loaded:", this.meats.length)
                return { success: true }
            } catch (error) {
                if ((error as Error).name === "AbortError" || (error as Error).name === "CanceledError") {
                    logger.debug("⏹ Meats fetch aborted")
                    return { success: false, aborted: true }
                }
                const errorMessage = (error as Error).message || "Failed to fetch meats"
                this.errors.meats = errorMessage
                logger.error("❌ Meats error:", error)
                throw new Error(errorMessage)
            } finally {
                this.loading.meats = false
            }
        },

        async fetchDrinks (this: any, signal?: AbortSignal) {
            this.loading.drinks = true
            this.errors.drinks = null
            const api = useApi()
            try {
                const response = await api.get("/api/v2/tablet/categories/drinks/menus", { signal })
                const payload = extractPayload<any>(response?.data)

                if (!Array.isArray(payload)) {
                    logger.warn("⚠️ Drinks API returned non-array data:", payload)
                    this.drinks = []
                    return { success: true }
                }

                const filteredArr = payload.filter((item: any) => {
                    if (item && typeof item === "object" && typeof (item as any).then === "function") {
                        logger.warn("⚠️ Skipping promise-like object in drinks:", item)
                        return false
                    }
                    return true
                })

                this.drinks = filteredArr.map(normalizePrice)
                logger.debug("✅ Drinks loaded:", this.drinks.length)
                return { success: true }
            } catch (error) {
                if ((error as Error).name === "AbortError" || (error as Error).name === "CanceledError") {
                    logger.debug("⏹ Drinks fetch aborted")
                    return { success: false, aborted: true }
                }
                const errorMessage = (error as Error).message || "Failed to fetch drinks"
                this.errors.drinks = errorMessage
                logger.error("❌ Drinks error:", error)
                this.drinks = []
                throw new Error(errorMessage)
            } finally {
                this.loading.drinks = false
            }
        },

        async loadAllMenus (this: any, forceRefresh = false) {
            if (!forceRefresh && !this.isCacheStale && this.packages.length > 0) {
                logger.debug("📦 Using cached menu data")
                return { success: true, fromCache: true }
            }

            // Cancel any in-flight loadAllMenus call before starting a new one
            if (menuFetchController) {
                menuFetchController.abort()
            }
            menuFetchController = new AbortController()
            const { signal } = menuFetchController

            logger.debug("🔄 Fetching fresh menu data...")

            // Load all menu data in parallel
            const fetches = [
                this.fetchPackages(signal),
                this.fetchMeats(signal),
                this.fetchDesserts(signal),
                this.fetchSides(signal),
                this.fetchDrinks(signal),
            ]

            const results = await Promise.allSettled(fetches)

            // Ignore results from an aborted request set
            if (signal.aborted) {
                return { success: false, fromCache: false, errors: [], aborted: true }
            }

            menuFetchController = null
            const allSucceeded = results.every(r => r.status === "fulfilled")

            if (allSucceeded) {
                this.lastFetched = Date.now()
            }

            return {
                success: allSucceeded,
                fromCache: false,
                errors: results
                    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
                    .map(r => r.reason),
            }
        },

        async refreshMenus (this: any) {
            return this.loadAllMenus(true)
        },

        setActive (this: any, id: number) {
            this.menus.forEach((menu) => {
                menu.is_active = menu.id === id
            })
        },

        extractModifierGroups (pkg: Package) {
            const menus: any[] = (pkg as any)?.allowed_menus ?? []
            const meatMenus = menus.filter((m: any) => m.menu_type === "meat" && m.is_active)
            const result: string[] = []
            if (meatMenus.some((m: any) => m.meat_category_code === "P")) { result.push("PORK") }
            if (meatMenus.some((m: any) => m.meat_category_code === "B")) { result.push("BEEF") }
            if (meatMenus.some((m: any) => m.meat_category_code === "C")) { result.push("CHICKEN") }
            return result
        },

        clearError (this: any, key: string) {
            this.errors[key] = null
        },

        clearAllErrors (this: any) {
            this.errors = {
                packages: null,
                meats: null,
                modifiers: null,
                alacartes: null,
                desserts: null,
                sides: null,
                drinks: null,
            }
        },

        clear (this: any) {
            this.packages = []
            this.meats = []
            this.sides = []
            this.drinks = []
            this.desserts = []
            this.menus = []
            this.lastFetched = null
            this.errors = {
                packages: null,
                meats: null,
                desserts: null,
                sides: null,
                drinks: null,
            }
            this.loading = {
                packages: false,
                meats: false,
                desserts: false,
                sides: false,
                drinks: false,
            }
        },

        clearCache (this: any) {
            this.clear()
            if (typeof window !== "undefined") {
                localStorage.removeItem("menu-store")
            }
        },
    },

    persist: {
        key: "menu-store",
        storage: (typeof window !== "undefined") ? localStorage : undefined,
        pick: ["menus", "packages", "meats", "drinks", "sides", "desserts", "lastFetched"],
        version: 2,
    },
})
