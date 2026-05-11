import { defineStore } from "pinia"
import { useApi } from "../composables/useApi"
import { logger } from "../utils/logger"
import type { Menu, MenuItem, Package, Modifier } from "../types"

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

const toNumber = (value: unknown): number => {
    const n = Number(value)
    return isNaN(n) ? 0 : n
}

const normalizePrice = <T extends { price?: unknown }>(item: T): T => ({
    ...item,
    price: toNumber(item.price),
})

const extractPayload = <T = any>(responseData: any): T | null => {
    if (responseData == null) { return null }
    return (responseData?.data ?? responseData) as T
}

const extractArrayPayload = <T = any>(responseData: any): T[] => {
    const payload = extractPayload<any>(responseData)
    return Array.isArray(payload) ? payload : []
}

const normalizePackage = (pkg: Package): Package => ({
    ...(pkg as Package),
    price: toNumber((pkg as Package).price),
    is_popular: Boolean((pkg as Package).is_popular) || (pkg as Package).name?.toLowerCase().includes("noble"),
    accent: String((pkg as Package).accent || ""),
    color: String((pkg as Package).color || ""),
    tax_amount: toNumber((pkg as Package).tax_amount),
    modifiers: Array.isArray((pkg as Package).modifiers)
        ? (pkg as Package).modifiers.map((m: Modifier) => normalizePrice(m))
        : [],
    tax: (pkg as Package).tax ? { ...(pkg as Package).tax, percentage: toNumber((pkg as Package).tax.percentage) } : (pkg as Package).tax,
})

export const useMenuStore = defineStore("menu", {
    state: () => ({
        menus: [] as Menu[],
        desserts: [] as MenuItem[],
        sides: [] as MenuItem[],
        beverages: [] as MenuItem[],
        packages: [] as Package[],
        loading: {
            packages: false,
            desserts: false,
            sides: false,
            beverages: false,
        },
        errors: {
            packages: null as string | null,
            desserts: null as string | null,
            sides: null as string | null,
            beverages: null as string | null,
        },
        lastFetched: null as number | null,
    }),

    getters: {
        activeMenu: (state: any) => state.menus.find(m => m.is_active),
        isLoading: (state: any) => Object.values(state.loading).some(Boolean),
        isLoadingPackages: (state: any) => state.loading.packages,
        isLoadingDesserts: (state: any) => state.loading.desserts,
        isLoadingSides: (state: any) => state.loading.sides,
        isLoadingBeverages: (state: any) => state.loading.beverages,
        hasErrors: (state: any) => Object.values(state.errors).some(error => error !== null),
        isCacheStale: (state: any) => {
            if (!state.lastFetched) { return true }
            return Date.now() - state.lastFetched > CACHE_DURATION
        },
    },

    actions: {
        async fetchPackages (this: any) {
            this.loading.packages = true
            this.errors.packages = null
            const api = useApi()

            try {
                const response = await api.get("/api/v2/tablet/packages")
                const packages = extractArrayPayload<Package>(response?.data)
                this.packages = packages.map(normalizePackage)
                logger.debug("✅ Packages loaded:", this.packages.length)
                return { success: true }
            } catch (error) {
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
            key: "packages" | "modifiers" | "desserts" | "sides" | "alacartes" | "beverages",
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

        async fetchDesserts (this: any) {
            this.loading.desserts = true
            this.errors.desserts = null
            const api = useApi()
            try {
                const response = await api.get("/api/v2/tablet/categories/dessert/menus")
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
                const errorMessage = (error as Error).message || "Failed to fetch desserts"
                this.errors.desserts = errorMessage
                logger.error("❌ Desserts error:", error)
                this.desserts = []
                throw new Error(errorMessage)
            } finally {
                this.loading.desserts = false
            }
        },

        async fetchSides (this: any) {
            this.loading.sides = true
            this.errors.sides = null
            const api = useApi()
            try {
                const response = await api.get("/api/v2/tablet/categories/sides/menus")
                this.sides = extractArrayPayload<MenuItem>(response?.data).map(normalizePrice)
                logger.debug("✅ Sides loaded:", this.sides.length)
                return { success: true }
            } catch (error) {
                const errorMessage = (error as Error).message || "Failed to fetch sides"
                this.errors.sides = errorMessage
                logger.error("❌ Sides error:", error)
                throw new Error(errorMessage)
            } finally {
                this.loading.sides = false
            }
        },

        async fetchBeverages (this: any) {
            this.loading.beverages = true
            this.errors.beverages = null
            const api = useApi()
            try {
                const response = await api.get("/api/v2/tablet/categories/beverage/menus")
                const payload = extractPayload<any>(response?.data)

                if (!Array.isArray(payload)) {
                    logger.warn("⚠️ Beverages API returned non-array data:", payload)
                    this.beverages = []
                    return { success: true }
                }

                const filteredArr = payload.filter((item: any) => {
                    if (item && typeof item === "object" && typeof (item as any).then === "function") {
                        logger.warn("⚠️ Skipping promise-like object in beverages:", item)
                        return false
                    }
                    return true
                })

                this.beverages = filteredArr.map(normalizePrice)
                logger.debug("✅ Beverages loaded:", this.beverages.length)
                return { success: true }
            } catch (error) {
                const errorMessage = (error as Error).message || "Failed to fetch beverages"
                this.errors.beverages = errorMessage
                logger.error("❌ Beverages error:", error)
                this.beverages = []
                throw new Error(errorMessage)
            } finally {
                this.loading.beverages = false
            }
        },

        async loadAllMenus (this: any, forceRefresh = false) {
            if (!forceRefresh && !this.isCacheStale && this.packages.length > 0) {
                logger.debug("📦 Using cached menu data")
                return { success: true, fromCache: true }
            }

            logger.debug("🔄 Fetching fresh menu data...")

            // Load all menu data in parallel
            const fetches = [
                this.fetchPackages(),
                this.fetchDesserts(),
                this.fetchSides(),
                this.fetchBeverages(),
            ]

            const results = await Promise.allSettled(fetches)
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
            if (!pkg?.modifiers) { return [] }

            // Collect unique group names
            const groups = [...new Set(pkg.modifiers.map(m => m.group || "Other"))]

            // If any group looks like a 'meat' umbrella, split by meat keywords
            const hasMeatGroup = groups.some(g => /meat/i.test(String(g)))

            if (!hasMeatGroup) { return groups }

            // Split modifiers into PORK / BEEF / CHICKEN where possible, otherwise fall back
            const mods = pkg.modifiers || []
            const byKeyword = {
                PORK: mods.filter((m: any) => /pork/i.test(m.name || "")),
                BEEF: mods.filter((m: any) => /beef/i.test(m.name || "")),
                CHICKEN: mods.filter((m: any) => /chicken/i.test(m.name || "")),
            } as Record<string, any[]>

            const other = mods.filter((m: any) => !/pork|beef|chicken/i.test(m.name || ""))

            const result: string[] = []
            if (byKeyword.PORK.length) { result.push("PORK") }
            if (byKeyword.BEEF.length) { result.push("BEEF") }
            if (byKeyword.CHICKEN.length) { result.push("CHICKEN") }
            if (other.length) { result.push("Other") }

            // If splitting failed (no keywords matched), return the original groups
            return result.length ? result : groups
        },

        clearError (this: any, key: string) {
            this.errors[key] = null
        },

        clearAllErrors (this: any) {
            this.errors = {
                packages: null,
                modifiers: null,
                alacartes: null,
                desserts: null,
                sides: null,
                beverages: null,
            }
        },

        clear (this: any) {
            this.packages = []
            this.sides = []
            this.beverages = []
            this.desserts = []
            this.menus = []
            this.lastFetched = null
            this.errors = {
                packages: null,
                desserts: null,
                sides: null,
                beverages: null,
            }
            this.loading = {
                packages: false,
                desserts: false,
                sides: false,
                beverages: false,
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
        pick: ["menus", "packages", "beverages", "sides", "desserts", "lastFetched"],
    },
})
