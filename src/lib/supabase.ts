import { createClient } from '@supabase/supabase-js';

// The Marc HQ project on Supabase (its own organisation, apart from TTP). The address and the
// publishable key come from .env.local, never from the repository; see .env.example.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const REMEMBER = 'marc-hq:remember';

/** "Rester connecté": kept in this browser (on), or only until the browser is closed (off). */
export function setRemember(on: boolean) {
  try {
    localStorage.setItem(REMEMBER, on ? '1' : '0');
  } catch {
    // Private browsing: the session simply lasts as long as the tab
  }
}

const remembered = () => {
  try {
    return localStorage.getItem(REMEMBER) !== '0';
  } catch {
    return false;
  }
};

// The session goes to localStorage (stays after closing the browser) or sessionStorage (gone when
// it closes), as Marc chose on the sign-in page; reading looks in both.
const sessionStore = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name) ?? sessionStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      (remembered() ? localStorage : sessionStorage).setItem(name, value);
      (remembered() ? sessionStorage : localStorage).removeItem(name);
    } catch {
      // Storage blocked: the session lives in memory for this tab only
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
      sessionStorage.removeItem(name);
    } catch {
      // Nothing stored
    }
  },
};

/** The Supabase client, or null when the app runs without its settings (sample data only). */
export const supabase = url && key ? createClient(url, key, { auth: { storage: sessionStore, persistSession: true } }) : null;
