<template>
    <div class="min-h-screen bg-background text-text p-8">
        <div class="flex justify-between items-center mb-8">
            <div>
                <h1 class="text-3xl font-bold mb-4">
                    Woosoo Components
                </h1>
            </div>
            <div>
                <CommonLink name="Back" to="/" class="bg-surface border border-border px-4 py-2 rounded"/>
            </div>
        </div>
        <div class="w-full">
            <CommonContainer title="Woosoo Components" description="">
                <template #main>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <WoosooButton name="WoosooButton" />
                        <div>
                            <h1 class="font-kanit">Inter heading</h1>
                            <h2 class="font-raleway">Kanit heading</h2>
                            <p class="font-raleway font-bold">Raleway paragraph</p>
                        </div>
                    </div>
                </template>
            </CommonContainer>
        </div>
    </div>
</template>
