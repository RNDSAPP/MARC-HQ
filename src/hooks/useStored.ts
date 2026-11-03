import { useCallback, useEffect, useState } from 'react';

// Every hook reading the same key hears about each write, in this tab and in the others.
const listeners = new Map<string, Set<() => void>>();

function read<T>(key: string, fallback: () => T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback();
  } catch {
    return fallback();
  }
}

/**
 * A value kept in this browser's local storage, so it survives closing the tab.
 * `seed` gives the first value when nothing is stored yet. If storage is blocked
 * (private browsing), the value still works until the page reloads.
 */
export function useStored<T>(key: string, seed: () => T): [T, (update: (prev: T) => T) => void] {
  const [value, setValue] = useState(() => read(key, seed));

  useEffect(() => {
    const refresh = () => setValue(read(key, seed));
    const set = listeners.get(key) ?? new Set();
    set.add(refresh);
    listeners.set(key, set);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      set.delete(refresh);
      window.removeEventListener('storage', onStorage);
    };
    // `seed` only matters for the first read of a key.
  }, [key]);

  const update = useCallback(
    (change: (prev: T) => T) => {
      setValue((prev) => {
        const next = change(prev);
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Storage blocked: keep the change in memory only.
        }
        queueMicrotask(() => listeners.get(key)?.forEach((refresh) => refresh()));
        return next;
      });
    },
    [key],
  );

  return [value, update];
}

/** A short random id for new items. */
export function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
