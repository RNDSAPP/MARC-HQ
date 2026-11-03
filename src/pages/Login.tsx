import { useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import './Login.css';

/** Where to come back after signing in: the page Marc asked for. */
const back = () => window.location.href.split('#')[0];

/**
 * The door of Marc HQ: sign in with Google in one click, or with a link sent by e-mail. Only the
 * addresses allowed on the server get past it (AuthGate).
 */
export default function Login({ refused, onSignOut }: { refused?: string; onSignOut?: () => void }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [byMail, setByMail] = useState(false);

  async function google() {
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back() } });
    if (error) {
      setBusy(false);
      setMessage('La connexion Google n’est pas encore activée. Utilise le lien par e-mail.');
    }
  }

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: back() } });
    setBusy(false);
    setMessage(
      error
        ? /rate|limit/i.test(error.message)
          ? 'Trop de liens envoyés cette heure-ci. Réessaie un peu plus tard, ou continue avec Google.'
          : 'Le lien n’a pas pu partir. Vérifie l’adresse.'
        : `Lien envoyé à ${email.trim()}. Ouvre-le sur cet appareil.`,
    );
  }

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
            <button type="button" className="login-google" onClick={onSignOut}>
              Utiliser une autre adresse
            </button>
          </>
        ) : (
          <>
            <p className="login-text">Connecte-toi pour retrouver tes projets, tes tâches et ton agenda, sur tous tes appareils.</p>
            <button type="button" className="login-google" onClick={google} disabled={busy}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" />
                <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
                <path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7.1H2.1a11 11 0 0 0 0 9.9l3.7-2.8z" />
                <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
              </svg>
              Continuer avec Google
            </button>
            {byMail ? (
              <form className="login-mail" onSubmit={sendLink}>
                <label className="visually-hidden" htmlFor="login-email">
                  Ton adresse e-mail
                </label>
                <input id="login-email" className="login-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ton adresse e-mail" autoComplete="email" />
                <button type="submit" className="login-send" disabled={busy || !email.trim()}>
                  Recevoir le lien
                </button>
              </form>
            ) : (
              <button type="button" className="login-other" onClick={() => setByMail(true)}>
                Recevoir un lien par e-mail
              </button>
            )}
          </>
        )}
        {message && (
          <p className="login-message" role="status">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
