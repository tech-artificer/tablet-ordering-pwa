<script setup lang="ts">
import type { Package } from '../../types';

const props = defineProps<{
  selectedPackage: Package | null;
  guestCount: number;
  showGuestCounter?: boolean;
  showAssistanceButton?: boolean;
}>();

const emit = defineEmits<{
  'update:guestCount': [count: number];
  'openAssistance': [];
}>();

const updateGuestCount = (count: number) => {
  emit('update:guestCount', count);
};

const openAssistance = () => {
  emit('openAssistance');
};
</script>

<template>
  <div class="p-6">
    <div class="max-w-7xl mx-auto">
      <WoosooLogo />
      <div v-if="selectedPackage" class="flex items-center justify-between">
        <!-- Package header content -->
      </div>
      <div v-else class="text-center">
        <h1 class="text-3xl font-bold text-on">Menu</h1>
      </div>
    </div>
  </div>
</template>
