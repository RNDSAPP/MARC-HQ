import { useState } from 'react';
import type { FormEvent } from 'react';
import { setRemember, supabase } from '../lib/supabase';
import './Login.css';

/** Where to come back after an e-mail link: the page Marc asked for. */
const back = () => window.location.href.split('#')[0];

type Mode = 'login' | 'signup' | 'forgot';

/** Supabase's refusals, in Marc's words. */
function explain(message: string) {
  if (/invalid login credentials/i.test(message)) return 'Adresse ou mot de passe incorrect.';
  if (/email not confirmed/i.test(message)) return 'Confirme d’abord ton adresse avec le lien reçu par e-mail.';
  if (/rate|limit|seconds/i.test(message)) return 'Trop de mails envoyés cette heure-ci. Réessaie un peu plus tard.';
  if (/password/i.test(message)) return 'Le mot de passe doit faire au moins 6 caractères.';
  return 'Ça n’a pas marché. Réessaie.';
}

/**
 * The door of Marc HQ: an e-mail and a password. First time (or forgotten password), a link by
 * e-mail lets Marc choose one. Only the addresses allowed on the server get past it (AuthGate).
 */
export default function Login({ refused, recovering, onSignOut, onPasswordSet }: {
  refused?: string;
  /** Back from a "choose your password" link: ask for the new password. */
  recovering?: boolean;
  onSignOut?: () => void;
  onPasswordSet?: () => void;
}) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [remember, setRememberChoice] = useState(true);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage('');
    if (recovering) {
      const { error } = await supabase.auth.updateUser({ password });
      setBusy(false);
      if (error) setMessage(explain(error.message));
      else onPasswordSet?.();
      return;
    }
    if (mode === 'login') {
      setRemember(remember);
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      setBusy(false);
      if (error) setMessage(explain(error.message));
      return;
    }
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: back() } });
      setBusy(false);
      if (error) setMessage(explain(error.message));
      else if (!data.session) setMessage(`Presque fini : ouvre le lien envoyé à ${email.trim()} pour confirmer ton adresse.`);
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: back() });
    setBusy(false);
    setMessage(error ? explain(error.message) : `Lien envoyé à ${email.trim()} : ouvre-le sur cet appareil pour choisir ton mot de passe.`);
  }

  const title = recovering ? 'Choisis ton mot de passe' : mode === 'signup' ? 'Créer ton accès' : mode === 'forgot' ? 'Mot de passe oublié' : 'Connexion';
  const action = recovering ? 'Enregistrer' : mode === 'signup' ? 'Créer mon accès' : mode === 'forgot' ? 'Recevoir le lien' : 'Se connecter';

  return (
    <main className="login">
      <div className="login-card">
        <span className="login-logo" aria-hidden="true">
          HQ
        </span>
        <h1 className="login-title">
          <span className="login-light">Marc HQ</span> <span className="login-bold">RNDS et Club 421</span>
        </h1>
        {refused ? (
          <>
            <p className="login-text">{refused} n’a pas accès à Marc HQ.</p>
            <button type="button" className="login-send" onClick={onSignOut}>
              Utiliser une autre adresse
            </button>
          </>
        ) : (
          <form className="login-mail" onSubmit={submit}>
            <p className="login-step">{title}</p>
            {!recovering && (
              <>
                <label className="visually-hidden" htmlFor="login-email">
                  Adresse e-mail
                </label>
                <input id="login-email" className="login-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adresse e-mail" autoComplete="email" required />
              </>
            )}
            {mode !== 'forgot' || recovering ? (
              <>
                <label className="visually-hidden" htmlFor="login-password">
                  Mot de passe
                </label>
                <input
                  id="login-password"
                  className="login-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={recovering || mode === 'signup' ? 'Nouveau mot de passe (6 caractères min.)' : 'Mot de passe'}
                  autoComplete={recovering || mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={6}
                  required
                />
              </>
            ) : null}
            {mode === 'login' && !recovering && (
              <label className="login-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRememberChoice(e.target.checked)} />
                Rester connecté sur cet appareil
              </label>
            )}
            <button type="submit" className="login-send" disabled={busy}>
              {busy ? '…' : action}
            </button>
          </form>
        )}
        {message && (
          <p className="login-message" role="status">
            {message}
          </p>
        )}
        {!refused && !recovering && (
          <div className="login-links">
            {mode !== 'login' && (
              <button type="button" className="login-other" onClick={() => { setMode('login'); setMessage(''); }}>
                J’ai déjà un mot de passe
              </button>
            )}
            {mode !== 'forgot' && (
              <button type="button" className="login-other" onClick={() => { setMode('forgot'); setMessage(''); }}>
                Mot de passe oublié ou première fois
              </button>
            )}
            {mode !== 'signup' && (
              <button type="button" className="login-other" onClick={() => { setMode('signup'); setMessage(''); }}>
                Créer un accès
              </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
