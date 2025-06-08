<template>
    <div class="w-full bg-white">
        <!-- Clean table -->
        <WoosooSupportCard
            title="Clean table"
            image="/images/staff-menu/clean.png"
            @handle-support="handleCleanTable"
        />
        <!-- Call support -->
        <WoosooSupportCard
            title="Call support"
            image="/images/staff-menu/headphones.png"
            @handle-support="handleCallSupport"
        />
        <!-- Bills -->
        <WoosooSupportCard
            title="Bills"
            image="/images/staff-menu/receipt.png"
            @handle-support="handleBills"
        />
        <!-- Service Water -->
        <WoosooSupportCard
            title="Service Water"
            image="/images/staff-menu/glass-tea.png"
            @handle-support="handleServiceWater"
        />
    </div>
</template>

<script setup>

const handleCleanTable = () => {
    console.log('Clean table clicked')
}

const handleCallSupport = () => {
    console.log('Call support clicked')
}

const handleBills = () => {
    console.log('Bills clicked')
}

const handleServiceWater = () => {
    console.log('Service water clicked')
}
</script>
