<template>
    <CommonContainer title="COMPONENT DEMO LIST">
        <template #main>
            <div class="grid grid-cols-4 gap-2">
                <CommonLink
                    to="/componentDemo"
                    name="Component Demo"
                    class="text-white bg-gray-500 px-4 py-2"
                />
                <CommonLink
                    to="/themeDemo"
                    name="Theme Demo"
                    class="text-white bg-gray-500 px-4 py-2"
                />
            </div>
        </template>
    </CommonContainer>
</template>
