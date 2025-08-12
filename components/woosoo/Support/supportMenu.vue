<template>
    <div class="min-h-[500px] w-full bg-white flex flex-col justify-evenly">
        <!-- Clean table -->
        <WoosooSupportCard
            title="Clean table"
            image="/images/staff-menu/clean.png"
            :is-active="activeCard === 'clean'"
            @handle-support="handleCleanTable"
        />
        <!-- Call support -->
        <WoosooSupportCard
            title="Call support"
            image="/images/staff-menu/headphones.png"
            :is-active="activeCard === 'support'"
            @handle-support="handleCallSupport"
        />
        <!-- Bills -->
        <WoosooSupportCard
            title="Bills"
            image="/images/staff-menu/receipt.png"
            :is-active="activeCard === 'bills'"
            @handle-support="handleBills"
        />
        <!-- Service Water -->
        <WoosooSupportCard
            title="Service Water"
            image="/images/staff-menu/glass-tea.png"
            :is-active="activeCard === 'water'"
            @handle-support="handleServiceWater"
        />
    </div>
</template>

<script setup>
import { ref } from 'vue'

const activeCard = ref(null)

const handleCleanTable = () => {
    console.log('Clean table clicked')
    activeCard.value = activeCard.value === 'clean' ? null : 'clean'
}

const handleCallSupport = () => {
    console.log('Call support clicked')
    activeCard.value = activeCard.value === 'support' ? null : 'support'
}

const handleBills = () => {
    console.log('Bills clicked')
    activeCard.value = activeCard.value === 'bills' ? null : 'bills'
}

const handleServiceWater = () => {
    console.log('Service water clicked')
    activeCard.value = activeCard.value === 'water' ? null : 'water'
}
</script>
