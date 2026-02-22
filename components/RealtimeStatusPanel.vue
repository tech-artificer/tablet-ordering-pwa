<template>
  <div v-if="isOpen" class="fixed bottom-4 right-4 z-50 w-80 rounded-lg shadow-2xl bg-gray-900 text-white border border-gray-700">
    <!-- Header -->
    <div class="flex items-center justify-between bg-gray-800 px-4 py-3 rounded-t-lg">
      <h3 class="font-bold text-white flex items-center gap-2">
        <span>📊 Realtime Status</span>
        <span class="text-xs">{{ status.summary.isFullyOperational ? '🟢' : '🔴' }}</span>
      </h3>
      <button
        @click="isOpen = false"
        class="text-gray-500 hover:text-white text-xs font-bold"
      >
        ✕
      </button>
    </div>

    <!-- Connection Status -->
    <div class="px-4 py-2 border-b border-gray-700">
      <div class="text-sm font-semibold text-blue-300 mb-2">Connection</div>
      <div class="text-xs space-y-1">
        <div class="flex justify-between">
          <span>Echo:</span>
          <span :class="status.connection.echo ? 'text-green-400' : 'text-red-400'">
            {{ status.connection.echo ? '🟢 Connected' : '🔴 Disconnected' }}
          </span>
        </div>
        <div class="flex justify-between">
          <span>WebSocket:</span>
          <span class="text-gray-400">{{ status.connection.state }}</span>
        </div>
      </div>
    </div>

    <!-- Subscriptions -->
    <div class="px-4 py-2 border-b border-gray-700">
      <div class="text-sm font-semibold text-blue-300 mb-2">Subscriptions</div>
      <div class="text-xs space-y-1">
        <div class="flex justify-between">
          <span>Device Channel:</span>
          <span :class="status.subscriptions.device ? 'text-green-400' : 'text-gray-500'">
            {{ status.subscriptions.device ? '✅' : '⭕' }}
          </span>
        </div>
        <div class="flex justify-between">
          <span>Orders Channel:</span>
          <span :class="status.subscriptions.orders ? 'text-green-400' : 'text-gray-500'">
            {{ status.subscriptions.orders ? '✅' : '⭕' }}
          </span>
        </div>
        <div class="flex justify-between">
          <span>Control Channel:</span>
          <span :class="status.subscriptions.deviceControl ? 'text-green-400' : 'text-gray-500'">
            {{ status.subscriptions.deviceControl ? '✅' : '⭕' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Device/Table Status -->
    <div class="px-4 py-2 border-b border-gray-700">
      <div class="text-sm font-semibold text-yellow-300 mb-2">Device</div>
      <div class="text-xs space-y-1">
        <div class="flex justify-between">
          <span>Device ID:</span>
          <span class="font-mono text-gray-400">{{ status.device.id || 'N/A' }}</span>
        </div>
        <div class="flex justify-between">
          <span>Table:</span>
          <span class="font-mono text-gray-400">{{ status.table.name || 'N/A' }}</span>
        </div>
        <div class="flex justify-between">
          <span>Active:</span>
          <span :class="status.device.isActive ? 'text-green-400' : 'text-red-400'">
            {{ status.device.isActive ? '✅' : '❌' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Order Status -->
    <div class="px-4 py-2 border-b border-gray-700">
      <div class="text-sm font-semibold text-purple-300 mb-2">Order</div>
      <div class="text-xs space-y-1">
        <div class="flex justify-between">
          <span>Has Order:</span>
          <span :class="status.order.hasOrder ? 'text-green-400' : 'text-gray-500'">
            {{ status.order.hasOrder ? '✅' : '⭕' }}
          </span>
        </div>
        <div v-if="status.order.hasOrder" class="flex justify-between">
          <span>Order #:</span>
          <span class="font-mono text-gray-400">{{ status.order.orderNumber }}</span>
        </div>
        <div v-if="status.order.hasOrder" class="flex justify-between">
          <span>Status:</span>
          <span class="font-mono text-gray-400">{{ status.order.status }}</span>
        </div>
        <div class="flex justify-between">
          <span>Polling:</span>
          <span :class="status.order.isPolling ? 'text-green-400' : 'text-gray-500'">
            {{ status.order.isPolling ? '✅' : '⭕' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Last Events -->
    <div class="px-4 py-2 border-b border-gray-700">
      <div class="text-sm font-semibold text-green-300 mb-2">Activity</div>
      <div class="text-xs space-y-1">
        <div class="flex justify-between">
          <span>Last Event:</span>
          <span class="font-mono text-gray-400">
            {{ status.lastEvent?.type ? `${status.lastEvent.type}` : 'none' }}
          </span>
        </div>
        <div v-if="status.lastPolling" class="flex justify-between">
          <span>Last Poll:</span>
          <span class="font-mono text-gray-400">
            {{ status.lastPolling?.status }} ({{ status.lastPolling?.latencyMs }}ms)
          </span>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="px-4 py-2 bg-gray-800 rounded-b-lg flex gap-2">
      <button
        @click="realtimeStatus.logStatusDashboard()"
        class="flex-1 text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
      >
        Log to Console
      </button>
      <button
        @click="refreshStatus()"
        class="flex-1 text-xs bg-gray-600 hover:bg-gray-700 px-2 py-1 rounded"
      >
        Refresh
      </button>
    </div>
  </div>

  <!-- Toggle Button -->
  <button
    v-if="!isOpen"
    @click="isOpen = true"
    class="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-gray-900 border border-gray-700 text-white flex items-center justify-center hover:bg-gray-800 hover:border-gray-600 text-lg"
    title="Toggle Realtime Status Dashboard"
  >
    📊
  </button>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRealtimeStatus } from '../composables/useRealtimeStatus'

const realtimeStatus = useRealtimeStatus()
const isOpen = ref(false)
const status = reactive(realtimeStatus.getStatusDashboard())

const refreshStatus = () => {
  const updated = realtimeStatus.getStatusDashboard()
  Object.assign(status, updated)
}

// Auto-refresh every 2 seconds
setInterval(() => {
  refreshStatus()
}, 2000)

// Initialize monitoring on component mount
onMounted(() => {
  realtimeStatus.initializeMonitoring()
})
</script>

<style scoped>
/* Smooth animations */
button {
  transition: all 0.2s ease-in-out;
}

button:active {
  transform: scale(0.95);
}
</style>
