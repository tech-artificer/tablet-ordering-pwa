<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useMenuStore } from '~/stores/menu'
import { useOrderStore } from '~/stores/order'
import { ref } from 'vue'

const router = useRouter()
const menuStore = useMenuStore()
const orderStore = useOrderStore()

const packages = menuStore.packages
const expanded = ref<number | null>(null)

function toggle(i: number) {
  expanded.value = expanded.value === i ? null : i
}

async function selectPackage(p: any) {
  try {
    orderStore.setPackage(p)
  } catch (e) { /* ignore */ }
  try { await menuStore.loadAllMenus() } catch {}
  await router.push({ path: '/menu', query: { packageId: p.id } })
}
</script>

<template>
  <div class="h-screen w-screen flex items-start justify-center p-6">
    <div class="w-full max-w-3xl">
      <h2 class="text-2xl font-bold text-white mb-4">Choose a package (fallback)</h2>

      <div v-if="menuStore.isLoadingPackages" class="text-white">Loading packages...</div>
      <div v-else-if="packages.length === 0" class="text-white">No packages available</div>

      <ul v-else class="grid gap-3">
        <li v-for="(p, idx) in packages" :key="p.id" class="bg-white/5 rounded overflow-hidden">
          <button @click.prevent="toggle(idx)" class="w-full text-left p-4 flex items-center justify-between">
            <div>
              <div class="font-bold text-white">{{ p.name }}</div>
              <div class="text-sm text-white/80">₱{{ p.price }} / person</div>
            </div>
            <div class="text-white/80">{{ expanded === idx ? '-' : '+' }}</div>
          </button>

          <transition name="slide-fade">
            <div v-show="expanded === idx" class="p-4 border-t border-white/5 bg-black/5">
              <div v-if="p.img_url" class="mb-3">
                <img :src="p.img_url" :alt="p.name" class="w-full h-40 object-cover rounded" />
              </div>
              <p v-if="p.description" class="text-white/80 mb-3">{{ p.description }}</p>

              <div v-if="p.modifiers && p.modifiers.length" class="mb-3">
                <div class="text-sm text-white/80 mb-1">Included items</div>
                <div class="flex flex-wrap gap-2">
                  <span v-for="m in p.modifiers.slice(0,6)" :key="m.id || m.name" class="px-2 py-1 bg-white/10 rounded text-sm text-white">{{ m.name || (m as any).label || m }}</span>
                </div>
              </div>

              <div class="flex justify-end">
                <button @click.stop="selectPackage(p)" class="px-4 py-2 bg-primary rounded text-black font-semibold">Select</button>
              </div>
            </div>
          </transition>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.slide-fade-enter-active, .slide-fade-leave-active {
  transition: all .25s ease;
}
.slide-fade-enter-from, .slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
