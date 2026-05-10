<script setup lang="ts">
import { computed } from "vue"
import { Clock, ChevronRight, Star, UtensilsCrossed } from "lucide-vue-next"
import type { Package, Modifier } from "../types"

const props = defineProps<{
  pkg: Package
  guestCount: number
  formatCurrency:(value: number | string) => string
}>()

const emit = defineEmits<{
  select: [pkg: Package]
}>()

const packageDuration = computed(() => {
    const pkg = props.pkg as any

    const rawDuration =
    pkg.duration ||
    pkg.time_limit ||
    pkg.minutes ||
    pkg.limit_minutes ||
    pkg.duration_minutes ||
    null

    if (!rawDuration) { return null }

    if (typeof rawDuration === "number") {
        return `${rawDuration} minutes`
    }

    const normalized = String(rawDuration).trim()

    if (/^\d+$/.test(normalized)) {
        return `${normalized} minutes`
    }

    return normalized
})

const previewLimit = 6
const previewOverflow = computed<number>(() => {
    const total = (props.pkg?.modifiers || []).length
    return Math.max(0, total - previewLimit)
})

type ModifierGroup = { label: string; items: Modifier[] }

const PRIORITY_ORDER = ["PORK", "BEEF", "CHICKEN", "SEAFOOD", "OTHER"]

const modifierGroups = computed<ModifierGroup[]>(() => {
    const mods = (props.pkg?.modifiers || []) as Modifier[]
    if (!mods.length) { return [] }

    // Mirrors stores/Menu.ts:extractModifierGroups — if any group is the "meat"
    // umbrella, bucket by name regex; otherwise group by the modifier's own group.
    const hasMeatUmbrella = mods.some(m => /meat/i.test(String(m.group ?? "")))

    const buckets = new Map<string, Modifier[]>()

    if (hasMeatUmbrella) {
        for (const m of mods) {
            const name = m.name || ""
            let label = "OTHER"
            if (/pork/i.test(name)) { label = "PORK" } else if (/beef/i.test(name)) { label = "BEEF" } else if (/chicken/i.test(name)) { label = "CHICKEN" } else if (/seafood|shrimp|fish|crab|lobster|squid/i.test(name)) { label = "SEAFOOD" }
            pushTo(buckets, label, m)
        }
    } else {
        for (const m of mods) {
            const label = (m.group || "OTHER").toString().toUpperCase()
            pushTo(buckets, label, m)
        }
    }

    const ordered: ModifierGroup[] = []
    const seen = new Set<string>()

    for (const label of PRIORITY_ORDER) {
        const items = buckets.get(label)
        if (items?.length) {
            ordered.push({ label, items })
            seen.add(label)
        }
    }
    for (const [label, items] of buckets) {
        if (!seen.has(label) && items.length) {
            ordered.push({ label, items })
        }
    }

    return ordered
})

function pushTo (map: Map<string, Modifier[]>, key: string, value: Modifier) {
    const existing = map.get(key)
    if (existing) { existing.push(value) } else { map.set(key, [value]) }
}
</script>

<template>
    <article
        class="group relative flex h-full min-h-0 flex-col overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#151517] shadow-[0_16px_48px_rgba(0,0,0,0.45)] transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-[#f6b56d]/40 hover:shadow-[0_20px_64px_rgba(0,0,0,0.6)]"
    >
        <div
            v-if="pkg.is_popular"
            class="absolute -top-2.5 left-4 z-10 flex items-center gap-1 rounded-full bg-[#f6b56d] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-black shadow-[0_8px_20px_rgba(246,181,109,0.18)]"
        >
            <Star :size="10" stroke-width="0" fill="currentColor" />
            Most Popular
        </div>

        <!-- Header -->
        <header class="flex-none px-4 pt-5">
            <h2 class="font-raleway text-lg font-extrabold tracking-tight text-white">
                {{ pkg.name }}
            </h2>

            <p
                v-if="pkg.description"
                class="mt-1.5 line-clamp-2 text-xs leading-snug text-white/45"
            >
                {{ pkg.description }}
            </p>

            <div class="mt-2.5 flex items-end gap-2">
                <div class="font-kanit text-[1.75rem] font-extrabold leading-none text-[#ffad63]">
                    {{ formatCurrency(pkg.price) }}
                </div>
                <div class="pb-0.5 font-kanit text-xs text-white/65">
                    per person
                </div>
            </div>

            <p class="mt-1 text-[10px] text-white/35">
                × {{ guestCount }} {{ guestCount === 1 ? 'guest' : 'guests' }}
                <span class="text-white/55">
                    = {{ formatCurrency(Number(pkg.price) * guestCount) }}
                </span>
            </p>

            <div
                v-if="packageDuration"
                class="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-bold text-white"
            >
                <Clock :size="12" class="text-[#f6b56d]" />
                {{ packageDuration }}
            </div>
        </header>

        <!-- Modifier groups (image tiles, horizontally scrollable) -->
        <section
            v-if="modifierGroups.length"
            class="mt-4 flex min-h-0 flex-1 flex-col gap-2.5 overflow-hidden px-4"
        >
            <div class="text-[9px] font-bold uppercase tracking-[0.25em] text-white/40">
                Included
            </div>

            <div class="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pkg-groups-scroll">
                <div
                    v-for="group in modifierGroups"
                    :key="group.label"
                    class="flex flex-col gap-1"
                >
                    <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                        <span class="text-[#f6b56d]">{{ group.label }}</span>
                        <span class="text-white/35">{{ group.items.length }}</span>
                    </div>

                    <div
                        class="flex gap-1.5 overflow-x-auto snap-x snap-mandatory pkg-modifier-row"
                    >
                        <div
                            v-for="item in group.items"
                            :key="item.id"
                            class="flex w-[64px] flex-none snap-start flex-col gap-1"
                        >
                            <div class="h-[52px] w-[64px] overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-gray-800 to-gray-900">
                                <NuxtImg
                                    v-if="item.img_url"
                                    :src="item.img_url"
                                    :alt="item.name || 'Modifier'"
                                    class="h-full w-full object-cover"
                                    loading="lazy"
                                    sizes="65px"
                                    format="webp"
                                />
                                <div
                                    v-else
                                    class="flex h-full w-full items-center justify-center text-white/40"
                                >
                                    <UtensilsCrossed :size="18" :stroke-width="1.5" />
                                </div>
                            </div>
                            <p
                                class="line-clamp-2 text-center font-kanit text-[9px] leading-tight text-white/85"
                                :title="item.name"
                            >
                                {{ item.name }}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Footer / CTA -->
        <footer class="mt-auto flex-none px-4 pb-4 pt-4">
            <div class="h-px w-full bg-white/[0.08]" />
            <button
                type="button"
                class="mx-auto mt-4 flex items-center gap-2 font-kanit text-sm font-bold text-[#ffad63] transition group-hover:gap-3 group-hover:text-[#ffc58a] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6b56d]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                @click.stop="emit('select', pkg)"
            >
                View cuts
                <ChevronRight :size="18" />
                <span v-if="previewOverflow > 0" class="text-xs font-semibold text-white/50">+{{ previewOverflow }}</span>
            </button>
        </footer>
    </article>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pkg-modifier-row {
  touch-action: pan-x;
  scrollbar-width: none;
}
.pkg-modifier-row::-webkit-scrollbar {
  display: none;
}

.pkg-groups-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(246, 181, 109, 0.3) transparent;
}
.pkg-groups-scroll::-webkit-scrollbar {
  width: 4px;
}
.pkg-groups-scroll::-webkit-scrollbar-thumb {
  background: rgba(246, 181, 109, 0.3);
  border-radius: 999px;
}

/* Enhanced hover effects */
article {
  transform: translateZ(0);
  -webkit-tap-highlight-color: transparent;
}

article:hover {
  transform: translateY(-2px);
}

article:active {
  transform: translateY(0) scale(0.98);
}

/* Button hover enhancement */
footer button {
  transition: all 0.200s cubic-bezier(0.4, 0, 0.2, 1);
}

footer button:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 24px rgba(246, 181, 109, 0.3);
}

footer button:active {
  transform: scale(0.96);
}

/* Modifier tile hover effects */
.pkg-modifier-row > div:hover {
  transform: scale(1.05);
  transition: transform 0.150s ease-out;
}

.pkg-modifier-row > div:active {
  transform: scale(0.95);
}
</style>
