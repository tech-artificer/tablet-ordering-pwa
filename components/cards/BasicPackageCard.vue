<script setup lang="ts">
import { ref } from 'vue'
import { Check } from '@element-plus/icons-vue'

defineProps<{
  package: any
  selected: boolean
}>()


// Data
const loading = ref(false)

const foodItems = [
  { name: 'Sisig', gradient: 'linear-gradient(135deg, #8B4513, #A0522D)' },
  { name: 'Rice', gradient: 'linear-gradient(135deg, #D2691E, #CD853F)' },
  { name: 'Veggies', gradient: 'linear-gradient(135deg, #228B22, #32CD32)' },
  { name: 'Soup', gradient: 'linear-gradient(135deg, #B22222, #DC143C)' }
]

const features = [
  '6 gourmet dishes included',
  'Serves 4-5 people',
  'Premium ingredients',
  'Elegant presentation',
  'Dessert included'
]

// Methods
const selectPackage = () => {
  loading.value = true
  
  setTimeout(() => {
    loading.value = false
    ElMessage({
      message: 'Royal Banquet package selected!',
      type: 'success',
    })
  }, 1500)
}

// Emits (if needed)
const emit = defineEmits(['package-selected'])
</script>

<template>
  <el-card class="package-card premium-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div class="header-content">
          <el-tag type="success" size="small" effect="light" class="package-badge">
            PREMIUM
          </el-tag>
          <!-- <span class="package-title">Royal Banquet</span> -->
          <!-- <div class="package-price">
            <span class="price-currency">₱</span>549.00
          </div> -->
        </div>
      </div>
    </template>

    <!-- Food Gallery -->
    <!-- <div class="food-gallery">
      <div 
        v-for="(item, index) in foodItems" 
        :key="index"
        class="food-item"
        :style="{ background: item.gradient }"
      >
        <span class="food-label">{{ item.name }}</span>
      </div>
    </div> -->

    <!-- Package Features -->
    <div class="package-features">
      <div 
        v-for="(feature, index) in features" 
        :key="index"
        class="feature-item"
      >
        <el-icon class="feature-icon" color="#10b981">
          <Check />
        </el-icon>
        <span>{{ feature }}</span>
      </div>
    </div>

    <template #footer>
      <div class="card-footer">
        <el-button 
          type="success"
          size="large"
          class="select-button"
          @click="selectPackage"
          :loading="loading"
          block
        >
          {{ loading ? 'Processing...' : 'Select Package' }}
        </el-button>
      </div>
    </template>
  </el-card>
</template>



<style scoped>
.package-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 16px;
}

.package-card:hover {
  transform: translateY(-4px);
}

.card-header {
  padding: 0;
}

.header-content {
  text-align: center;
}

.package-badge {
  font-weight: 700;
  letter-spacing: 0.5px;
  margin-bottom: 1rem;
  display: block;
}

.package-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--el-text-color-primary);
  display: block;
  margin: 1rem 0;
}

.package-price {
  font-size: 2.5rem;
  font-weight: 900;
  color: #67c23a;
  margin-top: 1rem;
}

.price-currency {
  font-size: 1.25rem;
  vertical-align: top;
  margin-right: 0.25rem;
}

.food-gallery {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.food-item {
  border-radius: 12px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 0.9rem;
  transition: transform 0.3s ease;
  cursor: pointer;
}

.food-item:hover {
  transform: scale(1.05);
}

.food-label {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.package-features {
  margin-bottom: 1rem;
}

.feature-item {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
  color: var(--el-text-color-regular);
}

.feature-icon {
  margin-right: 0.75rem;
  font-size: 1rem;
}

.card-footer {
  padding: 0;
}

.select-button {
  height: 48px;
  font-size: 1rem;
  font-weight: 700;
  border-radius: 12px;
}

.select-button:active {
  transform: scale(0.98);
}
</style>