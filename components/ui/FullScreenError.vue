<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  actionText: {
    type: String,
    default: 'Call for Staff Assistance',
  },
  details: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(['action']);

const handleAction = () => {
  // In a real app, this would trigger an alert/notification to staff
  alert('Staff has been notified of the system error!'); 
  emit('action');
};
</script>

<template>
  <div class="fixed inset-0 bg-gray-950/95 z-50 flex flex-col items-center justify-center p-8 text-center text-white">
    <i class="i-ep-warning text-red-500 text-8xl mb-6 animate-pulse"></i>
    
    <h1 class="text-4xl font-bold mb-4">{{ title }}</h1>
    
    <p class="text-xl max-w-xl mb-8 text-gray-300">{{ message }}</p>
    
    <div v-if="details" class="bg-gray-800 p-4 rounded-lg max-w-md w-full mb-6">
      <p class="text-sm text-gray-400 font-mono">{{ details }}</p>
    </div>

    <el-button 
      v-if="actionText"
      type="danger" 
      size="large" 
      @click="handleAction"
      class="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg"
    >
      {{ actionText }}
    </el-button>
  </div>
</template>