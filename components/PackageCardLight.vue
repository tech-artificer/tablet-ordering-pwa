<script setup lang="ts">
import type { Package } from '../types'
import { formatCurrency } from '../utils/formats';


const menuStore = useMenuStore();
const router = useRouter();

// Get packages from store
const packages = computed(() => menuStore.packages);

const handlePackageSelection = (packageData: Package) => {
  // Store selected package (you might want to use a cart/order store)
  // Then navigate to next step (modifier selection or order page)
  import { logger } from '../utils/logger'
  logger.debug('Selected package:', packageData);
  
  // Example: Navigate to order page with package ID
  router.push({
    path: '/order/customize',
    query: { packageId: packageData.id }
  });
};

const modalRef = ref()
const selectedPackage = ref(null)

const openDetails = (pkg: any) => {
  selectedPackage.value = {
    ...pkg,
    modifiers: groupModifiersByCategory(pkg.modifiers)
  }
  modalRef.value?.open()
}

// Group modifiers by category for display; split meat umbrella into PORK/BEEF/CHICKEN when detected
const groupModifiersByCategory = (modifiers: any[]) => {
  if (!modifiers || !Array.isArray(modifiers)) return {};

  const groupNames = Array.from(new Set(modifiers.map(m => m.group || 'Other')))
  const hasMeatUmbrella = groupNames.some(g => /meat/i.test(String(g)))

  if (hasMeatUmbrella) {
    const pork = modifiers.filter(m => /pork/i.test(m.name || ''))
    const beef = modifiers.filter(m => /beef/i.test(m.name || ''))
    const chicken = modifiers.filter(m => /chicken/i.test(m.name || ''))
    const others = modifiers.filter(m => !/pork|beef|chicken/i.test(m.name || ''))

    const map: Record<string, any[]> = {}
    if (pork.length) map['PORK'] = pork
    if (beef.length) map['BEEF'] = beef
    if (chicken.length) map['CHICKEN'] = chicken
    if (others.length) map['Other'] = others
    return map
  }

  return modifiers.reduce((acc, modifier) => {
    const group = modifier.group || 'Other';
    if (!acc[group]) acc[group] = [];
    acc[group].push(modifier);
    return acc;
  }, {} as Record<string, any[]>);
};




</script>



<template>
      <div 
          v-for="item in packages" 
          :key="item.id"
          @click="handlePackageSelection(item)"
          class="bg-surface-10 backdrop-blur-md rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer border-2 border-surface-20 hover:border-surface-10 group">
          <!-- Package Image -->
          <div class="relative h-32 overflow-hidden">
            <NuxtImg
              v-if="item.img_url"
              :src="item.img_url"
              :alt="item.name || 'Package image'"
              class="w-full h-full object-cover transition-all duration-500"
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 50vw"
              format="webp"
              @error="(e) => (e.target as HTMLImageElement).src = '/images/placeholder.jpg'"
            />
            <div v-else class="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900"></div>
              
            
            <!-- Availability Badge -->
            <div 
              v-if="!item.is_available" 
              class="absolute top-4 right-4 bg-red-600 text-on px-4 py-2 rounded-full font-semibold text-sm">
              Not Available
            </div>
            
            <!-- Price Badge -->
            <div class="absolute bottom-4 left-4 bg-backdrop-80 backdrop-blur-sm text-on px-6 py-3 rounded-full">
              <span class="text-sm font-medium">₱</span>
              <span class="text-3xl font-bold">{{ formatCurrency(item.price) }}</span>
              <span class="text-sm font-medium">.{{ formatCurrency((item.price) % 1) }}</span>
            </div>
          </div>

          <!-- Package Info -->
          <div class="p-6">
            <h3 class="text-2xl font-bold text-on mb-2">
              {{ item.name }}
            </h3>
            
            <p class="text-muted text-sm mb-4" v-if="item.kitchen_name !== item.name">
              {{ item.kitchen_name }}
            </p>

            <!-- Tax Info -->
            <div v-if="item.is_taxable && item.tax" class="text-muted-60 text-xs mb-4">
              <span>{{ item.tax.name }}</span>
              <span class="ml-2">+₱{{ formatCurrency(item.tax_amount) }}</span>
            </div>

            <!-- Modifiers Preview -->
            <div v-if="item.modifiers && item.modifiers.length > 0" class="mt-4 space-y-3 max-h-64 ">
              <!-- overflow-y-auto -->
              <div 
                v-for="(modifierList, groupName) in groupModifiersByCategory(item.modifiers)" 
                :key="groupName"
                class="bg-surface-5 rounded-lg p-3">
                <h4 class="text-on font-semibold text-sm mb-2 uppercase tracking-wide">
                  {{ groupName }} ({{ modifierList.length }})
                </h4>
                <div class="flex flex-wrap gap-2">
                  <span 
                    v-for="modifier in modifierList" 
                    :key="modifier.id"
                    class="text-xs bg-surface-10 text-on px-3 py-1 rounded-full hover:bg-surface-5 transition-colors">
                    {{ modifier.name }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Badges -->
            <div class="flex flex-wrap gap-2 mt-4">
              <span v-if="item.is_discountable" class="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
                Discountable
              </span>
              <span class="text-xs bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30">
                {{ item.category }}
              </span>
              <span v-if="item.group" class="text-xs bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full border border-purple-500/30">
                {{ item.group }}
              </span>
            </div>
          </div>

          <!-- Select Button Overlay -->
            <div class="absolute inset-0 bg-transparent group-hover:bg-backdrop-40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button class="px-8 py-4 bg-surface-10 text-on rounded-xl font-bold text-lg transition-all ui-hover-lift">
              Select Package
            </button>
          </div>
        </div>
</template>