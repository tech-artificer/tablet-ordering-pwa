<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Package, Modifier } from '../types'
import { formatCurrency } from '../utils/formats'
import { useMenuStore } from '../stores/menu'

const menuStore = useMenuStore()
const { extractModifierGroups } = menuStore

const visible = ref(false)

const open = () => { visible.value = true }
const close = () => { visible.value = false }

defineExpose({ open, close })

const props = defineProps<{ pkg: Package }>()
const emit = defineEmits(['select'])

// local accent palette (fallback when package doesn't provide color)
const palette = ['#3B82F6', '#EF4444', '#10B981', '#8B5CF6', '#F59E0B']
const accent = computed(() => (props.pkg as any)?.accent || (props.pkg as any)?.color || palette[(props.pkg?.id || 0) % palette.length])

// Standard popular badge color (amber for better contrast)
const popularColor = '#F59E0B'

// Group modifiers by `group` property, but split 'meat' umbrella into PORK/BEEF/CHICKEN where possible
const groups = computed(() => {
  const mods = (props.pkg?.modifiers || []) as Modifier[]
  if (!mods || mods.length === 0) return {} as Record<string, Modifier[]>

  // Detect umbrella meat group names like 'Meat order'
  const groupNames = Array.from(new Set(mods.map(m => m.group || 'Other')))
  const hasMeatUmbrella = groupNames.some(g => /meat/i.test(String(g)))

  if (hasMeatUmbrella) {
    const pork = mods.filter(m => /pork/i.test(m.name || ''))
    const beef = mods.filter(m => /beef/i.test(m.name || ''))
    const chicken = mods.filter(m => /chicken/i.test(m.name || ''))
    const others = mods.filter(m => !/pork|beef|chicken/i.test(m.name || ''))

    const map: Record<string, Modifier[]> = {}
    if (pork.length) map['PORK'] = pork
    if (beef.length) map['BEEF'] = beef
    if (chicken.length) map['CHICKEN'] = chicken
    if (others.length) map['Other'] = others
    return map
  }

  // Default: group by declared group name
  return mods.reduce((acc: Record<string, Modifier[]>, mod) => {
    const g = mod.group || 'Other'
    if (!acc[g]) acc[g] = []
    acc[g].push(mod)
    return acc
  }, {})
})

// Selection state
const selectedModifiers = ref(new Set<number>())
const toggleModifier = (mod: Modifier) => {
  if (!mod || typeof mod.id === 'undefined') return
  if (selectedModifiers.value.has(mod.id)) selectedModifiers.value.delete(mod.id)
  else selectedModifiers.value.add(mod.id)
}

const isSelected = (mod: Modifier) => selectedModifiers.value.has(mod.id)

// Select package and close modal (navigates to menu)
const selectPackage = () => {
  emit('select', props.pkg)
  selectedModifiers.value.clear()
  close()
}

const onClose = () => {
  selectedModifiers.value.clear()
  close()
}
</script>

<template>
  <el-dialog v-model="visible" width="920px" custom-class="package-modal modern" :close-on-click-modal="false">
    <!-- Modern Header -->
    <div class="modal-header p-4 flex items-start gap-4">
      <div class="accent-bar rounded h-10" :style="{ backgroundColor: accent }"></div>

      <div class="flex-1">
        <div class="flex items-center gap-3 justify-between">
          <div>
            <h2 class="text-2xl font-extrabold text-white">{{ props.pkg.name }}</h2>
            <div class="text-sm text-white/60 mt-1">{{ formatCurrency(props.pkg.price) }} <span class="text-xs opacity-70">/ person</span></div>
          </div>

          <div class="flex items-center gap-3">
            <div v-if="(props.pkg as any)?.is_popular" class="px-3 py-1 rounded-full text-xs font-semibold text-white" :style="{ backgroundColor: popularColor }">POPULAR</div>
            <button @click="onClose" class="text-white/70 hover:text-white text-2xl leading-none px-3" aria-label="Close">×</button>
          </div>
        </div>
        <p v-if="props.pkg.description" class="text-sm text-white/60 mt-3">{{ props.pkg.description }}</p>
      </div>
    </div>

    <!-- Content: two-column layout -->
    <div class="p-4 max-h-[70vh] overflow-auto">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left: visual and quick highlights -->
        <div class="col-span-1">
          <div class="rounded-lg overflow-hidden shadow-md">
            <NuxtImg
              v-if="props.pkg.img_url"
              :src="props.pkg.img_url"
              :alt="props.pkg.name || 'Package image'"
              class="w-full h-48 object-cover"
              loading="lazy"
              sizes="(max-width: 1024px) 100vw, 300px"
              format="webp"
            />
            <div v-else class="w-full h-48 bg-gradient-to-br from-gray-800 to-gray-900"></div>
            <div class="p-4 bg-white/3">
              <h4 class="text-lg font-semibold text-white mb-2">Included Highlights</h4>
              <ul class="text-sm text-white/80 space-y-2">
                <li v-if="extractModifierGroups(props.pkg).length"><strong>Groups:</strong> {{ extractModifierGroups(props.pkg).join(', ') }}</li>
                <li><strong>Service:</strong> Table Grilling Service</li>
                <li v-if="props.pkg.is_popular"><strong>Popularity:</strong> Recommended</li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Right: full modifier groups -->
        <div class="col-span-2">
          <div class="space-y-4">
            <template v-for="(mods, group) in groups" :key="group">
              <div>
                <div class="flex items-center justify-between mb-3">
                  <div class="font-semibold text-base text-white">{{ group }}</div>
                  <div class="text-sm text-white/60">{{ mods.length }} items</div>
                </div>

                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
                  <div v-for="mod in mods" :key="mod.id"
                       @click.stop="toggleModifier(mod)"
                       role="button"
                       tabindex="0"
                       @keydown.enter.stop.prevent="toggleModifier(mod)"
                       :class="['modifier-card p-3 rounded-lg cursor-pointer transition', isSelected(mod) ? 'selected' : '']">

                    <div class="flex items-center gap-3">
                      <NuxtImg
                        v-if="mod.img_url"
                        :src="mod.img_url"
                        class="w-14 h-14 object-cover rounded-md"
                        :alt="mod.name || 'Menu item'"
                        loading="lazy"
                        sizes="56px"
                        format="webp"
                      />
                      <div v-else class="w-14 h-14 bg-gray-700/40 rounded-md flex items-center justify-center text-sm text-white">No image</div>

                      <div class="flex-1">
                        <div class="text-sm font-medium text-white">{{ mod.name }}</div>
                        <div v-if="mod.price" class="text-xs text-white/60 mt-1">+ {{ formatCurrency(mod.price) }}</div>
                      </div>
                    </div>

                    <div class="mt-3 flex items-center justify-between">
                      <div class="text-xs text-white/50">{{ mod.description || '' }}</div>
                      <div class="select-badge text-sm font-semibold" v-if="isSelected(mod)">Selected</div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer: slim, centered actions -->
    <div class="w-full bg-gradient-to-t from-black/30 to-transparent p-3 border-t border-white/6 sticky-footer">
      <div class="max-w-[880px] mx-auto flex items-center justify-end gap-3">
        <button @click="onClose" class="min-h-[44px] px-4 py-2 bg-transparent border border-white/12 rounded-full text-white">Close</button>
        <button @click="selectPackage" class="min-h-[44px] px-6 py-3 bg-primary text-secondary rounded-full font-bold flex items-center gap-2">
          <span>Select This Package</span>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>

  </el-dialog>
</template>

<style scoped>
/* Ensure the dialog body has no extra padding so our header and footer align cleanly */
:deep(.package-modal .el-dialog__body) {
  padding: 0;
}

/* Make the sticky footer visually sit above content when scrolled */
:deep(.package-modal .sticky-footer) {
  position: sticky;
  bottom: 0;
  z-index: 10;
}

/* Modernized modal styles */
:deep(.package-modal.modern .modal-header) {
  padding: 1rem 1rem;
}

:deep(.package-modal.modern .accent-bar) {
  width: 8px;
}

:deep(.package-modal.modern .modifier-card) {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.04);
  transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease;
}

:deep(.package-modal.modern .modifier-card:hover) {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.45);
}

:deep(.package-modal.modern .modifier-card.selected) {
  border-color: rgba(255,255,255,0.12);
  box-shadow: 0 10px 30px rgba(0,0,0,0.55);
  transform: translateY(-6px);
}

:deep(.package-modal.modern .select-badge) {
  background: rgba(255,255,255,0.04);
  padding: 4px 8px;
  border-radius: 999px;
  color: #fff;
}

:deep(.package-modal .el-dialog__body) img { max-width: 100%; height: auto }
</style>