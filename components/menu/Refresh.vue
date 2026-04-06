<script setup lang="ts">
import { useMenuStore } from '../../stores/Menu';
import PrimaryButton from '../common/PrimaryButton.vue';

const menuStore = useMenuStore();
const emit = defineEmits(['refreshed', 'error']);

const handleRefresh = async () => {
  try {
    const result = await menuStore.refreshMenus();
    if (result.success) {
      emit('refreshed');
    }
  } catch (error) {
    emit('error', error);
  }
};
</script>

<template>
  <PrimaryButton
    type="light"
    :disabled="menuStore.isLoading ? true : false"
    :full-width="false"
    @click="handleRefresh"
  >
    <svg 
      class="w-5 h-5" 
      :class="{ 'animate-spin': menuStore.isLoading }"
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg>
    <span>{{ menuStore.isLoading ? 'Refreshing...' : 'Refresh Menu' }}</span>
  </PrimaryButton>
</template>