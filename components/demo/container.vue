<template>
    <CommonContainer title="<CommonContainer/>">
        <template #main>
            <CommonContainer
                title="This is example container"
                description="this is example discription of container"
                :footer="true"
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
</template>
