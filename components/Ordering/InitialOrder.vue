<template>
  <div class="bg-gray-800 p-6 rounded-xl shadow-2xl">
    
    <el-tabs v-model="activeTab" type="border-card" class="tabs-dark-bg">
      
      <el-tab-pane label="Meats & Sides (Unlimited)" name="meats">
        <h3 class="text-xl font-semibold text-orange-400 mb-4">Select Your Starting Meats (Recommended 3-4 items)</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div v-for="meat in availableMeats" :key="meat.id" class="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
            <div class="flex items-center">
              <img :src="meat.image" :alt="meat.name" class="w-16 h-16 rounded-md object-cover mr-4">
              <div>
                <p class="font-bold text-white">{{ meat.name }}</p>
                <p class="text-sm text-gray-400">{{ meat.description }}</p>
              </div>
            </div>
            <el-checkbox v-model="selectedMeats" :label="meat.id" size="large" border />
          </div>
        </div>

        <h3 class="text-xl font-semibold text-orange-400 mt-8 mb-4 border-t border-gray-600 pt-4">Select Starting Sides (All are refillable!)</h3>
        
        <div class="grid grid-cols-3 gap-4">
          <div v-for="side in availableSides" :key="side.id" class="flex items-center">
            <el-checkbox v-model="selectedSides" :label="side.id" size="large">{{ side.name }}</el-checkbox>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="Drinks & Desserts (Add-Ons)" name="addons">
        <h3 class="text-xl font-semibold text-red-400 mb-4">Add items not included in the package (Extra charge)</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div v-for="item in alaCarteItems" :key="item.id" class="bg-gray-700 p-4 rounded-lg flex justify-between items-center">
            <div class="flex items-center">
              <img :src="item.image" :alt="item.name" class="w-16 h-16 rounded-md object-cover mr-4">
              <div>
                <p class="font-bold text-white">{{ item.name }}</p>
                <p class="text-sm text-gray-400">₱{{ item.price }}</p>
              </div>
            </div>
            <el-input-number v-model="alaCarteQuantities[item.id]" :min="0" :max="99" size="small" />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <div class="mt-8 pt-4 border-t border-gray-600 flex justify-end">
      <el-button 
        type="primary" 
        size="large" 
        @click="proceedToReview" 
        :disabled="!isSelectionValid"
        class="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-8 rounded-lg"
      >
        Review & Confirm Order ({{ total }})
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
// import { ElMessage } from 'element-plus';

const emit = defineEmits(['selectionsComplete']);

const activeTab = ref('meats');
const selectedMeats = ref([]);
const selectedSides = ref(['kimchi', 'lettuce']); // Pre-select common ones
const alaCarteQuantities = reactive({});

// Dummy Data (Replace with data fetched from your backend based on the selected package)
const availableMeats = [
  { id: 'woosamgyup', name: 'Woo Samgyup', description: 'Thinly Sliced Beef Belly', image: '/images/woosamgyup.jpg' },
  { id: 'samgyupsal', name: 'Samgyupsal', description: 'Classic Pork Belly', image: '/images/samgyupsal.jpg' },
  { id: 'gochuchicken', name: 'Gochujang Chicken', description: 'Spicy Marinated Chicken', image: '/images/chicken.jpg' },
  { id: 'spicybulgogi', name: 'Spicy Bulgogi', description: 'Marinated Pork Slices', image: '/images/bulgogi.jpg' },
];

const availableSides = [
  { id: 'kimchi', name: 'Kimchi' },
  { id: 'lettuce', name: 'Lettuce & Ssamjang' },
  { id: 'radish', name: 'Pickled Radish' },
  { id: 'steamedegg', name: 'Steamed Egg' },
];

const alaCarteItems = [
  { id: 'soju', name: 'Soju (Classic)', price: 180, image: '/images/soju.jpg' },
  { id: 'coke', name: 'Coca-Cola (Can)', price: 60, image: '/images/coke.jpg' },
  { id: 'halo', name: 'Halo-Halo', price: 150, image: '/images/halo.jpg' },
];

// Initialize alaCarteQuantities
alaCarteItems.forEach(item => {
  alaCarteQuantities[item.id] = 0;
});


// Computed property to check if at least one meat is selected
const isSelectionValid = computed(() => {
  return selectedMeats.value.length > 0;
});

const totalA = computed(() => {
  return Object.values(alaCarteQuantities).reduce((sum, count) => sum + count, 0);
});

const proceedToReview = () => {
  if (!isSelectionValid.value) {
    // ElMessage.error('Please select at least one starting meat item.');
    activeTab.value = 'meats'; // Switch back to the required tab
    return;
  }

  // Filter out a-la-carte items with zero quantity
  const finalAlaCarte = Object.keys(alaCarteQuantities)
    .filter(id => alaCarteQuantities[id] > 0)
    .map(id => ({
      id,
      quantity: alaCarteQuantities[id],
      name: alaCarteItems.find(item => item.id === id).name,
      price: alaCarteItems.find(item => item.id === id).price,
    }));
  
  const orderData = {
    initialMeats: selectedMeats.value,
    initialSides: selectedSides.value,
    alaCarte: finalAlaCarte,
  };

  emit('selectionsComplete', orderData);
};
</script>

<style scoped>
/* Custom styling for Element Plus tabs to match the dark theme */
:deep(.el-tabs--border-card) {
  background-color: #374151; /* gray-700 */
  border-color: #4b5563; /* gray-600 */
}
:deep(.el-tabs--border-card > .el-tabs__header) {
  background-color: #374151; /* gray-700 */
  border-bottom-color: #4b5563;
}
:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item) {
  color: #d1d5db; /* gray-300 */
  background-color: #374151;
  border-left-color: #4b5563;
}
:deep(.el-tabs--border-card > .el-tabs__header .el-tabs__item.is-active) {
  background-color: #1f2937; /* gray-800 */
  color: #f97316; /* orange-500 */
  border-bottom-color: #1f2937;
}

/* Custom styling for input number to fit the dark background */
:deep(.el-input-number) {
    --el-input-number-border-color: #4b5563;
}
:deep(.el-input-number .el-input__inner) {
    background-color: #4b5563;
    color: white;
}
</style>