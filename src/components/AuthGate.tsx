import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Login from '../pages/Login';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';

/**
 * Marc HQ behind its door: nothing shows until someone is signed in with an allowed address. Back
 * from a "choose your password" link, the new password is asked first. On a computer without the
 * Supabase settings (.env.local), the app opens as before, on sample data.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const [allowed, setAllowed] = useState<boolean | undefined>(undefined);
  const [recovering, setRecovering] = useState(() => window.location.hash.includes('type=recovery'));

  useEffect(() => {
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((event) => event === 'PASSWORD_RECOVERY' && setRecovering(true));
    return () => data.subscription.unsubscribe();
  }, []);

  // Asked once per person (not at each token refresh). A failed call (no network yet, on coming
  // back to the app) is not a refusal: it keeps the last answer, or tries again a little later.
  const userId = session?.user.id;
  useEffect(() => {
    if (!supabase || !userId) {
      setAllowed(undefined);
      return;
    }
    const client = supabase;
    let alive = true;
    let timer = 0;
    const ask = () =>
      client.functions
        .invoke('access', { body: {} })
        .then(({ data, error }) => {
          if (!alive) return;
          if (error || typeof data?.allowed !== 'boolean') timer = window.setTimeout(ask, 3000);
          else setAllowed(data.allowed);
        })
        .catch(() => alive && (timer = window.setTimeout(ask, 3000)));
    ask();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [userId]);

  if (!supabase) return <>{children}</>;
  if (session === undefined || (session && allowed === undefined)) return <main className="login" aria-busy="true" />;
  if (!session) return <Login />;
  if (recovering) return <Login recovering onPasswordSet={() => setRecovering(false)} />;
  if (!allowed) return <Login refused={session.user.email ?? 'Cette adresse'} onSignOut={() => supabase?.auth.signOut()} />;
  return <>{children}</>;
}
