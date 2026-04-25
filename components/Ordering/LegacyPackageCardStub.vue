<template>

  <div class="flex flex-row justify-center gap-4">
      <!-- Standard Package Card -->
      <el-card class="package-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h3 class="package-title">Standard Package</h3>
          </div>
        </template>
        
        <div class="package-content">
          <div class="menu-item">
            <el-icon class="item-icon"><Check /></el-icon>
            <span>Pork Belly, Marinaded</span>
          </div>
          <div class="menu-item">
            <el-icon class="item-icon"><Check /></el-icon>
            <span>Chicken, Chicken</span>
          </div>
        </div>
        
        <!-- <template #footer>
          <div class="card-footer">
            <el-button type="primary" class="w-full book-button ui-hover-lift">
              Book Now
            </el-button>
          </div>
        </template> -->
      </el-card>

      <!-- Premium Package Card -->
      <el-card class="package-card premium-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h3 class="package-title premium-title">Premium Package</h3>
          </div>
        </template>
        
        <div class="package-content">
          <div class="menu-item">
            <el-icon class="item-icon premium-icon"><Check /></el-icon>
            <span>Prime Beef Cuts, Pork</span>
          </div>
          <div class="menu-item">
            <el-icon class="item-icon premium-icon"><Check /></el-icon>
            <span>Wagyu Cubes, Seafood</span>
          </div>
        </div>
        
     
          <div class="card-footer">
           <button
             class="w-full mb-4 py-2 px-6 bg-primary rounded-md hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl hover:text-white ui-hover-lift"
             >
                <span class="font-raleway text-primaryLight font-bold flex flex-row gap-3 justify-center items-center">
                 Noble Selection
                </span>
            </button>
          </div>
  
      </el-card>

            <!-- Premium Package Card -->
      <el-card class="package-card premium-card" shadow="hover">
        <template #header>
          <div class="card-header">
            <h3 class="package-title premium-title">Premium Package</h3>
          </div>
        </template>
        
        <div class="package-content">
          <div class="menu-item">
            <el-icon class="item-icon premium-icon"><Check /></el-icon>
            <span>Prime Beef Cuts, Pork</span>
          </div>
          <div class="menu-item">
            <el-icon class="item-icon premium-icon"><Check /></el-icon>
            <span>Wagyu Cubes, Seafood</span>
          </div>
        </div>
        
        <!-- <template #footer>
          <div class="card-footer">
            <el-button type="warning" class="w-full book-button premium-button ui-hover-lift">
              Book Now
            </el-button>
          </div>
        </template> -->
      </el-card>
      </div>

          <button
            class="w-full mb-4 py-2 px-6 bg-primary rounded-md hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl hover:text-white ui-hover-lift"
            >
          <span class="font-raleway text-primaryLight font-bold flex flex-row gap-3 justify-center items-center">
            Select Package
          </span>
      </button>



</template>

<script setup>
import { Check } from '@element-plus/icons-vue'
</script>

<style scoped>
.package-card {
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
  color: #ffffff;
  background: transparent;
  color: #ffffff;
  border: 2px solid #f59e0b;
}

.package-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.card-header {
  text-align: center;
  padding: 16px 0;
}

.package-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #ffffff;
  margin: 0;
}

.premium-title {
  color: #d97706;
  background: linear-gradient(135deg, #F6B56D 0%, #fef3ec 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.package-content {
  padding: 8px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.menu-item:last-child {
  border-bottom: none;
}

.item-icon {
  color: #10b981;
  margin-right: 12px;
  font-size: 1.2rem;
}

.premium-icon {
  color: #f59e0b;
}

.card-footer {
  padding: 16px 0 0 0;
}

.book-button {
  height: 48px;
  font-weight: 600;
  font-size: 1.1rem;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.book-button:hover {
  transform: translateY(-2px);
}

.premium-button {
  background: linear-gradient(135deg, #F6B56D 0%, #f8c689 100%);
  border: none;
}

.premium-button:hover {
  background: linear-gradient(135deg, #d97706 0%, #f8c689 100%);
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.4);
}
</style>