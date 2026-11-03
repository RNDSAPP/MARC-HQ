import { createClient } from '@supabase/supabase-js';

// The Marc HQ project on Supabase (its own organisation, apart from TTP). The address and the
// publishable key come from .env.local, never from the repository; see .env.example.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** The Supabase client, or null when the app runs without its settings (sample data only). */
export const supabase = url && key ? createClient(url, key) : null;
