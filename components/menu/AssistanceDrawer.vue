<script setup lang="ts">
import type { Component } from 'vue';
import { ElDrawer, ElButton } from 'element-plus';

interface SupportRequest {
  id: string;
  label: string;
  icon: Component;
  type: string;
}

const props = defineProps<{
  modelValue: boolean;
  supportRequests: SupportRequest[];
  isSending: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [visible: boolean];
  'sendRequest': [requestType: string];
}>();

const updateVisible = (visible: boolean) => {
  emit('update:modelValue', visible);
};

const sendRequest = (requestLabel: string) => {
  emit('sendRequest', requestLabel);
};
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    @update:model-value="updateVisible"
    title="Need Assistance"
    size="30%"
    direction="rtl"
    :with-header="true">
    <div class="p-4 space-y-4">
      <div v-for="request in supportRequests" :key="request.id">
        <el-button 
          :type="request.type as any" 
          class="w-full mb-2 ui-hover-lift" 
          @click="sendRequest(request.label)" 
          :loading="isSending" 
          :disabled="isSending">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <component :is="request.icon" :size="24" :stroke-width="2" />
              <span>{{ request.label }}</span>
            </div>
            <span class="text-sm text-white/70">Tap to notify</span>
          </div>
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>
