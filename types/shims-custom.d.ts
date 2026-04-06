declare module '~/utils/formats' {
  export function formatCurrency(value?: number | null): string;
}

declare module '~/composables/useApi' {
  import type { AxiosInstance } from 'axios';
  export const useApi: () => AxiosInstance;
}

declare module '#imports' {
  // Nuxt auto-imports; keep it any.
  const _any: any;
  export default _any;
}

// Make `useNuxtApp` available to TypeScript (simple any shim)
declare function useNuxtApp(): any;

// Allow importing image/gif assets
declare module '*.gif' {
  const src: string
  export default src
}

// Allow importing .vue files in TypeScript tests and tooling
declare module '*.vue' {
  import { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

