<template>
  <div class="min-h-screen w-full bg-gradient-to-br from-orange-50 to-amber-100 overflow-hidden">
    <div class="h-screen w-full flex flex-col max-w-md mx-auto">
      <!-- Header -->
      <div class="bg-white/80 backdrop-blur-sm border-b border-orange-200 px-6 py-6 shrink-0">
        <div class="text-center">
          <h1 class="text-2xl font-bold text-gray-800 mb-2">Happy Feasting, Table 4!</h1>
          <p class="text-lg text-gray-600">Order Refills & More</p>
        </div>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <!-- Order More Meats Section -->
        <div class="bg-white rounded-2xl shadow-sm border border-orange-200 overflow-hidden">
          <div class="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4">
            <h2 class="text-xl font-bold text-white flex items-center gap-3">
              <el-icon class="text-white text-2xl"><ShoppingBag /></el-icon>
              Order More Meats
            </h2>
          </div>
          <div class="p-4">
            <p class="text-gray-600 text-center">Premium cuts available for additional orders</p>
          </div>
        </div>

        <!-- Quick Actions Grid -->
        <div class="grid grid-cols-2 gap-4">
          <!-- Refill Side Dishes -->
          <el-card class="action-card border-0 rounded-2xl" shadow="hover">
            <div class="text-center p-4">
              <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <el-icon class="text-green-600 text-2xl"><Dish /></el-icon>
              </div>
              <h3 class="font-semibold text-gray-800">Refill Side Dishes</h3>
            </div>
          </el-card>

          <!-- Order Drinks / Desserts -->
          <el-card class="action-card border-0 rounded-2xl" shadow="hover">
            <div class="text-center p-4">
              <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <el-icon class="text-blue-600 text-2xl"><CoffeeCup /></el-icon>
              </div>
              <h3 class="font-semibold text-gray-800">Order Drinks / Desserts</h3>
            </div>
          </el-card>
        </div>

        <!-- Quick Support Section -->
        <div class="bg-white rounded-2xl shadow-sm border border-orange-200 overflow-hidden">
          <div class="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <h2 class="text-xl font-bold text-white flex items-center gap-3">
              <el-icon class="text-white text-2xl"><Headset /></el-icon>
              Quick Support
            </h2>
          </div>
          
          <div class="divide-y divide-gray-100">
            <!-- Call Server -->
            <div class="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <el-icon class="text-green-600 text-xl"><Phone /></el-icon>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-800">Call Server</h3>
                  <p class="text-sm text-gray-500">Get immediate assistance</p>
                </div>
                <el-icon class="text-gray-400"><ArrowRight /></el-icon>
              </div>
            </div>

            <!-- Water Refill -->
            <div class="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <el-icon class="text-blue-600 text-xl"><Watermelon /></el-icon>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-800">Water Refill</h3>
                  <p class="text-sm text-gray-500">Request water service</p>
                </div>
                <el-icon class="text-gray-400"><ArrowRight /></el-icon>
              </div>
            </div>

            <!-- Change Grill -->
            <div class="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <el-icon class="text-orange-600 text-xl">Fire</el-icon>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-800">Change Grill</h3>
                  <p class="text-sm text-gray-500">Replace cooking surface</p>
                </div>
                <el-icon class="text-gray-400"><ArrowRight /></el-icon>
              </div>
            </div>

            <!-- Ask for GM -->
            <div class="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <el-icon class="text-red-600 text-xl"><User /></el-icon>
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold text-gray-800">Ask for GM</h3>
                  <p class="text-sm text-gray-500">Speak with manager</p>
                </div>
                <el-icon class="text-gray-400"><ArrowRight /></el-icon>
              </div>
            </div>
          </div>
        </div>

        <!-- View Past Orders -->
        <el-card class="border-0 rounded-2xl bg-gradient-to-r from-gray-800 to-gray-900" shadow="hover">
          <div class="text-center p-6">
            <div class="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <el-icon class="text-white text-2xl"><Document /></el-icon>
            </div>
            <h3 class="font-semibold text-white text-lg mb-2">View Past Orders</h3>
            <p class="text-gray-300 text-sm">Check your order history</p>
          </div>
        </el-card>
      </div>

      <!-- Bottom Navigation -->
      <div class="bg-white border-t border-orange-200 px-6 py-4 shrink-0">
        <div class="flex justify-between items-center">
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
  </div>
</template>

<script setup>
import { 
  ShoppingBag, 
  Dish, 
  CoffeeCup, 
  Headset, 
  Phone, 
  Watermelon, 
//   Fire, 
  User, 
  Document,
  House,
  ShoppingCart,
  ArrowRight
} from '@element-plus/icons-vue'

// Handle button clicks
import { logger } from '../../utils/logger'

const handleAction = (action) => {
  logger.debug(`Action: ${action}`)
  // Implement action logic here
}
</script>

<style scoped>
.action-card {
  transition: all 0.3s ease;
}

.action-card:hover {
  transform: translateY(-2px);
}

/* Custom scrollbar */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

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
</style>