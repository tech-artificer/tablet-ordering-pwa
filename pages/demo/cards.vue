<template>
    <div class="min-h-screen bg-background text-text p-8">
        <div class="flex justify-between items-center mb-8">
            <div>
                <h1 class="text-3xl font-bold mb-4">
                    Component Demo
                </h1>
            </div>
            <div>
                <CommonLink name="Back" to="/" class="bg-surface border border-border px-4 py-2 rounded"/>
            </div>
        </div>
        <div class="grid grid-rows-1 md:grid-cols-2 gap-2 justify-between">
            <DemoCard/>
        </div>
    </div>
</template>
