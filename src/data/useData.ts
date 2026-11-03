import { useEffect, useState } from 'react';

// Results already loaded, so coming back to a screen shows it at once.
const cache = new Map<string, unknown>();

/**
 * Loads data from the access layer (api.ts) and re-renders when it arrives.
 * Returns undefined while loading. `key` must change whenever `load` would return something else.
 */
export function useData<T>(key: string, load: () => Promise<T>): T | undefined {
  const [loaded, setLoaded] = useState<{ key: string; value: T } | undefined>();

  useEffect(() => {
    if (cache.has(key)) return;
    let active = true;
    load().then((value) => {
      cache.set(key, value);
      if (active) setLoaded({ key, value });
    });
    return () => {
      active = false;
    };
    // `load` is recreated on every render; `key` identifies what it loads.
  }, [key]);

  if (cache.has(key)) return cache.get(key) as T;
  return loaded?.key === key ? loaded.value : undefined;
}
