import { useSyncExternalStore } from 'react';

// Tiny external store usable from both React and Phaser.
export function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    set(patch: Partial<T> | ((s: T) => Partial<T>)) {
      const p = typeof patch === 'function' ? (patch as (s: T) => Partial<T>)(state) : patch;
      state = { ...state, ...p };
      listeners.forEach((l) => l());
    },
    replace(next: T) {
      state = next;
      listeners.forEach((l) => l());
    },
    subscribe(l: () => void) {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
}

export type Store<T> = ReturnType<typeof createStore<T>>;

export function useStore<T>(store: Store<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

// Simple event bus between Phaser and React.
type Handler = (payload?: any) => void;
const handlers = new Map<string, Set<Handler>>();
export const bus = {
  on(evt: string, h: Handler) {
    if (!handlers.has(evt)) handlers.set(evt, new Set());
    handlers.get(evt)!.add(h);
    return () => { handlers.get(evt)!.delete(h); };
  },
  emit(evt: string, payload?: any) {
    handlers.get(evt)?.forEach((h) => h(payload));
  },
};

// Touch / on-screen controls shared with Phaser.
export const touchInput = { up: false, down: false, left: false, right: false, action: false };
