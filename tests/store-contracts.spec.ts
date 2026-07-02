import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPinia, setActivePinia } from "pinia"

import { useDeviceStore } from "../stores/Device"
import { useMenuStore } from "../stores/Menu"
import { useOrderStore } from "../stores/Order"

if (typeof globalThis.localStorage === "undefined") {
    const storage: Record<string, string> = {}
    // @ts-ignore
    globalThis.localStorage = {
        getItem: (key: string) => (Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null),
        setItem: (key: string, value: string) => { storage[key] = String(value) },
        removeItem: (key: string) => { delete storage[key] },
        clear: () => { Object.keys(storage).forEach(key => delete storage[key]) },
    }
}

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock("../composables/useApi", () => ({
    useApi: () => ({ get: mockGet, post: mockPost }),
}))

describe("store contract regressions", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        mockGet.mockReset()
        mockPost.mockReset()
    })

    it("initializes the device store with its expected public API", () => {
        const deviceStore = useDeviceStore()

        expect(deviceStore.authenticate).toBeTypeOf("function")
        expect(deviceStore.refresh).toBeTypeOf("function")
        expect(deviceStore.checkTokenExpiry).toBeTypeOf("function")
        expect(deviceStore.getDeviceId).toBeTypeOf("function")
        expect(deviceStore.getTableId).toBeTypeOf("function")
        expect(deviceStore.getToken).toBeTypeOf("function")
        expect(deviceStore.isAuthenticated).toBe(false)
        expect(deviceStore.waitingForTable).toBe(false)
    })

    it("exposes buildRefillPayload and maps refill items into request shape", () => {
        const orderStore = useOrderStore()

        ;(orderStore as any).draft = [
            { id: 41, name: "Beef", price: 0, quantity: 2, note: "Refill", category: "meats", img_url: "" },
            { id: 42, name: "Kimchi", price: 0, quantity: 1, note: null, category: "sides", img_url: "" },
        ]

        expect(orderStore.buildRefillPayload).toBeTypeOf("function")
        expect(orderStore.buildRefillPayload()).toEqual({
            order_id: null,
            items: [
                { menu_id: 41, quantity: 2 },
                { menu_id: 42, quantity: 1 },
            ],
        })
    })

    it("loads category menus via dynamic slug fetch", async () => {
        mockGet
            .mockResolvedValueOnce({ data: { data: [{ id: 1, slug: "sides", name: "Sides", menu_count: 1 }] } })
            .mockResolvedValueOnce({ data: { data: [{ id: 10, name: "Kimchi", price: 0 }] } })

        const menuStore = useMenuStore()
        await menuStore.fetchCategories()
        await menuStore.fetchCategoryMenus("sides")

        expect(mockGet).toHaveBeenCalledWith("/api/v2/tablet/categories", { signal: undefined })
        expect(mockGet).toHaveBeenCalledWith("/api/v2/tablet/categories/sides/menus", { signal: undefined })
        expect(menuStore.categoryMenus.sides).toHaveLength(1)
    })

    it("derives unlimited slugs from is_unlimited flags when present", () => {
        const menuStore = useMenuStore()

        ;(menuStore as any).categories = [
            { id: 0, slug: "meats", name: "Meats", is_unlimited: true },
            { id: 2, slug: "sides", name: "Sides", is_unlimited: true, menu_count: 3 },
            { id: 3, slug: "drinks", name: "Drinks", is_unlimited: false, menu_count: 5 },
        ]

        expect(menuStore.unlimitedCategorySlugs).toEqual(["meats", "sides"])
    })

    it("keeps meats refill-eligible when the payload has flags but no meats entry", () => {
        const menuStore = useMenuStore()

        // Nexus bootstrap fallback: flags present, meats tab client-injected
        ;(menuStore as any).categories = [
            { id: 1, slug: "sides", name: "Sides", pos_category: "sides", is_unlimited: true },
            { id: 2, slug: "dessert", name: "Dessert", pos_category: "dessert", is_unlimited: false },
            { id: 3, slug: "beverage", name: "Beverage", pos_category: "drinks", is_unlimited: false },
        ]

        expect(menuStore.unlimitedCategorySlugs).toEqual(["meats", "sides"])
    })

    it("falls back to legacy unlimited slugs when flags are absent", () => {
        const menuStore = useMenuStore()

        // Older nexus payload — no is_unlimited field at all
        ;(menuStore as any).categories = [
            { id: 2, slug: "sides", name: "Sides", menu_count: 3 },
            { id: 3, slug: "drinks", name: "Drinks", menu_count: 5 },
        ]
        expect(menuStore.unlimitedCategorySlugs).toEqual(["meats", "sides"])

        // Categories not loaded yet
        ;(menuStore as any).categories = []
        expect(menuStore.unlimitedCategorySlugs).toEqual(["meats", "sides"])
    })

    it("excludes meats from prefetch (fetched via fetchMeats)", () => {
        const menuStore = useMenuStore()

        ;(menuStore as any).categories = [
            { id: 0, slug: "meats", name: "Meats", is_unlimited: true },
            { id: 2, slug: "sides", name: "Sides", menu_count: 3 },
            { id: 3, slug: "empty", name: "Empty", menu_count: 0 },
        ]

        expect(menuStore.categoriesToPrefetch().map((cat: any) => cat.slug)).toEqual(["sides"])
    })
})
