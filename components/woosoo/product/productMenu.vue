<template>
    <div class="space-y-6">
        <div v-if="isLoading" class="loading-container">
            <div class="flex flex-col items-center justify-center py-12">
                <div class="loading-spinner mb-4">
                    <div class="animate-spin rounded-full h-12 w-12 border-4 border-orange-200 border-t-orange-500" />
                </div>
                <p class="text-gray-600 text-lg">Loading products...</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
                <div v-for="n in skeletonCount" :key="`skeleton-${n}`" class="skeleton-card">
                    <div class="bg-gray-200 rounded-lg p-4 animate-pulse">
                        <div class="h-48 bg-gray-300 rounded mb-4" />
                        <div class="h-4 bg-gray-300 rounded mb-2" />
                        <div class="h-4 bg-gray-300 rounded w-2/3 mb-2" />
                        <div class="h-6 bg-gray-300 rounded w-1/3" />
                    </div>
                </div>
            </div>
        </div>

        <div v-else-if="hasProducts">
            <div v-for="[groupName, items] in groupEntries" :key="groupName" class="group-section">
                <div class="group-header mb-4">
                    <h2 class="text-2xl font-bold text-gray-800 border-b-2 border-orange-400 pb-2">
                        {{ formatGroupName(groupName) }}
                    </h2>
                    <span class="text-sm text-gray-500 ml-2">({{ items.length }} items)</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <WoosooProductCard
                        v-for="item in items"
                        :key="`${groupName}-${item.id}`"
                        :item="item"
                        @add-to-cart="addToCart"
                    />
                </div>
            </div>
        </div>

        <div v-else class="empty-state">
            <div class="flex flex-col items-center justify-center py-12">
                <div class="text-gray-400 mb-4">
                    <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2 2v-5m16 0h-2a2 2 0 00-2 2v3a2 2 0 01-2 2H8a2 2 0 01-2-2v-3a2 2 0 00-2-2H4" />
                    </svg>
                </div>
                <p class="text-gray-600 text-lg">No products available</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, shallowRef, nextTick } from 'vue'

const props = defineProps({
    data: {
        type: Array,
        default: () => []
    },
    loading: {
        type: Boolean,
        default: false
    },
    skeletonCount: {
        type: Number,
        default: 6
    }
})

const emit = defineEmits(['add-to-cart'])

const groupedData = shallowRef(new Map())
const isLoading = ref(false)

const hasProducts = computed(() => groupedData.value.size > 0)

const groupEntries = computed(() => {
    return Array.from(groupedData.value.entries())
        .sort(([a], [b]) => a.localeCompare(b))
})

const processData = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
        return new Map()
    }

    const groups = new Map()

    const batchSize = 100
    const processBatch = (startIndex = 0) => {
        const endIndex = Math.min(startIndex + batchSize, data.length)

        for (let i = startIndex; i < endIndex; i++) {
            const item = data[i]
            const actualItem = item?._custom?.value || item

            if (!actualItem || !actualItem.id) continue

            const groupName = actualItem.group?.toLowerCase()?.trim() || 'other'

            if (!groups.has(groupName)) {
                groups.set(groupName, [])
            }

            groups.get(groupName).push(actualItem)
        }

        if (endIndex < data.length) {
            if (window.requestIdleCallback) {
                window.requestIdleCallback(() => processBatch(endIndex))
            } else {
                setTimeout(() => processBatch(endIndex), 0)
            }
        } else {
            groupedData.value = groups
            isLoading.value = false
        }
    }

    processBatch()
    return groups
}

watch(
    () => props.data,
    (newData) => {
        isLoading.value = true

        nextTick(() => {
            if (!newData || newData.length === 0) {
                groupedData.value = new Map()
                isLoading.value = false
                return
            }

            processData(newData)
        })
    },
    { immediate: true, deep: false }
)

watch(
    () => props.loading,
    (loading) => {
        if (loading) {
            isLoading.value = true
        }
    },
    { immediate: true }
)

const formatGroupName = (groupName) => {
    return groupName.charAt(0).toUpperCase() + groupName.slice(1).replace(/[-_]/g, ' ')
}
const addToCart = (item) => {
    emit('add-to-cart', item)
}
defineExpose({
    refreshData: () => {
        if (props.data && props.data.length > 0) {
            processData(props.data)
        }
    },
    clearData: () => {
        groupedData.value = new Map()
    }
})
</script>

<style scoped>
.group-section {
    margin-bottom: 2rem;
}

.group-header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
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

.loading-container {
    min-height: 400px;
}

.skeleton-card {
    opacity: 0.7;
}

.empty-state {
    min-height: 300px;
}

.grid {
    display: grid;
    gap: 1rem;
}

@media (min-width: 768px) {
    .grid {
        gap: 1.5rem;
    }
}

@keyframes pulse {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
}

.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.group-section {
    contain: layout style;
}

.skeleton-card {
    will-change: opacity;
}

.loading-spinner {
    transition: opacity 0.3s ease-in-out;
}
</style>
