export function useNuxtApp () {
    return {
        $router: {
            replace: async () => undefined,
            push: async () => undefined,
        },
        $offlineOutbox: undefined,
    }
}

export function defineNuxtPlugin (plugin: any) {
    return plugin
}

export function useRuntimeConfig () {
    return { public: {} }
}
