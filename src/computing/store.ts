import { useSyncExternalStore } from "react";

/**
 * A tiny observable value shared by a lesson's 3D scene (which reads it every
 * frame) and its interactive overlay (which renders and changes it).
 */
export class Store<T extends object> {
  private value: T;
  private readonly listeners = new Set<() => void>();

  constructor(initial: T) {
    this.value = initial;
  }

  get = () => this.value;

  set(patch: Partial<T> | ((value: T) => Partial<T>)) {
    const next = typeof patch === "function" ? patch(this.value) : patch;
    this.value = { ...this.value, ...next };
    this.listeners.forEach((listener) => listener());
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };
}

export const useStore = <T extends object>(store: Store<T>) => useSyncExternalStore(store.subscribe, store.get);
