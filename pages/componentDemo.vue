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
        <div class="grid grid-rows-1 md:grid-cols-4 gap-2">
            <CommonContainer title="<CommonButton/>">
                <template #main>
                    <div>
                        <p>Primary Button (Default)</p>
                        <CommonButton name="Primary Button (Default)" type="primary"/>
                        <CommonButton name="Danger Button" type="danger"/>
                        <CommonButton name="Success Button" type="success"/>
                        <CommonButton name="Warning Button" type="warning"/>
                    </div>
                    <div>
                        <p>Plain Button</p>
                        <CommonButton name="Primary Button (Default)" type="primary" :plain="true"/>
                        <CommonButton name="Danger Button" type="danger" :plain="true"/>
                        <CommonButton name="Success Button" type="success" :plain="true"/>
                        <CommonButton name="Warning Button" type="warning" :plain="true"/>
                    </div>
                    <div>
                        <p>Round Button</p>
                        <CommonButton name="Primary Button (Default)" type="primary" :round="true"/>
                        <CommonButton name="Danger Button" type="danger" :round="true"/>
                        <CommonButton name="Success Button" type="success" :round="true"/>
                        <CommonButton name="Warning Button" type="warning" :round="true"/>
                    </div>
                </template>
            </CommonContainer>
            <CommonContainer title="<CommonContainer/>">
                <template #main>
                    <CommonContainer
                        title="This is example container"
                        description="this is example discription of container"
                        :footer="true"
                        class="bg-gray-800 text-white"
                    >
                        <template #main>
                            <p>INNER CONTAINER</p>
                        </template>
                        <template #footer>
                            <p>INNER CONTAINER FOOTER</p>
                        </template>
                    </CommonContainer>
                </template>
            </CommonContainer>

            <CommonContainer title="<CommonParagraph    />">
                <template #main>
                    <CommonParagraph>
                        This is example paragraph
                    </CommonParagraph>
                </template>
            </CommonContainer>
        </div>
    </div>
</template>
