<template>
    <CommonContainer title="COMPONENT DEMO LIST">
        <template #main>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-2 item-center">
                <CommonLink
                    to="/demo/form"
                    name="Form Demo"
                    class="text-white bg-gray-500 px-4 py-2"
                />
                <CommonLink
                    to="/demo/theme"
                    name="Theme Demo"
                    class="text-white bg-gray-500 px-4 py-2"
                />
                <CommonLink
                    to="/demo/advance"
                    name="Advance Demo"
                    class="text-white bg-gray-500 px-4 py-2"
                />
            </div>
        </template>
    </CommonContainer>
</template>
