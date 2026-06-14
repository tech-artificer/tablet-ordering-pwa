import type { Modifier, PackageAllowedMenu } from "../types"

export type MeatGroupLabel = "PORK" | "BEEF" | "CHICKEN"

export type PackageModifierGroup = {
    label: MeatGroupLabel
    items: Modifier[]
}

export type PackageModifierPreviewGroup = PackageModifierGroup & {
    previewItems: Modifier[]
    hiddenCount: number
}

export const MEAT_GROUPS: MeatGroupLabel[] = ["PORK", "BEEF", "CHICKEN"]

const RECEIPT_PREFIX_TO_GROUP: Record<string, MeatGroupLabel> = {
    P: "PORK",
    B: "BEEF",
    C: "CHICKEN",
}

export function classifyPackageModifier (modifier: Modifier): MeatGroupLabel | null {
    const receiptPrefix = String(modifier.receipt_name || "")
        .trim()
        .toUpperCase()
        .match(/^[PBC](?=\d|$)/)?.[0]

    if (receiptPrefix) {
        return RECEIPT_PREFIX_TO_GROUP[receiptPrefix] ?? null
    }

    const backendGroup = String(modifier.groupName || modifier.group || "").toUpperCase()
    if (/PORK/.test(backendGroup)) {
        return "PORK"
    }
    if (/BEEF/.test(backendGroup)) {
        return "BEEF"
    }
    if (/CHICKEN|POULTRY/.test(backendGroup)) {
        return "CHICKEN"
    }

    const name = String(modifier.name || "").toUpperCase()
    if (/PORK|SAMGYUPSAL|LIEMPO|BELLY|PIG/.test(name)) {
        return "PORK"
    }
    if (/BEEF|BRISKET|RIBEYE|SIRLOIN/.test(name)) {
        return "BEEF"
    }
    if (/CHICKEN/.test(name)) {
        return "CHICKEN"
    }

    return null
}

export function groupPackageModifiers (modifiers: Modifier[]): PackageModifierGroup[] {
    const buckets = new Map<MeatGroupLabel, Modifier[]>()

    for (const modifier of modifiers) {
        const label = classifyPackageModifier(modifier)
        if (!label) { continue }

        const existing = buckets.get(label)
        if (existing) {
            existing.push(modifier)
        } else {
            buckets.set(label, [modifier])
        }
    }

    return MEAT_GROUPS.flatMap((label) => {
        const items = buckets.get(label)
        return items?.length ? [{ label, items }] : []
    })
}

export function groupPackageModifierPreviews (modifiers: Modifier[], previewLimit = 3): PackageModifierPreviewGroup[] {
    return groupPackageModifiers(modifiers).map(group => ({
        ...group,
        previewItems: group.items.slice(0, previewLimit),
        hiddenCount: Math.max(group.items.length - previewLimit, 0),
    }))
}

export function displayMeatGroupLabel (label: MeatGroupLabel) {
    return label.charAt(0) + label.slice(1).toLowerCase()
}

// --- PackageAllowedMenu grouping (v2 API shape) ---

const CATEGORY_CODE_TO_LABEL: Record<string, MeatGroupLabel> = {
    P: "PORK",
    B: "BEEF",
    C: "CHICKEN",
}

export type PackageAllowedMenuGroup = {
    label: MeatGroupLabel
    menus: PackageAllowedMenu[]
}

export type PackageAllowedMenuPreviewGroup = PackageAllowedMenuGroup & {
    previewMenus: PackageAllowedMenu[]
    hiddenCount: number
}

export function groupAllowedMenusByCategoryCode (menus: PackageAllowedMenu[]): PackageAllowedMenuGroup[] {
    const meatMenus = menus.filter(m => m.menu_type === "meat" && m.is_active)
    const buckets = new Map<MeatGroupLabel, PackageAllowedMenu[]>()

    for (const menu of meatMenus) {
        const label = CATEGORY_CODE_TO_LABEL[String(menu.meat_category_code ?? "").toUpperCase()] ?? null
        if (!label) { continue }
        const existing = buckets.get(label)
        if (existing) {
            existing.push(menu)
        } else {
            buckets.set(label, [menu])
        }
    }

    return MEAT_GROUPS.flatMap((label) => {
        const items = buckets.get(label)
        return items?.length ? [{ label, menus: items }] : []
    })
}

export function groupAllowedMenuPreviews (menus: PackageAllowedMenu[], previewLimit = 3): PackageAllowedMenuPreviewGroup[] {
    return groupAllowedMenusByCategoryCode(menus).map(group => ({
        ...group,
        previewMenus: group.menus.slice(0, previewLimit),
        hiddenCount: Math.max(group.menus.length - previewLimit, 0),
    }))
}
