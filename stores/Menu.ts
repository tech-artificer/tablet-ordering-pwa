import { defineStore } from "pinia";
import { useApi } from "../composables/useApi";
import { logger } from "../utils/logger";
import type { Menu, MenuItem, Package, Modifier } from "../types";

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

const toNumber = (value: unknown): number => {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
};

const normalizePrice = <T extends { price?: unknown }>(item: T): T => ({
    ...item,
    price: toNumber(item.price),
});

const normalizePackage = (pkg: Package): Package => ({
    ...(pkg as Package),
    price: toNumber((pkg as Package).price),
    is_popular: Boolean((pkg as Package).is_popular) || (pkg as Package).name?.toLowerCase().includes('noble'),
    accent: String((pkg as Package).accent || ''),
    color: String((pkg as Package).color || ''),
    tax_amount: toNumber((pkg as Package).tax_amount),
    modifiers: Array.isArray((pkg as Package).modifiers)
        ? (pkg as Package).modifiers.map((m: Modifier) => normalizePrice(m))
        : [],
    tax: (pkg as Package).tax ? { ...(pkg as Package).tax, percentage: toNumber((pkg as Package).tax.percentage) } : (pkg as Package).tax,
});


export const useMenuStore = defineStore("menu", {
    state: () => ({
        menus: [] as Menu[],
        desserts: [] as MenuItem[],
        sides: [] as MenuItem[],
        beverages: [] as MenuItem[],
        packages: [] as Package[],
        alacartes: [] as MenuItem[],
        modifiers: [] as Modifier[],
        loading: {
            packages: false,
            modifiers: false,
            desserts: false,
            sides: false,
            alacartes: false,
            beverages: false,
        },
        errors: {
            packages: null as string | null,
            modifiers: null as string | null,
            desserts: null as string | null,
            sides: null as string | null,
            alacartes: null as string | null,
            beverages: null as string | null,
        },
        lastFetched: null as number | null,
    }),

    getters: {
        activeMenu: (state: any) => state.menus.find((m) => m.is_active),
        isLoading: (state: any) => Object.values(state.loading).some(Boolean),
        isLoadingPackages: (state: any) => state.loading.packages,
        isLoadingAlacartes: (state: any) => state.loading.alacartes,    
        isLoadingModifiers: (state: any) => state.loading.modifiers,
        isLoadingDesserts: (state: any) => state.loading.desserts,
        isLoadingSides: (state: any) => state.loading.sides,
        isLoadingBeverages: (state: any) => state.loading.beverages,
        hasErrors: (state: any) => Object.values(state.errors).some(error => error !== null),
        isCacheStale: (state: any) => {
            if (!state.lastFetched) return true;
            return Date.now() - state.lastFetched > CACHE_DURATION;
        },
    },

    actions: {
        /**
         * Generic fetch function for all menu item types
         * Eliminates code duplication across 6 fetch methods
         */
        async _fetchMenuItem(
            this: any,
            key: 'packages' | 'modifiers' | 'desserts' | 'sides' | 'alacartes' | 'beverages',
            endpoint: string,
            params: Record<string, string> = {},
            normalizer: (item: any) => any = normalizePrice
        ) {
            this.loading[key] = true
            this.errors[key] = null
            const api = useApi()
            
            try {
                const { data } = await api.get(endpoint, params ? { params } : undefined)
                this[key] = Array.isArray(data) ? data.map(normalizer) : []
                logger.debug(`✅ ${key.charAt(0).toUpperCase() + key.slice(1)} loaded:`, this[key].length)
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

        async fetchPackages(this: any) {
            return this._fetchMenuItem('packages', '/api/menus/with-modifiers', {}, normalizePackage)
        },

        async fetchModifiers(this: any) {
            return this._fetchMenuItem('modifiers', '/api/menus/modifiers')
        },

        async fetchDesserts(this: any) {
            return this._fetchMenuItem('desserts', '/api/menus/course', { course: 'dessert' })
        },

        async fetchSides(this: any) {
            return this._fetchMenuItem('sides', '/api/menus/group', { group: 'sides' })
        },

        async fetchAlacartes(this: any) {
            return this._fetchMenuItem('alacartes', '/api/menus/category', { category: 'alacarte' })
        },

        async fetchBeverages(this: any) {
            return this._fetchMenuItem('beverages', '/api/menus/category', { category: 'beverage' })
        },

        async loadAllMenus(this: any, forceRefresh = false) {
            if (!forceRefresh && !this.isCacheStale && this.packages.length > 0) {
                logger.debug('📦 Using cached menu data');
                return { success: true, fromCache: true };
            }

            logger.debug('🔄 Fetching fresh menu data...');
            const fetches = [
                this.fetchPackages(),
                this.fetchModifiers(),
                this.fetchDesserts(),
                this.fetchAlacartes(),
                this.fetchSides(),
                this.fetchBeverages(),
            ];

            const results = await Promise.allSettled(fetches);
            const allSucceeded = results.every(r => r.status === 'fulfilled');

            if (allSucceeded) {
                this.lastFetched = Date.now();
            }

            return {
                success: allSucceeded,
                fromCache: false,
                errors: results
                    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
                    .map(r => r.reason),
            };
        },

        async refreshMenus(this: any) {
            return this.loadAllMenus(true);
        },

        setActive(this: any, id: number) {
            this.menus.forEach((menu) => {
                menu.is_active = menu.id === id;
            });
        },

        extractModifierGroups(pkg: Package) {
            if (!pkg?.modifiers) return [];

            // Collect unique group names
            const groups = [...new Set(pkg.modifiers.map((m) => m.group || 'Other'))];

            // If any group looks like a 'meat' umbrella, split by meat keywords
            const hasMeatGroup = groups.some(g => /meat/i.test(String(g)));

            if (!hasMeatGroup) return groups;

            // Split modifiers into PORK / BEEF / CHICKEN where possible, otherwise fall back
            const mods = pkg.modifiers || [];
            const byKeyword = {
                PORK: mods.filter((m: any) => /pork/i.test(m.name || '')),
                BEEF: mods.filter((m: any) => /beef/i.test(m.name || '')),
                CHICKEN: mods.filter((m: any) => /chicken/i.test(m.name || '')),
            } as Record<string, any[]>;

            const other = mods.filter((m: any) => !/pork|beef|chicken/i.test(m.name || ''));

            const result: string[] = [];
            if (byKeyword.PORK.length) result.push('PORK');
            if (byKeyword.BEEF.length) result.push('BEEF');
            if (byKeyword.CHICKEN.length) result.push('CHICKEN');
            if (other.length) result.push('Other');

            // If splitting failed (no keywords matched), return the original groups
            return result.length ? result : groups;
        },

        clearError(this: any, key: string) {
            this.errors[key] = null;
        },

        clearAllErrors(this: any) {
            this.errors = {
                packages: null,
                modifiers: null,
                alacartes: null,
                desserts: null,
                sides: null,
                beverages: null,
            };
        },

        clear(this: any) {
            this.packages = [];
            this.sides = [];
            this.beverages = [];
            this.desserts = [];
            this.alacartes = [];
            this.modifiers = [];
            this.menus = [];
            this.lastFetched = null;
            this.errors = {
                packages: null,
                modifiers: null,
                alacartes: null,
                desserts: null,
                sides: null,
                beverages: null,
            };
            this.loading = {
                packages: false,
                modifiers: false,
                alacartes: false,
                desserts: false,
                sides: false,
                beverages: false,
            };
        },

        clearCache(this: any) {
            this.clear();
            if (typeof window !== 'undefined') {
                localStorage.removeItem('menu-store');
            }
        },
    },

    persist: {
        key: "menu-store",
        storage: (typeof window !== 'undefined') ? localStorage : undefined,
        pick: ["menus", "packages", "modifiers", "alacartes", "beverages", "sides", "desserts", "lastFetched"],
    },
});