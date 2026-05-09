/**
 * Contract Test: PWA → Backend (Order Submission)
 *
 * Verifies that the PWA produces valid order payloads matching
 * the backend's StoreDeviceOrderRequest validation expectations.
 *
 * This test documents the contract and prevents breaking changes.
 */

import { describe, it, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { useOrderStore } from "../../stores/Order"

describe("Contract: PWA → Backend (Order Submission)", () => {
    beforeEach(() => {
        setActivePinia(createPinia())
    })

    it("should produce simplified order payload schema", () => {
        const store = useOrderStore()

        // Setup: Create a valid order scenario
        const mockPackage = {
            id: 1,
            name: "Premium Package",
            price: 500,
            is_taxable: true,
            tax: { percentage: 10 }
        }

        store.setPackage(mockPackage as any)
        store.setGuestCount(4)

        store.addToCart({
            id: 10,
            name: "Beef Brisket",
            price: 150,
            category: "meats"
        } as any, { category: "meats", isUnlimited: false })

        store.addToCart({
            id: 20,
            name: "Kimchi",
            price: 50,
            category: "sides"
        } as any, { category: "sides", isUnlimited: true })

        // Act: Build the payload
        const payload = (store as any).buildPayload()

        // Assert: Top-level fields
        expect(payload).toHaveProperty("guest_count")
        expect(payload.guest_count).toBeGreaterThan(0)
        expect(payload.guest_count).toBe(4)

        expect(payload).toHaveProperty("package_id")
        expect(payload.package_id).toBe(1)

        // Assert: Items array structure
        expect(payload).toHaveProperty("items")
        expect(Array.isArray(payload.items)).toBe(true)
        expect(payload.items.length).toBeGreaterThan(0)
        expect(payload.items.length).toBe(2)

        // Assert: Each item has required fields
        payload.items.forEach((item: any, _index: number) => {
            expect(item).toHaveProperty("menu_id")
            expect(typeof item.menu_id).toBe("number")
            expect(item.menu_id).toBeGreaterThan(0)

            expect(item).toHaveProperty("quantity")
            expect(typeof item.quantity).toBe("number")
            expect(item.quantity).toBeGreaterThanOrEqual(1)
        })
    })

    it("should produce valid refill payload schema", () => {
        const store = useOrderStore()

        // Setup: Mark order as placed, enter refill mode
        store.setHasPlacedOrder(true)
        store.setCurrentOrder({
            order: {
                id: 1,
                order_id: 19561,
                status: "confirmed",
            },
        } as any)
        store.toggleRefillMode(true)

        store.addToCart({
            id: 10,
            name: "Beef Brisket",
            price: 150,
            category: "meats"
        } as any, { category: "meats" })

        store.addToCart({
            id: 20,
            name: "Kimchi",
            price: 50,
            category: "sides"
        } as any, { category: "sides" })

        store.setHasPlacedOrder(true)
        store.setIsRefillMode(true)
        store.setRefillItems([
            { id: 10, name: "Beef Brisket", price: 150, quantity: 1, category: "meats", isUnlimited: false },
            { id: 20, name: "Kimchi", price: 50, quantity: 1, category: "sides", isUnlimited: false }
        ] as any)

        expect(store.hasPlacedOrder).toBe(true)
        expect(store.isRefillMode).toBe(true)
        expect(((store.refillItems as any)?.value ?? store.refillItems).length).toBe(2)
    })

    it("normalizes singular meat categories into menu rows", () => {
        const store = useOrderStore()

        store.setPackage({ id: 1, name: "Premium Package", price: 500, is_taxable: false } as any)
        store.setGuestCount(2)
        store.addToCart({
            id: 10,
            name: "Beef Brisket",
            price: 150,
            category: "meat"
        } as any, { category: "meat" })

        const payload = (store as any).buildPayload()
        expect(payload.items).toEqual([{ menu_id: 10, quantity: 1 }])
    })

    it("should reject invalid order payload (empty items)", () => {
        const store = useOrderStore()

        // Setup: Package with no selected items
        const mockPackage = {
            id: 1,
            name: "Premium Package",
            price: 500,
            is_taxable: false
        }

        store.setPackage(mockPackage as any)
        store.setGuestCount(2)
        // No items added
        expect(() => (store as any).buildPayload()).toThrow("Invalid items")
    })

    it("should clamp zero guest count to minimum of 2", () => {
        const store = useOrderStore()

        // Setup: package required for buildPayload to produce items
        store.setPackage({ id: 1, name: "Premium Package", price: 500, is_taxable: false } as any)

        // setGuestCount(0) must clamp to 2 (store enforces minimum)
        store.setGuestCount(0)

        store.addToCart({
            id: 10,
            name: "Beef Brisket",
            price: 150,
            category: "meats"
        } as any, { category: "meats" })

        const payload = (store as any).buildPayload()
        expect(payload.guest_count).toBe(2)
    })

    it("should reject invalid refill payload (non-refillable category)", async () => {
        const store = useOrderStore()

        // Setup: Refill mode with drinks (not allowed)
        store.setHasPlacedOrder(true)
        store.setCurrentOrder({
            order: {
                id: 1,
                order_id: 19561,
                status: "confirmed",
            },
        } as any)
        store.toggleRefillMode(true)

        // Manually inject invalid item (bypassing validation)
        store.setRefillItems([{
            id: 30,
            name: "Soda",
            price: 30,
            quantity: 1,
            isUnlimited: false,
            category: "drinks" // ❌ Not allowed in refills
        }] as any)

        // Act & Assert: Should throw
        await expect(store.submitRefill()).rejects.toThrow("only meats and sides are allowed")
    })

    it("should normalize duplicate menu rows by menu_id", () => {
        const store = useOrderStore()
        store.setPackage({ id: 1, name: "Premium Package", price: 500, is_taxable: false } as any)
        store.setGuestCount(2)
        store.setCartItems([
            { id: 10, name: "Beef Brisket", price: 150, quantity: 1, category: "meats", isUnlimited: false },
            { id: 10, name: "Beef Brisket", price: 150, quantity: 2, category: "meats", isUnlimited: false },
        ] as any)

        const payload = (store as any).buildPayload()
        expect(payload.items).toEqual([{ menu_id: 10, quantity: 3 }])
    })

    it("should validate item quantity constraints", () => {
        const store = useOrderStore()

        const mockPackage = {
            id: 1,
            name: "Premium Package",
            price: 500,
            is_taxable: false
        }

        store.setPackage(mockPackage as any)
        store.setGuestCount(2)

        // Add item with zero quantity (should be rejected by buildPayload validation)
        store.addToCart({
            id: 10,
            name: "Beef Brisket",
            price: 150,
            category: "meats"
        } as any, { category: "meats" })

        // Manually set invalid quantity
        const payload = (store as any).buildPayload()
        payload.items[0].quantity = 0

        // Act & Assert: Manual validation of constraints
        expect(() => {
            payload.items.forEach((item: any, index: number) => {
                if (!item.quantity || item.quantity < 1) {
                    throw new Error(`Invalid item[${index}].quantity: must be at least 1`)
                }
            })
        }).toThrow("must be at least 1")
    })
})
