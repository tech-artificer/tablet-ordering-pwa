// Minimal ambient declarations to satisfy the static checker in editor/CI
// This file avoids noisy "Cannot find module '#app'" / '#imports' errors

declare module '#app' {
  export function defineNuxtPlugin(plugin: any): any
}

declare module '#imports' {
  export function useRuntimeConfig(): any
}

// Provide minimal window augmentations used by plugins
declare global {
  interface Window {
    Echo?: any
    $echo?: any
    updateEchoAuth?: ((token: string | null) => void) | undefined
    Pusher?: any
  }
}

export {}
