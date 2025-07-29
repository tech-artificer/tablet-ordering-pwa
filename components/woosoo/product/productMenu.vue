<template>
    <div class="space-y-6">
        <div v-for="(group, groupName) in groupedData" :key="groupName" class="group-section">
            <!-- Group Header -->
            <div class="group-header mb-4">
                <h2 class="text-2xl font-bold text-gray-800 border-b-2 border-orange-400 pb-2">
                    {{ groupName.charAt(0).toUpperCase() + groupName.slice(1) }}
                </h2>
            </div>

            <!-- Group Items -->
            <div class="grid grid-cols-3 gap-4">
                <WoosooProductCard
                    v-for="item in group"
                    :key="item.id"
                    :item="item"
                    @add-to-cart="addToCart"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
    data: {
        type: Array,
        default: () => []
    },
})

const emit = defineEmits(['add-to-cart'])

const groupedData = computed(() => {
    const groups = {}

    props.data.forEach(item => {
        const actualItem = item._custom ? item._custom.value : item
        const groupName = actualItem.group.toLowerCase() || 'Other'

        if (!groups[groupName]) {
            groups[groupName] = []
        }

        groups[groupName].push(actualItem)
    })

    return groups
})

const addToCart = (item) => {
    emit('add-to-cart', item)
}
</script>

<style scoped>
.group-section {
    margin-bottom: 2rem;
}

.group-header h2 {
    position: relative;
}

.group-header h2::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 60px;
    height: 3px;
    background: linear-gradient(90deg, #f97316, #fb923c);
    border-radius: 2px;
}
</style>
