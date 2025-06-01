<template>
    <div>
        <el-collapse v-model="activeIndex" accordion>
            <template v-for="item, index in items" :key="index">
                <el-collapse-item :title="'Order # ' + item.id" :name="'#'+index">
                    <template #icon>
                        <span
                            :class="{
                                'text-green-500': item.status === OrderStatus.COMPLETE,
                                'text-yellow-500': item.status === OrderStatus.IN_PROGRESS,
                                'text-gray-500': item.status === OrderStatus.ORDERING,
                                'text-red-500': item.status === OrderStatus.CANCELLED
                            }"
                        >
                            {{ item.status }}
                        </span>
                    </template>
                    <woosooOrderDetails :data="item.details" />
                    <div class="flex flex-col space-y-2 border-t border-b border-gray-200 p-2">
                        <div class="flex justify-between">
                            <p class="text-sm text-gray-600">Subtotal</p>
                            <p class="text-sm text-gray-900">₱{{ item.subTotal }}</p>
                        </div>
                        <div class="flex justify-between">
                            <p class="text-sm text-gray-600">Tax</p>
                            <p class="text-sm text-gray-900">₱{{ item.tax }}</p>
                        </div>
                        <div class="flex justify-between">
                            <p class="text-sm text-gray-600">Total</p>
                            <p class="text-sm text-gray-900">₱{{ item.total }}</p>
                        </div>
                        <div class="flex justify-between">
                            <p class="text-sm text-gray-600">Date</p>
                            <p class="text-sm text-gray-900">{{ item.date }}</p>
                        </div>
                    </div>
                </el-collapse-item>
            </template>
        </el-collapse>
    </div>
</template>
<script setup>
defineProps({
    items: {
        type: Array,
        default: () => []
    }
})
const activeIndex = ref('#0')
</script>
