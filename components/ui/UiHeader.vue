<script setup lang="ts">
import { computed, unref } from "vue"
import { ShoppingBasket } from "lucide-vue-next"
import { useOrderStore } from "../../stores/Order"
const orderStore = useOrderStore()
const cartCount = computed(() => (unref(orderStore.draft) as any[]).reduce((sum: number, item: any) => sum + (item.quantity || 1), 0))
const emit = defineEmits(["open-cart"])
const openCart = () => emit("open-cart")
</script>

<template>
    <div class="flex items-center justify-between p-4 bg-secondary">
        <div class="flex items-center gap-4">
            <WoosooLogo />
            <div class="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-white flex items-center justify-center text-black font-bold">
                K
            </div>
            <div>
                <div class="text-sm text-gray-100">
                    Table
                </div>
                <div class="text-lg font-bold">
                    4
                </div>
            </div>
        </div>
        <div class="flex items-center gap-4">
            <el-badge :value="cartCount" class="cursor-pointer">
                <el-button circle class="bg-panel ui-hover-lift" @click="openCart">
                    <ShoppingBasket />
                </el-button>
            </el-badge>
        </div>
    </div>
</template>
