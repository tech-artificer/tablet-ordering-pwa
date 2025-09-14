<script setup lang="ts">
// Import your card components
import BasicPackageCard from '~/components/cards/BasicPackageCard.vue'
// import FeaturedPackageCard from '~/components/cards/FeaturedPackageCard.vue'
// import PremiumPackageCard from '~/components/cards/PremiumPackageCard.vue'


import { ref } from 'vue'

const packageStore = usePackageStore()
const cartStore = useCartStore()
const guestStore = useGuestStore()
const menuStore = useMenuStore()

const { selectedPackage, selectedPackageName, packageList, isLoading } = storeToRefs(packageStore)
const { cartItems } = storeToRefs(cartStore)
// const { count } = storeToRefs(guestStore)
// const { menuItems } = storeToRefs(menuStore)
console.log('cartItems', packageList.value)
// Loading state for package selection
const isSelecting = ref(false)
const selectingPackageId = ref(null)


packageList.value.map((pkg, index) => {
    console.log('pkg', pkg.receipt_name)
})
const validPackages = computed(() => {
    if (!packageList.value || !Array.isArray(packageList.value)) {
        return []
    }

    return packageList.value.map((pkg, index) => ({
        id: pkg.id,
        ordered_menu_id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        subtotal: pkg.price,
        receipt_name: pkg.receipt_name,
        badge: index === 1 ? 'BEST' : index === 0 ? 'BASIC' : 'PREMIUM',
        items: pkg.modifiers || [],
        img_url: pkg.img_url,
        tax: 0,
        discount: 0,
        tax_amount: 0,
    })).filter( pkg => {
         pkg &&
        pkg.id !== null &&
        pkg.id !== undefined &&
        pkg.id !== 0
    })
})

// const isValidPackageList = computed(() => {
//     return validPackages.value.length > 0
// })

// const initializeSelectedPackage = () => {
//     try {
//         if (validPackages.value.length > 0) {
//             const defaultPackage = selectedPackage.value || validPackages.value[0]

//             if (defaultPackage && defaultPackage.id) {
//                 selectedPackage.value = defaultPackage.id
//                 selectedPackageName.value = defaultPackage.name

//                 if (defaultPackage.items && Array.isArray(defaultPackage.items)) {
//                     cartItems.value = [
//                         {
//                             id: defaultPackage.id,
//                             ordered_menu_id: defaultPackage.id,
//                             menu_id: defaultPackage.id,
//                             name: defaultPackage.name || 'Unnamed Package',
//                             receipt_name: defaultPackage.receipt_name || 'Unnamed Package',
//                             quantity: count.value || 1,
//                             discount: 0,
//                             tax_amount: 0,
//                             tax: 0,
//                             price: defaultPackage.price || 0,
//                             subtotal: defaultPackage.price || 0,
//                             img_url: CustomLogo.LOGO_2
//                         },
//                         ...defaultPackage.items.map(item => ({
//                             ...item,
//                             menu_id: item.id,
//                             ordered_menu_id: item.id,
//                             price: 0,
//                             subtotal: 0,
//                             tax_amount: 0,
//                             tax: 0,
//                             quantity: count.value || 1,
//                             discount: 0,
//                         })),
//                     ]
//                 }
//             }
//         }
//     } catch (error) {
//         console.error('Error initializing selected package:', error)
//         selectedPackage.value = null
//         cartItems.value = []
//     }
// }

// const handlePackageSelect = (packageId, packageItems, packageName, price) => {
//     try {
//         if (!packageId) {
//             console.error('Package ID is required')
//             return
//         }

//         selectedPackage.value = packageId
//         selectedPackageName.value = packageName || 'Unnamed Package'
//         cartItems.value = []

//         cartItems.value.push({
//             id: packageId,
//             ordered_menu_id: packageId,
//             menu_id: packageId,
//             name: packageName || 'Unnamed Package',
//             receipt_name: packageName || 'Unnamed Package',
//             subtotal: price || 0,
//             quantity: count.value || 1,
//             discount: 0,
//             tax_amount: 0,
//             tax: 0,
//             price: price || 0,
//             img_url: CustomLogo.LOGO_2
//         })

//         if (packageItems && Array.isArray(packageItems)) {
//             menuItems.value = packageItems.filter(item => item && item.id)

//             cartItems.value.forEach((item, index) => {
//                 if (index !== 0) item.price = 0
//                 item.quantity = count.value || 1
//                 item.menu_id = item.id
//                 item.ordered_menu_id = item.id
//                 item.subtotal = item.price || 0
//                 item.discount = 0
//                 item.tax_amount = 0
//                 item.tax = 0
//             })
//         }
//     } catch (error) {
//         console.error('Error selecting package:', error)
//     }
// }

// New function to handle the button click with loading
// const handleSelectPackage = async (packageId, packageItems, packageName, price) => {
//     if (isSelecting.value) return // Prevent multiple clicks

//     try {
//         // Set loading state for the specific package
//         isSelecting.value = true
//         selectingPackageId.value = packageId

//         // Simulate API call or processing time (2 seconds)
//         await new Promise(resolve => setTimeout(resolve, 2000))

//         // Call the original package selection logic
//         handlePackageSelect(packageId, packageItems, packageName, price)

//         // Emit the modal change event
//         handleIncludeItemsModal()

//     } catch (error) {
//         console.error('Error during package selection:', error)
//     } finally {
//         // Reset loading state
//         isSelecting.value = false
//         selectingPackageId.value = null
//     }
// }

// const emit = defineEmits(['changeIncludeItemsModalStatus'])

// const handleIncludeItemsModal = () => {
//     emit('changeIncludeItemsModalStatus')
// }

// watch(() => packageList.value, () => {
//     if (packageList.value.length > 0) {
//         initializeSelectedPackage()
//     }
// }, { deep: true })
// console.log('packageStore', packageStore)



// const handleSelection = (packageData) => {
//   console.log('Package selected:', packageData)
//   // Handle the package selection here
// }
</script>

<template>
  <div class="pricing-layout z-10">
    <div class="text-white">
      <h2>Choose Your Package</h2>
      <p>Select the perfect meal package for your needs</p>
    </div>
    
    <el-row :gutter="16" justify="center" class="pricing-cards">
      <el-col :xs="24" :sm="8" :md="8" :lg="8" v-for="packageItem in packageList">
        <BasicPackageCard />
      </el-col>
    </el-row>
  </div>
</template>



<style scoped>
.pricing-layout {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.pricing-header {
  text-align: center;
  margin-bottom: 2rem;
}

.pricing-header h2 {
  font-size: 2rem;
  font-weight: 800;
  color: var(--el-text-color-primary);
  margin-bottom: 0.5rem;
}

.pricing-header p {
  font-size: 1rem;
  color: var(--el-text-color-regular);
}

.pricing-cards {
  margin: 0;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .pricing-layout {
    padding: 0.5rem;
  }
  
  .pricing-header h2 {
    font-size: 1.5rem;
  }
  
  .pricing-cards :deep(.el-col) {
    margin-bottom: 1rem;
  }
  
  /* Remove featured card scaling on mobile */
  .pricing-cards :deep(.featured-card) {
    transform: none !important;
  }
  
  .pricing-cards :deep(.featured-card:hover) {
    transform: translateY(-4px) !important;
  }
}

@media (max-width: 480px) {
  .pricing-layout {
    padding: 0.25rem;
  }
  
  .pricing-cards {
    margin: 0 -8px;
  }
}

/* Ensure cards are same height */
.pricing-cards :deep(.package-card) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.pricing-cards :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.pricing-cards :deep(.package-features) {
  flex: 1;
}
</style>