import { defineStore } from "pinia";
import { useApi } from "../composables/useApi";
import { logger } from "../utils/logger";
import type { Menu, MenuItem, Package, Modifier, MeatCategory, TabletCategory, PackageDetails } from "../types";

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
        meatCategories: [] as MeatCategory[],  // PORK, BEEF, CHICKEN
        tabletCategories: [] as TabletCategory[],  // sides, desserts, beverages, etc.
        packageDetails: {} as Record<number, PackageDetails>,  // Cache for package details
        loading: {
            packages: false,
            modifiers: false,
            desserts: false,
            sides: false,
            alacartes: false,
            beverages: false,
            meatCategories: false,
            tabletCategories: false,
        },
        errors: {
            packages: null as string | null,
            modifiers: null as string | null,
            desserts: null as string | null,
            sides: null as string | null,
            alacartes: null as string | null,
            beverages: null as string | null,
            meatCategories: null as string | null,
            tabletCategories: null as string | null,
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
        async fetchPackages(this: any) {
            this.loading.packages = true;       
            this.errors.packages = null;
            const api = useApi();
            try {
                const { data } = await api.get('/api/v2/tablet/packages');
                this.packages = Array.isArray(data.data) ? data.data.map(normalizePackage) : [];
                logger.debug('✅ Packages loaded:', this.packages.length);
                return { success: true };
            } catch (error) {
                const errorMessage = (error as Error).message || 'Failed to fetch packages';
                this.errors.packages = errorMessage;
                logger.error('❌ Packages error:', error);
                throw new Error(errorMessage);
            } finally {
                this.loading.packages = false;
            }
        },

        async fetchMeatCategories(this: any) {
            this.loading.meatCategories = true;
            this.errors.meatCategories = null;
            const api = useApi();
            try {
                const { data } = await api.get('/api/v2/tablet/meat-categories');
                this.meatCategories = Array.isArray(data.data) ? data.data : [];
                logger.debug('✅ Meat categories loaded:', this.meatCategories.length);
                return { success: true };
            } catch (error) {
                const errorMessage = (error as Error).message || 'Failed to fetch meat categories';
                this.errors.meatCategories = errorMessage;
                logger.error('❌ Meat categories error:', error);
                throw new Error(errorMessage);
            } finally {
                this.loading.meatCategories = false;
            }
        },

        async fetchTabletCategories(this: any) {
            this.loading.tabletCategories = true;
            this.errors.tabletCategories = null;
            const api = useApi();
            try {
                const { data } = await api.get('/api/v2/tablet/categories');
                this.tabletCategories = Array.isArray(data.data) ? data.data : [];
                logger.debug('✅ Tablet categories loaded:', this.tabletCategories.length);
                return { success: true };
            } catch (error) {
                const errorMessage = (error as Error).message || 'Failed to fetch tablet categories';
                this.errors.tabletCategories = errorMessage;
                logger.error('❌ Tablet categories error:', error);
                throw new Error(errorMessage);
            } finally {
                this.loading.tabletCategories = false;
            }
        },

        async fetchPackageDetails(this: any, packageId: number, meatCategory?: string) {
            const api = useApi();
            try {
                const params = meatCategory ? { meat_category: meatCategory } : {};
                const { data } = await api.get(`/api/v2/tablet/packages/${packageId}`, { params });
                
                // Cache the package details
                this.packageDetails[packageId] = data;
                logger.debug(`✅ Package ${packageId} details loaded`);
                return data;
            } catch (error) {
                const errorMessage = (error as Error).message || `Failed to fetch package ${packageId} details`;
                logger.error(`❌ Package ${packageId} details error:`, error);
                throw new Error(errorMessage);
            }
        },

        async fetchModifiers(this: any) {
            // Deprecated: Modifiers are now part of packages via fetchPackageDetails
            // Keeping for backward compatibility but using empty array
            this.loading.modifiers = true;
            this.errors.modifiers = null;
            try {
                this.modifiers = [];
                logger.debug('⚠️ fetchModifiers deprecated - use fetchPackageDetails instead');
                return { success: true };
            } finally {
                this.loading.modifiers = false;
            }
        },

        async fetchDesserts(this: any) {
            this.loading.desserts = true;
            this.errors.desserts = null;
            const api = useApi();
            try {
                // Find dessert category slug from tabletCategories
                const category = this.tabletCategories.find((c: TabletCategory) => 
                    c.slug === 'dessert' || c.name.toLowerCase().includes('dessert')
                );
                
                if (category) {
                    const { data } = await api.get(`/api/v2/tablet/categories/${category.slug}/menus`);
                    this.desserts = Array.isArray(data.data) ? data.data.map(normalizePrice) : [];
                } else {
                    logger.warn('⚠️ Dessert category not found in tablet categories');
                    this.desserts = [];
                }
                logger.debug('✅ Desserts loaded:', this.desserts.length);
                return { success: true };
            } catch (error) {
                const errorMessage = (error as Error).message || 'Failed to fetch desserts';
                this.errors.desserts = errorMessage;
                logger.error('❌ Desserts error:', error);
                throw new Error(errorMessage);
            } finally {
                this.loading.desserts = false;
            }
        },

        async fetchSides(this: any) {
            this.loading.sides = true;
            this.errors.sides = null;
            const api = useApi();
            try {
                // Find sides category slug from tabletCategories
                const category = this.tabletCategories.find((c: TabletCategory) => 
                    c.slug === 'sides' || c.name.toLowerCase().includes('side')
                );
                
                if (category) {
                    const { data } = await api.get(`/api/v2/tablet/categories/${category.slug}/menus`);
                    this.sides = Array.isArray(data.data) ? data.data.map(normalizePrice) : [];
                } else {
                    logger.warn('⚠️ Sides category not found in tablet categories');
                    this.sides = [];
                }
                logger.debug('✅ Sides loaded:', this.sides.length);
                return { success: true };
            } catch (error) {
                const errorMessage = (error as Error).message || 'Failed to fetch sides';
                this.errors.sides = errorMessage;
                logger.error('❌ Sides error:', error);
                throw new Error(errorMessage);
            } finally {
                this.loading.sides = false;
            }
        },

        async fetchAlacartes(this: any) {
            this.loading.alacartes = true;
            this.errors.alacartes = null;
            const api = useApi();
            try {
                // Find alacarte category slug from tabletCategories
                const category = this.tabletCategories.find((c: TabletCategory) => 
                    c.slug === 'alacarte' || c.name.toLowerCase().includes('alacarte')
                );
                
                if (category) {
                    const { data } = await api.get(`/api/v2/tablet/categories/${category.slug}/menus`);
                    this.alacartes = Array.isArray(data.data) ? data.data.map(normalizePrice) : [];
                } else {
                    logger.warn('⚠️ Alacarte category not found in tablet categories');
                    this.alacartes = [];
                }
                logger.debug('✅ Alacartes loaded:', this.alacartes.length);
                return { success: true };
            } catch (error) {
                const errorMessage = (error as Error).message || 'Failed to fetch alacartes';
                this.errors.alacartes = errorMessage;
                logger.error('❌ Alacartes error:', error);
                throw new Error(errorMessage);
            } finally {
                this.loading.alacartes = false;
            }
        },

        async fetchBeverages(this: any) {
            this.loading.beverages = true;
            this.errors.beverages = null;
            const api = useApi();
            try {
                // Find beverage category slug from tabletCategories
                const category = this.tabletCategories.find((c: TabletCategory) => 
                    c.slug === 'beverage' || c.name.toLowerCase().includes('beverage')
                );
                
                if (category) {
                    const { data } = await api.get(`/api/v2/tablet/categories/${category.slug}/menus`);
                    this.beverages = Array.isArray(data.data) ? data.data.map(normalizePrice) : [];
                } else {
                    logger.warn('⚠️ Beverage category not found in tablet categories');
                    this.beverages = [];
                }
                logger.debug('✅ Beverages loaded:', this.beverages.length);
                return { success: true };
            } catch (error) {
                const errorMessage = (error as Error).message || 'Failed to fetch beverages';
                this.errors.beverages = errorMessage;
                logger.error('❌ Beverages error:', error);
                throw new Error(errorMessage);
            } finally {
                this.loading.beverages = false;
            }
        },

        async loadAllMenus(this: any, forceRefresh = false) {
            if (!forceRefresh && !this.isCacheStale && this.packages.length > 0) {
                logger.debug('📦 Using cached menu data');
                return { success: true, fromCache: true };
            }

            logger.debug('🔄 Fetching fresh menu data...');
            
            // First, load tablet categories (required for loading category-based items)
            try {
                await this.fetchTabletCategories();
            } catch (error) {
                logger.error('❌ Failed to load tablet categories:', error);
            }
            
            // Then load all menu data in parallel
            const fetches = [
                this.fetchPackages(),
                this.fetchMeatCategories(),
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
            this.meatCategories = [];
            this.tabletCategories = [];
            this.packageDetails = {};
            this.lastFetched = null;
            this.errors = {
                packages: null,
                modifiers: null,
                alacartes: null,
                desserts: null,
                sides: null,
                beverages: null,
                meatCategories: null,
                tabletCategories: null,
            };
            this.loading = {
                packages: false,
                modifiers: false,
                alacartes: false,
                desserts: false,
                sides: false,
                beverages: false,
                meatCategories: false,
                tabletCategories: false,
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
        pick: ["menus", "packages", "modifiers", "alacartes", "beverages", "sides", "desserts", "meatCategories", "tabletCategories", "packageDetails", "lastFetched"],
    },
});