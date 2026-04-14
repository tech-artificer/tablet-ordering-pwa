<script setup lang="ts">
import { Check } from '@element-plus/icons-vue';
import { ElIcon } from 'element-plus';

type Step = {
  id: string;
  label: string;
  path: string;
};

const steps: Step[] = [
  { id: 'start', label: 'Start', path: '/order/start' },
  { id: 'package', label: 'Package', path: '/order/packageSelection' },
  { id: 'menu', label: 'Menu', path: '/menu' },
  { id: 'review', label: 'Review', path: '/order/review' },
];

const route = useRoute();

const currentStepIndex = computed(() => {
  const currentPath = route.path;
  const index = steps.findIndex(step => currentPath.startsWith(step.path));
  return index >= 0 ? index : 0;
});

const getStepStatus = (index: number) => {
  if (index < currentStepIndex.value) return 'completed';
  if (index === currentStepIndex.value) return 'active';
  return 'upcoming';
};
</script>

<template>
  <div class="session-tracker">
    <div class="flex items-center justify-center gap-2">
      <div 
        v-for="(step, index) in steps" 
        :key="step.id"
        class="flex items-center">
        
        <!-- Step Circle -->
        <div 
          :class="[
            'step-circle',
            {
              'completed': getStepStatus(index) === 'completed',
              'active': getStepStatus(index) === 'active',
              'upcoming': getStepStatus(index) === 'upcoming'
            }
          ]">
          <el-icon v-if="getStepStatus(index) === 'completed'" class="text-white">
            <Check />
          </el-icon>
          <span v-else class="step-number">{{ index + 1 }}</span>
        </div>

        <!-- Step Label -->
        <span 
          :class="[
            'step-label',
            {
              'text-white font-semibold': getStepStatus(index) === 'active',
              'text-white/70': getStepStatus(index) === 'completed',
              'text-white/40': getStepStatus(index) === 'upcoming'
            }
          ]">
          {{ step.label }}
        </span>

        <!-- Connector Line -->
        <div 
          v-if="index < steps.length - 1"
          :class="[
            'connector',
            {
              'completed': getStepStatus(index) === 'completed',
              'upcoming': getStepStatus(index) !== 'completed'
            }
          ]" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.session-tracker {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 12px;
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.step-circle.completed {
  background: #10b981;
  border: 2px solid #10b981;
  color: white;
}

.step-circle.active {
  background: #3b82f6;
  border: 2px solid #3b82f6;
  color: white;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
}

.step-circle.upcoming {
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: rgba(255, 255, 255, 0.5);
}

.step-number {
  font-size: 14px;
}

.step-label {
  margin: 0 8px;
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.connector {
  width: 40px;
  height: 2px;
  transition: all 0.3s ease;
}

.connector.completed {
  background: #10b981;
}

.connector.upcoming {
  background: rgba(255, 255, 255, 0.2);
}

@media (max-width: 768px) {
  .step-label {
    display: none;
  }
  
  .connector {
    width: 20px;
  }
}
</style>
