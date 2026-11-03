import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Login from '../pages/Login';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';

/**
 * Marc HQ behind its door: nothing shows until someone is signed in with an allowed address. On
 * a computer without the Supabase settings (.env.local), the app opens as before, on sample data.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const [allowed, setAllowed] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    if (!supabase || !session) {
      setAllowed(undefined);
      return;
    }
    supabase.functions.invoke('access', { body: {} }).then(({ data }) => setAllowed(Boolean(data?.allowed)));
  }, [session]);

  if (!supabase) return <>{children}</>;
  if (session === undefined || (session && allowed === undefined)) return <main className="login" aria-busy="true" />;
  if (!session) return <Login />;
  if (!allowed) return <Login refused={session.user.email ?? 'Cette adresse'} onSignOut={() => supabase?.auth.signOut()} />;
  return <>{children}</>;
}
