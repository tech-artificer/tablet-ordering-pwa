<script setup lang="ts">
const showInstallBanner = ref(false)

// PWA install prompt
let deferredPrompt: any = null
const installPWA = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      showInstallBanner.value = false
    }
    
    deferredPrompt = null
  }
}

const dismissInstallBanner = () => {
  showInstallBanner.value = false
  if (process.client) {
    localStorage.setItem('pwa-install-dismissed', 'true')
  }
}

onMounted(() => {
  if (process.client) {
    // Check if PWA install banner should be shown
    const dismissed = localStorage.getItem('pwa-install-dismissed')
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    
    if (!dismissed && !isStandalone) {
      showInstallBanner.value = true
    }

    // Listen for PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt = e
      showInstallBanner.value = true
    })
  }
})

</script>



<template>
    <div class="">
         <div 
        v-if="showInstallBanner" 
        class="bg-black text-white px-4 py-2 text-sm flex items-center justify-between"
        >
        <span>Install this app for a better experience</span>
        <div class="flex gap-2">
            <button 
            @click="installPWA" 
            class="bg-blue-500 px-3 py-1 rounded text-xs hover:bg-blue-400 transition-colors"
            >
            Install
            </button>
            <button 
            @click="dismissInstallBanner" 
            class="text-blue-200 hover:text-white"
            >
            ×
            </button>
        </div>
        </div>
        </div>
</template>