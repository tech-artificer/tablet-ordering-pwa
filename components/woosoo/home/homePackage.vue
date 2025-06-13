<template>
    <div class="text-white relative overflow-hidden">
        <div class="relative z-10 p-4">
            <!-- Package Cards -->
            <div class="flex flex-col md:flex-row gap-4 max-w-7xl mx-auto mb-12 justify-center">
                <WoosooPackageCard
                    :package-list="packageList"
                    @change-include-items-modal-status="changeIncludeItemsModalStatus"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
const packageStore = usePackageStore()
const { packageList } = storeToRefs(packageStore)
packageStore.exampleData()

const emit = defineEmits(['changeIncludeItemsModalStatus'])
const changeIncludeItemsModalStatus = () => {
    emit('changeIncludeItemsModalStatus')
}
</script>

<style scoped>
@keyframes fade-in {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in {
    animation: fade-in 0.5s ease-out;
}
</style>
