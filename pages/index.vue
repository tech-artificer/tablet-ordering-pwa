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
<script setup>
// PWA Setup
useHead({
    title: 'My PWA App',
    meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'A simple PWA built with Nuxt 3' },
        // PWA Meta Tags
        { name: 'theme-color', content: '#000000' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'My PWA App' },
        { name: 'msapplication-TileColor', content: '#000000' },
    ],
    link: [
        // Manifest
        { rel: 'manifest', href: 'manifest.webmanifest' },
        // Icons
        { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/icons/android-launchericon-48-48.png' },
        { rel: 'icon', type: 'image/png', sizes: '72x72', href: '/icons/android-launchericon-72-72.png' },
        { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/icons/android-launchericon-96-96.png' },
        { rel: 'icon', type: 'image/png', sizes: '144x144', href: '/icons/android-launchericon-144-144.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/android-launchericon-192-192.png' },
        { rel: 'icon', type: 'image/png', sizes: '512x512', href: '/icons/android-launchericon-512-512.png' },
        { rel: 'apple-touch-icon', href: '/icons/android-launchericon-192-192.png' },
    ],
})
</script>
