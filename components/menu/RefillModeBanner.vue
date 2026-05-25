<script setup lang="ts">
import { RefreshCw } from "lucide-vue-next"
</script>

<template>
    <div class="bg-success/20 border-b border-success/30 px-6 py-3">
        <div class="flex items-center gap-3">
            <RefreshCw :size="24" :stroke-width="2" class="text-success" />
            <div>
                <p class="font-bold text-success">
                    Refill Mode Active
                </p>
                <p class="text-sm text-success/80">
                    Only unlimited items available (Meats &amp; Sides)
                </p>
            </div>
        </div>
    </div>
</template>
