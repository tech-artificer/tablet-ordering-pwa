import { defineStore } from "pinia"
import { useApi } from "../composables/useApi"
import { logger } from "../utils/logger"
import type { CategoryTab, Menu, MenuItem, Package } from "../types"

const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

const CUSTOMER_SECTION_ERROR = "Nothing available in this section right now."

/** Legacy refill tabs — used only when the API doesn't provide is_unlimited flags. */
const FALLBACK_UNLIMITED_SLUGS = ["meats", "sides"]

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
    base_price: toNumber(pkg.base_price),
    allowed_menus: Array.isArray(pkg.allowed_menus)
        ? pkg.allowed_menus.map(m => ({
            ...m,
            extra_price: toNumber(m.extra_price),
        }))
        : [],
})

export const useMenuStore = defineStore("menu", {
    state: () => ({
        menus: [] as Menu[],
        meats: [] as MenuItem[],
        categories: [] as CategoryTab[],
        categoryMenus: {} as Record<string, MenuItem[]>,
        packages: [] as Package[],
        loading: {
            meats: false,
            packages: false,
            categories: false,
        },
        categoryLoading: {} as Record<string, boolean>,
        errors: {
            meats: null as string | null,
            packages: null as string | null,
            categories: null as string | null,
        },
        categoryErrors: {} as Record<string, string | null>,
        lastFetched: null as number | null,
    }),

    getters: {
        activeMenu: (state: any) => state.menus.find((m: Menu) => m.is_active),
        isLoading: (state: any) => Object.values(state.loading).some(Boolean) ||
            Object.values(state.categoryLoading).some(Boolean),
        isLoadingMeats: (state: any) => state.loading.meats,
        isLoadingPackages: (state: any) => state.loading.packages,
        isLoadingCategories: (state: any) => state.loading.categories,
        hasErrors: (state: any) => Object.values(state.errors).some((error: unknown) => error !== null) ||
            Object.values(state.categoryErrors).some((error: unknown) => error !== null),
        visibleCategories: (state: any): CategoryTab[] => state.categories.filter((cat: CategoryTab) => {
            if (typeof cat.menu_count === "number") {
                return cat.menu_count > 0
            }
            return true
        }),
        isCacheStale: (state: any) => {
            if (!state.lastFetched) { return true }
            return Date.now() - state.lastFetched > CACHE_DURATION
        },
        /**
         * Slugs of refill-eligible (unlimited) categories, admin-driven via is_unlimited.
         * Falls back to the legacy hardcoded pair when categories haven't loaded yet
         * or the backend doesn't send the flag (older nexus).
         */
        unlimitedCategorySlugs: (state: any): string[] => {
            const flagged = state.categories
                .filter((cat: CategoryTab) => cat.is_unlimited === true)
                .map((cat: CategoryTab) => cat.slug)
            const hasFlags = state.categories.some((cat: CategoryTab) => typeof cat.is_unlimited === "boolean")
            return hasFlags ? flagged : [...FALLBACK_UNLIMITED_SLUGS]
        },
        isCategoryLoading: (state: any) => (slug: string) => Boolean(state.categoryLoading[slug]),
        getCategoryError: (state: any) => (slug: string) => state.categoryErrors[slug] ?? null,
        getCategoryMenus: (state: any) => (slug: string): MenuItem[] => state.categoryMenus[slug] ?? [],
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

        async fetchCategories (this: any, signal?: AbortSignal) {
            this.loading.categories = true
            this.errors.categories = null
            const api = useApi()

            try {
                const response = await api.get("/api/v2/tablet/categories", { signal })
                this.categories = extractArrayPayload<CategoryTab>(response?.data)
                logger.debug("✅ Categories loaded:", this.categories.length)
                return { success: true }
            } catch (error) {
                if ((error as Error).name === "AbortError" || (error as Error).name === "CanceledError") {
                    logger.debug("⏹ Categories fetch aborted")
                    return { success: false, aborted: true }
                }
                logger.error("❌ Categories error:", error)
                this.errors.categories = CUSTOMER_SECTION_ERROR
                this.categories = []
                throw new Error(CUSTOMER_SECTION_ERROR)
            } finally {
                this.loading.categories = false
            }
        },

        async fetchCategoryMenus (this: any, slug: string, signal?: AbortSignal) {
            const normalizedSlug = slug.trim().toLowerCase()
            this.categoryLoading[normalizedSlug] = true
            this.categoryErrors[normalizedSlug] = null
            const api = useApi()

            try {
                const response = await api.get(`/api/v2/tablet/categories/${normalizedSlug}/menus`, { signal })
                const items = extractArrayPayload<MenuItem>(response?.data).map(normalizePrice)
                this.categoryMenus[normalizedSlug] = items
                logger.debug(`✅ Category '${normalizedSlug}' loaded:`, items.length)
                return { success: true }
            } catch (error) {
                if ((error as Error).name === "AbortError" || (error as Error).name === "CanceledError") {
                    logger.debug(`⏹ Category '${normalizedSlug}' fetch aborted`)
                    return { success: false, aborted: true }
                }
                logger.error(`❌ Category '${normalizedSlug}' error:`, error)
                this.categoryMenus[normalizedSlug] = []
                this.categoryErrors[normalizedSlug] = CUSTOMER_SECTION_ERROR
                throw new Error(CUSTOMER_SECTION_ERROR)
            } finally {
                this.categoryLoading[normalizedSlug] = false
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
                logger.error("❌ Meats error:", error)
                this.errors.meats = CUSTOMER_SECTION_ERROR
                throw new Error(CUSTOMER_SECTION_ERROR)
            } finally {
                this.loading.meats = false
            }
        },

        categoriesToPrefetch (this: any): CategoryTab[] {
            return this.categories.filter((cat: CategoryTab) => {
                // Meats is fetched via fetchMeats(); prefetching it here would double-fetch.
                if (cat.slug === "meats") {
                    return false
                }
                if (typeof cat.menu_count === "number") {
                    return cat.menu_count > 0
                }
                return true
            })
        },

        async loadAllMenus (this: any, forceRefresh = false) {
            if (!forceRefresh && !this.isCacheStale && this.packages.length > 0) {
                logger.debug("📦 Using cached menu data")
                return { success: true, fromCache: true }
            }

            if (menuFetchController) {
                menuFetchController.abort()
            }
            menuFetchController = new AbortController()
            const { signal } = menuFetchController

            logger.debug("🔄 Fetching fresh menu data...")

            const baseFetches = [
                this.fetchPackages(signal),
                this.fetchMeats(signal),
                this.fetchCategories(signal),
            ]

            const baseResults = await Promise.allSettled(baseFetches)

            if (signal.aborted) {
                return { success: false, fromCache: false, errors: [], aborted: true }
            }

            const menuFetches = this.categoriesToPrefetch().map((cat: CategoryTab) =>
                this.fetchCategoryMenus(cat.slug, signal)
            )

            const menuResults = await Promise.allSettled(menuFetches)

            if (signal.aborted) {
                return { success: false, fromCache: false, errors: [], aborted: true }
            }

            menuFetchController = null
            const allResults = [...baseResults, ...menuResults]
            const allSucceeded = allResults.every(r => r.status === "fulfilled")

            if (allSucceeded) {
                this.lastFetched = Date.now()
            }

            return {
                success: allSucceeded,
                fromCache: false,
                errors: allResults
                    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
                    .map(r => r.reason),
            }
        },

        async refreshMenus (this: any) {
            return this.loadAllMenus(true)
        },

        setActive (this: any, id: number) {
            this.menus.forEach((menu: Menu) => {
                menu.is_active = String(menu.id) === String(id)
            })
        },

        extractModifierGroups (pkg: Package) {
            const menus = pkg.allowed_menus ?? []
            const meatMenus = menus.filter(m => m.menu_type === "meat" && m.is_active)
            const result: string[] = []
            if (meatMenus.some(m => m.meat_category_code === "P")) { result.push("PORK") }
            if (meatMenus.some(m => m.meat_category_code === "B")) { result.push("BEEF") }
            if (meatMenus.some(m => m.meat_category_code === "C")) { result.push("CHICKEN") }
            return result
        },

        clearError (this: any, key: string) {
            if (key in this.errors) {
                this.errors[key] = null
            }
            if (key in this.categoryErrors) {
                this.categoryErrors[key] = null
            }
        },

        clearAllErrors (this: any) {
            this.errors = {
                packages: null,
                meats: null,
                categories: null,
            }
            this.categoryErrors = {}
        },

        clear (this: any) {
            this.packages = []
            this.meats = []
            this.categories = []
            this.categoryMenus = {}
            this.menus = []
            this.lastFetched = null
            this.errors = {
                packages: null,
                meats: null,
                categories: null,
            }
            this.categoryErrors = {}
            this.categoryLoading = {}
            this.loading = {
                packages: false,
                meats: false,
                categories: false,
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
        pick: ["menus", "packages", "meats", "categories", "categoryMenus", "lastFetched"],
        version: 3,
    },
})
