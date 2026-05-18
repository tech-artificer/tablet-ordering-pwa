import { describe, expect, it } from "vitest"
import type { Modifier } from "../types"
import {
    classifyPackageModifier,
    groupPackageModifiers,
    groupPackageModifierPreviews
} from "../utils/packageModifierGroups"

function modifier (overrides: Partial<Modifier>): Modifier {
    return {
        id: overrides.id ?? 1,
        group: overrides.group ?? "Meat Order",
        category: overrides.category ?? "Food",
        name: overrides.name ?? "Modifier",
        price: overrides.price ?? 0,
        receipt_name: overrides.receipt_name ?? "",
        description: overrides.description ?? "",
        img_url: overrides.img_url ?? "",
        ...overrides,
    }
}

describe("package modifier grouping", () => {
    it("groups Noble Selection by receipt code prefixes", () => {
        const groups = groupPackageModifiers([
            modifier({ id: 114, name: "Plain Samgyupsal", receipt_name: "P1" }),
            modifier({ id: 115, name: "Kajun Bulmat Samgyupsal", receipt_name: "P2" }),
            modifier({ id: 116, name: "Yangyeom Samgyupsal", receipt_name: "P3" }),
            modifier({ id: 117, name: "Citrus Burst Pepper Samgyupsal", receipt_name: "P4" }),
            modifier({ id: 118, name: "Hyangcho Samgyupsal", receipt_name: "P5" }),
            modifier({ id: 124, name: "Woosamgyup", receipt_name: "B1" }),
            modifier({ id: 125, name: "Beef Bulgogi", receipt_name: "B2" }),
            modifier({ id: 126, name: "Asian Gochu Woosamgyup", receipt_name: "B3" }),
        ])

        expect(groups.map(group => [group.label, group.items.length])).toEqual([
            ["PORK", 5],
            ["BEEF", 3],
        ])
    })

    it("lets receipt code beat name-based guessing", () => {
        expect(classifyPackageModifier(modifier({ name: "Woosamgyup", receipt_name: "B1" }))).toBe("BEEF")
        expect(classifyPackageModifier(modifier({ name: "Samgyupsal", receipt_name: "B3" }))).toBe("BEEF")
        expect(classifyPackageModifier(modifier({ name: "Beef Bulgogi", receipt_name: "P2" }))).toBe("PORK")
    })

    it("falls back to backend group and legacy name heuristics only without receipt code", () => {
        expect(classifyPackageModifier(modifier({ groupName: "Chicken", name: "Plain", receipt_name: "" }))).toBe("CHICKEN")
        expect(classifyPackageModifier(modifier({ group: "Beef", name: "Plain", receipt_name: "" }))).toBe("BEEF")
        expect(classifyPackageModifier(modifier({ group: "Meat Order", name: "Plain Samgyupsal", receipt_name: "" }))).toBe("PORK")
    })

    it("computes preview hidden counts from grouped totals", () => {
        const previews = groupPackageModifierPreviews([
            modifier({ id: 1, receipt_name: "P1" }),
            modifier({ id: 2, receipt_name: "P2" }),
            modifier({ id: 3, receipt_name: "P3" }),
            modifier({ id: 4, receipt_name: "P4" }),
            modifier({ id: 5, receipt_name: "P5" }),
        ])

        expect(previews).toHaveLength(1)
        expect(previews[0]).toMatchObject({
            label: "PORK",
            hiddenCount: 2,
        })
        expect(previews[0].previewItems).toHaveLength(3)
    })
})
