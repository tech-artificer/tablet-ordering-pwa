export function useNuxtApp () {
    return {
        $router: {
            replace: () => Promise.resolve(undefined),
            push: () => Promise.resolve(undefined),
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
