import { useSyncExternalStore } from "react";

const KEY = "atlas-visited";
let visited = new Set<string>();
try {
  visited = new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]);
} catch {
  /* Storage may be unavailable. */
}
const listeners = new Set<() => void>();
let snapshot = visited;

export function markVisited(id: string) {
  if (visited.has(id)) return;
  visited = new Set(visited).add(id);
  snapshot = visited;
  try {
    localStorage.setItem(KEY, JSON.stringify([...visited]));
  } catch {
    /* Optional persistence. */
  }
  listeners.forEach((listener) => listener());
}

export const useVisited = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    () => snapshot,
  );
