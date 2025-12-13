<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMenuStore } from '../../stores/menu';
// import { Minus, Plus, Check } from '@element-plus/icons-vue';
// import { ElMessage } from 'element-plus';
// import PreOrderSelection from './PreOrderSelection.vue';
// import QuickButtons from './QuickButtons.vue';
import { 
  // ShoppingBag, 
  // Dish, 
  // CoffeeCup, 
  // Headset, 
  // Phone, 
  // Watermelon, 
//   Fire, 
  User, 
  // Document,
  House,
  ShoppingCart,
  // ArrowRight
} from '@element-plus/icons-vue'
import PackageCard from './PackageCard.vue';

const menuStore = useMenuStore();
import { logger } from '../../utils/logger'
logger.debug(menuStore.packages)

const props = defineProps({
  pkg: Object,
  selected: Boolean,
});

const emit = defineEmits(['packageConfirmed']);

// Reactive state
const guestCount = ref(4);
const selectedPackageId = ref('premium'); // Default selection for demonstration

// --- Package Data matching the image structure ---
// const packages = [
//   // P599 Group (Two items stacked vertically)
//   { id: 'standard', name: 'Standard Package', price: 599, group: 'P599', features: ['Pork Belly, Marinated Chicken', '3 Basic Sides'] },
//   { id: 'premium', name: 'Premium Package', price: 899, group: 'P599', features: ['Prime Beef Cuts, Pork, Wagyu Cubes', 'Seafood, Side Dishes'] },
//   // P899 Group (One main item)
//   { id: 'ultimate', name: 'Ultimate Feast', price: 899, group: 'P899', features: ['All Meats, Prawns, Scallops', 'Premium Sides'] },
// ];

// Computed Properties
// const selectedPackage = computed(() => {
//   return packages.find(pkg => pkg.id === selectedPackageId.value);
// });

// const totalPrice = computed(() => {
//   return selectedPackage.value ? selectedPackage.value.price * guestCount.value : 0;
// });

// Methods
const selectPackage = (packageId: string) => {
  // If the user selects the "Ultimate Feast" (which has the same price as Premium)
  // we must ensure they select a unique ID.
  selectedPackageId.value = packageId;
};

const confirmAndProceed = () => {
  if (!selectedPackageId.value) {
    // ElMessage.error('Please select a package to begin!');
    return;
  }

  const packageDetails = {
    guestCount: guestCount.value,
    packageId: selectedPackageId.value,
    // totalPrice: totalPrice.value,
  };

  emit('packageConfirmed', packageDetails);
};
</script>


<template>
  <div class="flex flex-col items-center justify-center">
<!-- 
    <section>
      <h2 class="font-raleway text-3xl text-white font-semibold mb-4">Choose Your Package</h2>
      <p class="font-kanit text-primary">Some Text</p>
     
      <div class="flex flex-row gap-6">
        <OrderingPackageCard />
      </div>

    
    </section> -->

     <PackageCard />
     <!-- <QuickButtons /> -->

      <!-- Bottom Navigation -->
      <div class="bg-white border-t  px-6 w-full py-4">
        <div class="flex justify-between items-center w-100">
          <el-button class="flex-1 mx-2 ui-hover-lift" type="info" link>
            <el-icon class="mr-2"><House /></el-icon>
            Home
          </el-button>
          <el-button class="flex-1 mx-2 ui-hover-lift" type="info" link>
            <el-icon class="mr-2"><ShoppingCart /></el-icon>
            Cart
          </el-button>
          <el-button class="flex-1 mx-2 ui-hover-lift" type="info" link>
            <el-icon class="mr-2"><User /></el-icon>
            Profile
          </el-button>
        </div>
      </div>

  </div>

  <!-- <div class="p-4 rounded-lg transition-all duration-200"
    :class="[props.selected ? 'border-4 border-orange-500 bg-gray-700 shadow-xl' : 'border border-gray-700 bg-gray-700 hover:bg-gray-600']">

    <div class="flex justify-between items-start">
      <div>
        <h3 class="text-xl font-bold mb-1" :class="props.selected ? 'text-orange-500' : 'text-white'">
          <span v-if="true" class="text-sm font-normal text-gray-300">P599 / </span>
          <span v-if="false" class="text-sm font-normal text-gray-300">P899 / person</span>
          Noble Selection
        </h3>
        <p class="text-xs text-gray-400"> meats </p>
      </div>
      <el-icon v-if="props.selected" :size="24" class="text-orange-500">
        <Check />
      </el-icon>
    </div>
  </div> -->
 
</template>


<style scoped>
/* Ensure custom styling for large, circular buttons */

/* Element Plus customizations */
:deep(.el-card) {
  border-radius: 16px;
}

:deep(.el-card__body) {
  padding: 0;
}

:deep(.el-button) {
  border-radius: 12px;
}

/* Ensure the outer container styling for the background image */
</style>