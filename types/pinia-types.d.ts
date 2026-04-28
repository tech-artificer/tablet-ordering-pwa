// Lightweight, focused Pinia type declarations for this project.
// These provide the minimal generics needed for object-style `defineStore`
// (state/getters/actions) and include a typed `persist` option.
declare module 'pinia' {
  // Persist options (kept consistent with pinia-augment)
  interface PersistOptions {
    key?: string;
    storage?: Storage | {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
      removeItem(key: string): void;
    };
    paths?: string[];
    pick?: string[];
  }

  // Define the shape of options passed to object-style defineStore
  export interface DefineStoreOptions<Id = string, S = any, G = any, A = any> {
    id?: Id;
    state?: () => S;
    getters?: G;
    actions?: A;
    persist?: boolean | PersistOptions;
  }

  // Object-style defineStore: returns an accessor function that returns the
  // merged store type (state & getters & actions) when called: `const s = useStore()`
  export function defineStore<Id extends string, S = any, G = any, A = any>(id: Id, options: DefineStoreOptions<Id, S, G, A>): () => S & G & A;

  // Setup-style defineStore (simplified): returns an accessor function.
  export function defineStore<Id extends string, S = any>(id: Id, setup: () => S): () => S;
  // Setup-style with options (e.g., persistence)
  export function defineStore<Id extends string, S = any>(id: Id, setup: () => S, options?: { persist?: boolean | PersistOptions }): () => S;

  // Runtime helpers (kept minimal)
  export function createPinia(...args: any[]): any;
  export function setActivePinia(pinia?: any): void;
  export function storeToRefs<T extends object>(store: T): any;
}
