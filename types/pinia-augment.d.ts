declare module 'pinia' {
  // Minimal typing for pinia-plugin-persistedstate's `persist` option.
  // This narrows the previous broad shims and provides common option shapes
  // used in this repo: boolean or object with `key`, `storage`, and `paths`.
  interface PersistOptions {
    key?: string;
    storage?: Storage | {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
      removeItem(key: string): void;
    };
    paths?: string[];
  }

  // Extend DefineStoreOptions to accept persist in a pragmatic, typed way.
  interface DefineStoreOptions<Id = string, S = any, G = any, A = any> {
    persist?: boolean | PersistOptions;
  }
}
