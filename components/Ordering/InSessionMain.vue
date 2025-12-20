<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const openMeatRefill = () => {
  // Logic to open a modal or navigate to a meat selection screen
  // ElMessage.info('Opening meat refill menu...');
};

const openSideRefill = () => {
  // Logic to open a modal for side selection
  // ElMessage.info('Opening side dish refill menu...');
};

const openAlaCarte = () => {
  // Logic to navigate to the drinks/desserts menu
  router.push('/menu/ala-carte');
};

const callStaff = (requestType: any) => {
  // Send request to the kitchen/staff system
  // ElMessage.success({
  //   message: `${requestType} request sent! Staff will be with you shortly.`,
  //   duration: 3000,
  // });
};

const showOrderHistory = () => {
  // ElMessage.info('Viewing order history...');
};
</script>

<template>
  <div class="p-4 md:p-8 bg-gray-900 min-h-screen text-white">
    <header class="flex justify-between items-center mb-10 border-b border-gray-700 pb-4">
      <div class="flex items-center">
        <WoosooLogo />
        <el-avatar :size="50" class="mr-3 bg-red-600">T4</el-avatar>
        <div>
          <h2 class="text-xl font-semibold">Happy Feasting, Table 4!</h2>
          <p class="text-sm text-gray-400">Premium Package (4 Guests)</p>
        </div>
      </div>
      <el-button @click="showOrderHistory" type="info" plain class="hidden md:block">
        View Past Orders
      </el-button>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <section class="lg:col-span-2 bg-gray-800 p-6 rounded-xl shadow-lg">
        <h3 class="text-2xl font-bold mb-6 text-orange-400">Order Refills & More</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            @click="openMeatRefill" 
            class="flex flex-col items-center justify-center p-6 bg-orange-600 hover:bg-orange-700 rounded-lg transition duration-200 h-32"
          >
            <i class="i-ep-hot-water text-4xl mb-1"></i> 
            <span class="text-xl font-semibold">Order More Meats</span>
          </button>

          <button 
            @click="openSideRefill" 
            class="flex flex-col items-center justify-center p-6 bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-200 h-32"
          >
            <i class="i-ep-dish text-4xl mb-1"></i>
            <span class="text-xl font-semibold">Refill Side Dishes</span>
          </button>
          
          <button 
            @click="openAlaCarte" 
            class="flex flex-col items-center justify-center p-6 bg-gray-700 hover:bg-gray-600 rounded-lg transition duration-200 md:col-span-2 h-20"
          >
            <span class="text-lg font-medium">Order Drinks / Desserts (A-la-Carte)</span>
          </button>
        </div>
      </section>

      <section class="lg:col-span-1 bg-gray-800 p-6 rounded-xl shadow-lg">
        <h3 class="text-2xl font-bold mb-6 text-red-400">Quick Support</h3>
        
        <div class="grid grid-cols-2 gap-4">
          <button @click="callStaff('Server')" class="bg-red-800 hover:bg-red-700 p-4 rounded-lg flex flex-col items-center h-32 justify-center ui-hover-lift">
            <i class="i-ep-bell text-3xl mb-1"></i>
            <span class="text-lg font-medium">Call Server</span>
          </button>
          
          <button @click="callStaff('Change Grill')" class="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg flex flex-col items-center h-32 justify-center ui-hover-lift">
            <i class="i-ep-clean text-3xl mb-1"></i>
            <span class="text-lg font-medium">Change Grill</span>
          </button>
          
          <button @click="callStaff('Water Refill')" class="bg-gray-700 hover:bg-gray-600 p-4 rounded-lg flex flex-col items-center h-32 justify-center ui-hover-lift">
            <i class="i-ep-water-cup text-3xl mb-1"></i>
            <span class="text-lg font-medium">Water Refill</span>
          </button>
          
          <button @click="callStaff('Bill Request')" class="bg-yellow-800 hover:bg-yellow-700 p-4 rounded-lg flex flex-col items-center h-32 justify-center ui-hover-lift">
            <i class="i-ep-money text-3xl mb-1"></i>
            <span class="text-lg font-medium">Ask for Bill</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>