<script setup lang="ts">
import { computed } from "vue"
import { Clock, ChevronRight, Star, UtensilsCrossed } from "lucide-vue-next"
import type { Package, Modifier } from "../types"
import { displayMeatGroupLabel, groupPackageModifierPreviews } from "../utils/packageModifierGroups"

const props = defineProps<{
  pkg: Package
  guestCount: number
  isSelected: boolean
  formatCurrency:(value: number | string) => string
}>()

const emit = defineEmits<{
  "view-modifiers": [pkg: Package]
  select: [pkg: Package]
  focus: [pkg: Package]
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

const modifierGroups = computed(() => {
    return groupPackageModifierPreviews((props.pkg?.modifiers || []) as Modifier[], 4)
})

const totalModifierCount = computed(() => modifierGroups.value.reduce((total, group) => total + group.items.length, 0))
const previewItems = computed(() => modifierGroups.value.flatMap(group => group.previewItems).slice(0, 4))
const hiddenPreviewCount = computed(() => Math.max(totalModifierCount.value - previewItems.value.length, 0))

const packageSubtitle = computed(() => {
    const groups = modifierGroups.value.map(group => displayMeatGroupLabel(group.label).toLowerCase())
    return groups.length ? `${groups.join(" + ")} lineup` : "Unlimited Korean BBQ spread"
})

const inclusionChecklist = computed(() => {
    const groupItems = modifierGroups.value.map(group => `${group.items.length} unlimited ${displayMeatGroupLabel(group.label).toLowerCase()} cuts`)
    return [
        ...groupItems.slice(0, 3),
        "Standard banchan set",
    ].slice(0, 4)
})
</script>

<template>
    <article
        class="package-editorial-card group relative grid h-full min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden rounded-[1.35rem] border bg-[radial-gradient(circle_at_50%_-12%,rgba(255,178,99,0.1),transparent_34%),linear-gradient(180deg,#1a1410_0%,#100d0a_100%)] px-6 py-6 text-white shadow-[0_22px_60px_rgba(0,0,0,0.52)] transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#ffbd72]/55 hover:shadow-[0_26px_70px_rgba(0,0,0,0.64)] cursor-pointer"
        :class="isSelected
            ? 'border-[#ffbd72] shadow-[0_0_0_1px_rgba(255,189,114,0.45),0_22px_60px_rgba(0,0,0,0.52),0_0_40px_rgba(255,189,114,0.12)]'
            : 'border-[#4b3826]/80'"
        tabindex="0"
        @click="emit('select', pkg)"
        @focus="emit('focus', pkg)"
    >
        <div
            v-if="pkg.is_popular"
            class="absolute right-4 top-4 z-10 flex items-center gap-1 rounded-full bg-[#ffbd72] px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#140c06] shadow-[0_10px_24px_rgba(255,189,114,0.28)]"
        >
            <Star :size="10" stroke-width="0" fill="currentColor" />
            Most Popular
        </div>

        <!-- Header -->
        <header class="min-w-0">
            <h2 class="font-raleway text-[1.65rem] font-extrabold tracking-normal text-white leading-tight">
                {{ pkg.name }}
            </h2>

            <p class="mt-1 line-clamp-2 text-sm font-bold text-white/52">
                {{ (pkg as any).description || packageSubtitle }}
            </p>

            <div class="mt-6 flex items-end gap-3">
                <div class="font-kanit text-[2.35rem] font-extrabold leading-none text-white">
                    {{ formatCurrency(Number(pkg.price) * guestCount) }}
                </div>
                <div class="min-w-0 overflow-hidden pb-1.5 font-kanit text-xs font-bold text-white/42">
                    <span class="block truncate">{{ formatCurrency(pkg.price) }}/guest<span v-if="packageDuration"> · {{ packageDuration }}</span></span>
                </div>
            </div>
        </header>

        <section class="mt-5 min-h-0 overflow-hidden border-t border-white/10 pt-4">
            <ul class="space-y-2.5">
                <li
                    v-for="item in inclusionChecklist"
                    :key="item"
                    class="flex items-start gap-3 text-sm leading-tight text-white/72"
                >
                    <span class="mt-0.5 text-[#22c986]" aria-hidden="true">✓</span>
                    <span>{{ item }}</span>
                </li>
            </ul>

            <div
                v-if="packageDuration"
                class="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white/70"
            >
                <Clock :size="12" class="text-[#f6b56d]" />
                Table time included
            </div>
        </section>

        <!-- Footer / CTA -->
        <footer class="mt-5">
            <button
                type="button"
                class="package-meat-rail grid min-h-[3.8rem] w-full grid-cols-[auto_1fr_auto] items-center gap-4 rounded-2xl border border-[#9c6832]/65 bg-[#23170f]/82 px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_12px_34px_rgba(0,0,0,0.34)] transition-[border-color,background-color,transform] duration-150 hover:border-[#ffbd72] hover:bg-[#2a1a10] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffbd72]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                @click.stop="emit('view-modifiers', pkg)"
            >
                <span class="flex min-w-[5.6rem] items-center">
                    <span
                        v-for="item in previewItems"
                        :key="item.id"
                        class="-ml-2 first:ml-0 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#ffbd72]/25 bg-[#100c09] shadow-[0_5px_15px_rgba(0,0,0,0.45)]"
                    >
                        <NuxtImg
                            v-if="item.img_url"
                            :src="item.img_url"
                            :alt="item.name || 'Meat cut'"
                            class="h-full w-full object-cover"
                            loading="lazy"
                            sizes="36px"
                            format="webp"
                        />
                        <UtensilsCrossed v-else :size="15" class="text-[#ffbd72]/65" :stroke-width="1.6" />
                    </span>
                    <span
                        v-if="hiddenPreviewCount > 0"
                        class="-ml-2 flex h-9 w-9 items-center justify-center rounded-full border border-black/30 bg-[#1b120c] text-[10px] font-black text-[#ffbd72]"
                    >
                        +{{ hiddenPreviewCount }}
                    </span>
                </span>

                <span class="text-sm font-extrabold text-white">View</span>

                <ChevronRight :size="18" class="text-[#ffbd72]" />
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

.package-editorial-card,
.package-meat-rail {
  transform: translateZ(0);
  -webkit-tap-highlight-color: transparent;
}

article:active {
  transform: translateY(0) scale(0.98);
}

footer button {
  transition: all 0.200s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
