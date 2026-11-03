import { useCallback, useState } from 'react';

function read(storageKey: string): Set<string> {
  try {
    const raw = sessionStorage.getItem(storageKey);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

/**
 * A set of ids kept for the browser session (until the tab is closed).
 * Used for the "À faire" checkboxes.
 */
export function useSessionSet(storageKey: string) {
  const [ids, setIds] = useState(() => read(storageKey));

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        try {
          sessionStorage.setItem(storageKey, JSON.stringify([...next]));
        } catch {
          // Storage blocked (private mode): the boxes still work until the page reloads.
        }
        return next;
      });
    },
    [storageKey],
  );

  return { ids, toggle };
}
