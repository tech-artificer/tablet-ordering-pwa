<template>
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
</template>
