// Minimal ambient declarations to satisfy the static checker in editor/CI
// This file avoids noisy "Cannot find module '#app'" / '#imports' errors

declare module '#app' {
  export function defineNuxtPlugin(plugin: any): any
  export function useNuxtApp(): any
  export function useRuntimeConfig(): any
}

declare module '#imports' {
  export function useRuntimeConfig(): any
  export function useNuxtApp(): any
  export function useRoute(): ReturnType<typeof import('vue-router')['useRoute']>
  export function useRouter(): ReturnType<typeof import('vue-router')['useRouter']>
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.gif' {
  const src: string
  export default src
}

// Provide minimal window augmentations used by plugins
declare global {
  const ref: typeof import('vue')['ref']
  const computed: typeof import('vue')['computed']
  const reactive: typeof import('vue')['reactive']
  const watch: typeof import('vue')['watch']
  const onMounted: typeof import('vue')['onMounted']
  const onUnmounted: typeof import('vue')['onUnmounted']
  const onBeforeUnmount: typeof import('vue')['onBeforeUnmount']
  const useRoute: typeof import('vue-router')['useRoute']
  const useRouter: typeof import('vue-router')['useRouter']
  const useNuxtApp: () => any
  const useRuntimeConfig: () => any
  const navigateTo: typeof import('nuxt/dist/app/composables/router')['navigateTo']
  const definePageMeta: typeof import('nuxt/dist/pages/runtime/composables')['definePageMeta']
  type PropType<T> = import('vue').PropType<T>

  interface Window {
    Echo?: any
    $echo?: any
    updateEchoAuth?: ((token: string | null) => void) | undefined
    Pusher?: any
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    readonly navigateTo: typeof import('nuxt/dist/app/composables/router')['navigateTo']
  }
}

export {}
