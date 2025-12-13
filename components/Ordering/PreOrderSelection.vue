<template>
  <div class="min-h-screen bg-gray-50 overflow-hidden"> <!-- Main container with overflow hidden -->
    <div class="h-screen flex flex-col"> <!-- Full height flex container -->
      <!-- Header - Fixed -->
      <div class="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <h1 class="text-2xl font-bold text-gray-800">Review & Confirm Order</h1>
      </div>

      <!-- Scrollable Content Area -->
      <div class="flex-1 overflow-y-auto"> <!-- This makes the content scrollable -->
        <div class="max-w-2xl mx-auto bg-white">
          <!-- Feast Details Section -->
          <div class="px-6 py-6 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-700 mb-4">Your Feast Details</h2>
            
            <!-- Package Info -->
            <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <div class="flex justify-between items-start">
                <div>
                  <h3 class="font-bold text-gray-800 text-lg">Premium Package (4 Guests)</h3>
                </div>
                <el-tag type="warning" effect="plain" class="font-semibold">
                  4 Pax
                </el-tag>
              </div>
            </div>

            <!-- Initial Items -->
            <div class="space-y-4">
              <!-- Initial Meats -->
              <div>
                <h4 class="font-medium text-gray-600 text-sm mb-2">Initial Meats</h4>
                <div class="space-y-1 ml-4">
                  <div class="flex justify-between text-gray-700">
                    <span>Woo Sanggup (Beef Belly)</span>
                  </div>
                  <div class="flex justify-between text-gray-700">
                    <span>Kimchi</span>
                  </div>
                </div>
              </div>

              <!-- Initial Sides -->
              <div>
                <h4 class="font-medium text-gray-600 text-sm mb-2">Initial Sides</h4>
                <div class="space-y-1 ml-4">
                  <div class="flex justify-between text-gray-700">
                    <span>Lettuce Lettuce</span>
                  </div>
                </div>
              </div>

              <!-- Additional Sides -->
              <div>
                <h4 class="font-medium text-gray-600 text-sm mb-2">Initial Sides</h4>
                <div class="space-y-1 ml-4">
                  <!-- Empty sides would go here -->
                </div>
              </div>
            </div>
          </div>
          <!-- Total Section -->
        
        </div>
      </div>

      <!-- Action Button - Fixed at bottom -->
      <div class="bg-white border-t border-gray-200 px-6 py-4 shrink-0">
        <el-button 
          type="warning" 
          size="large" 
          class="w-full h-12 text-lg font-semibold bg-gradient-to-r from-amber-500 to-amber-600 border-none text-white hover:from-amber-600 hover:to-amber-700 transition-all duration-300"
          @click="confirmOrder"
        >
          Confirm & Send to Kitchen
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { logger } from '../../utils/logger'

const confirmOrder = () => {
  // Handle order confirmation logic
  logger.info('Order confirmed and sent to kitchen')
}
</script>

<style scoped>
/* Custom scrollbar styling */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #f1f5f9;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: #94a3b8;
}

/* Element Plus custom styles */
:deep(.el-tag) {
  border-color: #f59e0b;
  color: #d97706;
}

:deep(.el-button--warning) {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  border: none;
}

:deep(.el-button--warning:hover) {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}
</style>