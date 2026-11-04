import { useCallback, useEffect } from 'react';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { useStored } from './useStored';

// Lists Marc keeps in his tools (notes, ideas, versions, feedback, goals, links, services'
// addresses, cards' details, added projects), shared by his phone and his computer through
// Supabase (table user_store, one row per list) once he is signed in.
// - This browser keeps its copy (useStored): instant on screen, readable offline.
// - The first time a list meets Supabase on a device, both are merged (lists by id, objects
//   field by field), so nothing written on either device before the sync is lost.
// - A change goes to Supabase a moment later (typing a note sends once, not at every key); if it
//   cannot (no network), it goes again when the network or the app comes back.
// - A change made on the other device arrives live (realtime), or on coming back to the app.

const FIRST_SYNC = 'marc-hq:synced-keys';
const pushTimers = new Map<string, number>();
const dirty = new Set<string>();
let userId: string | null = null;
let remote: Map<string, unknown> | null = null;
let loading: Promise<void> | null = null;
// Every screen showing a key, and how to put a value on it (several screens can show the same list)
const writers = new Map<string, Set<(value: unknown) => void>>();
/** Puts a value on every screen showing the key, or in this browser's copy when none is open. */
function show(key: string, value: unknown) {
  const set = writers.get(key);
  if (set?.size) set.forEach((write) => write(value));
  else {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage blocked: the next load brings it.
    }
  }
}

const readLocal = (key: string) => {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as unknown);
  } catch {
    return undefined;
  }
};

const syncedHere = () => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(FIRST_SYNC) ?? '[]'));
  } catch {
    return new Set<string>();
  }
};
const markSynced = (key: string) => {
  const keys = syncedHere();
  keys.add(key);
  try {
    localStorage.setItem(FIRST_SYNC, JSON.stringify([...keys]));
  } catch {
    // Storage blocked: the merge simply runs again next time, which is harmless.
  }
};

/** Both copies together: lists by id (Supabase's first), objects field by field (filled ones win). */
function merge(saved: unknown, here: unknown): unknown {
  if (Array.isArray(saved) && Array.isArray(here)) {
    const ids = new Set(saved.map((item) => (item as { id?: string })?.id));
    return [...saved, ...here.filter((item) => !ids.has((item as { id?: string })?.id))];
  }
  if (saved && here && typeof saved === 'object' && typeof here === 'object') {
    const out: Record<string, unknown> = { ...(saved as Record<string, unknown>) };
    for (const [field, value] of Object.entries(here as Record<string, unknown>)) if (out[field] === undefined || out[field] === '') out[field] = value;
    return out;
  }
  return saved ?? here;
}

const isEmpty = (value: unknown) => value === undefined || value === null || (Array.isArray(value) && value.length === 0) || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0);

async function push(key: string) {
  if (!supabase || !userId) return;
  const value = readLocal(key);
  if (value === undefined) return;
  const { error } = await supabase.from('user_store').upsert({ key, value, updated_at: new Date().toISOString() });
  if (error) return; // stays dirty: sent again when the network or the app comes back
  dirty.delete(key);
  remote?.set(key, value);
}

function schedulePush(key: string) {
  dirty.add(key);
  window.clearTimeout(pushTimers.get(key));
  pushTimers.set(key, window.setTimeout(() => push(key), 700));
}

/** A key meets Supabase on this device: take the saved list, merged with this device's the first time. */
function settle(key: string) {
  if (!remote) return;
  const here = readLocal(key);
  const saved = remote.get(key);
  const first = !syncedHere().has(key);
  if (saved === undefined) {
    if (!isEmpty(here)) schedulePush(key);
  } else if (first && !isEmpty(here)) {
    const both = merge(saved, here);
    show(key, both);
    if (JSON.stringify(both) !== JSON.stringify(saved)) schedulePush(key);
  } else if (!dirty.has(key)) {
    show(key, saved);
  }
  markSynced(key);
}

async function load() {
  if (!supabase || !userId) return;
  const { data, error } = await supabase.from('user_store').select('key, value');
  if (error || !data) return;
  remote = new Map(data.map((row) => [row.key as string, row.value as unknown]));
  writers.forEach((_, key) => settle(key));
}

function start(id: string) {
  if (userId === id && loading) return loading;
  userId = id;
  loading = load();
  const client = supabase!;
  client
    .channel('user-store-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_store' }, (payload) => {
      const row = payload.new as { key?: string; value?: unknown };
      if (!row?.key || dirty.has(row.key)) return;
      remote?.set(row.key, row.value);
      show(row.key, row.value);
    })
    .subscribe();
  // Back on the app or the network: what could not be sent goes now, and the other device's changes come in
  const catchUp = () => {
    if (document.visibilityState !== 'visible') return;
    dirty.forEach((key) => push(key));
    load();
  };
  document.addEventListener('visibilitychange', catchUp);
  window.addEventListener('online', catchUp);
  return loading;
}

/**
 * Like useStored (same value and setter), but shared between Marc's devices once he is signed in.
 * Not signed in, or Supabase not set up: it stays in this browser, as before.
 */
export function useSynced<T>(key: string, seed: () => T): [T, (update: (prev: T) => T) => void] {
  const session = useSession();
  const [value, setLocal] = useStored<T>(key, seed);

  // How the sync writes this key on screen (and in this browser's copy)
  useEffect(() => {
    const write = (next: unknown) => setLocal(() => next as T);
    const set = writers.get(key) ?? new Set();
    set.add(write);
    writers.set(key, set);
    if (remote) settle(key);
    return () => {
      set.delete(write);
    };
  }, [key, setLocal]);

  const id = session?.user.id;
  useEffect(() => {
    if (supabase && id) start(id);
  }, [id]);

  const update = useCallback(
    (change: (prev: T) => T) => {
      setLocal(change);
      if (supabase && userId) schedulePush(key);
    },
    [key, setLocal],
  );

  return [value, update];
}
