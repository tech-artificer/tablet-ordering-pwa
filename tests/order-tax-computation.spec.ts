// Regression test: taxAmount must read is_taxable/tax from package.menu_item, not
// package directly. The V2 tablet catalog API (TabletApiController::packageDetails)
// nests taxability under `menu_item` — reading it from the package root silently
// computed tax as 0 for every order, understating the guest-facing total vs the
// real POS-charged amount. See stores/Order.ts taxAmount.
import { describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useOrderStore } from "../stores/Order"
import type { Package } from "../types"

if (typeof globalThis.localStorage === "undefined") {
    const storage: Record<string, string> = {}
    // @ts-ignore
    globalThis.localStorage = {
        getItem: (k: string) => (Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null),
        setItem: (k: string, v: string) => { storage[k] = String(v) },
        removeItem: (k: string) => { delete storage[k] },
        clear: () => { Object.keys(storage).forEach(k => delete storage[k]) }
    }
}

// Shape matches the real V2 packageDetails() response (verified against a live deploy):
// taxability lives under package.menu_item, not package directly.
function taxablePackage (overrides: Partial<Package> = {}): Package {
    return {
        id: 1,
        krypton_menu_id: 46,
        name: "Classic Feast",
        base_price: 449,
        menu_item: {
            id: 46,
            name: "Classic Feast",
            is_taxable: true,
            tax: { name: "VAT 12%", percentage: 12, rounding: 4 }
        },
        ...overrides
    } as unknown as Package
}

describe("Order store — taxAmount", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it("computes tax from package.menu_item.tax.percentage when menu_item.is_taxable is true", () => {
        const store = useOrderStore()
        store.setPackage(taxablePackage())
        store.setGuestCount(2)

        // base_price 449 * guestCount 1 multiplier is baked into packageTotal's own
        // guestCount factor — assert against the real store computation, not a
        // hand re-derivation, so this only fails if the tax *source path* regresses.
        expect(store.taxAmount).toBeGreaterThan(0)
        expect(store.taxAmount).toBeCloseTo(Number(store.packageTotal) * 0.12, 2)
    })

    it("returns 0 when menu_item.is_taxable is false", () => {
        const store = useOrderStore()
        store.setPackage(taxablePackage({
            menu_item: { id: 46, name: "Classic Feast", is_taxable: false, tax: { percentage: 12 } }
        } as any))

        expect(store.taxAmount).toBe(0)
    })

    it("returns 0 when is_taxable/tax are only present at the package root (old, wrong shape)", () => {
        const store = useOrderStore()
        // Deliberately the pre-fix shape: is_taxable/tax at the top level, no menu_item.
        // Guards against silently regressing back to reading the wrong path.
        store.setPackage({
            id: 1,
            krypton_menu_id: 46,
            name: "Classic Feast",
            base_price: 449,
            is_taxable: true,
            tax: { percentage: 12 }
        } as any)

        expect(store.taxAmount).toBe(0)
    })
})
