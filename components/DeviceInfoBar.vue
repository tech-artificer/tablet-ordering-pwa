<script setup lang="ts">
import { useSessionStore } from '~/stores/Session'
import { useDeviceStore } from '~/stores/Device'
const { sessionId } = useSessionStore()
const { table } = useDeviceStore();

</script>

<template>
    <header class="fixed bottom-0 left-0 w-full z-50 bg-white/20 backdrop-blur-sm text-sm text-white px-4 py-1 flex items-center gap-4 shadow">
      <span class="font-semibold">Table:</span> {{ table.name }}
      <span class="font-semibold">Session:</span> {{ sessionId }}
      <span class="font-semibold ml-auto">Version:</span> Beta v1.0
    </header>
</template>