import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

/** The page without its ?google=… return flag: where links and Google send Marc back. */
export const here = () => window.location.href.split('?')[0];

/**
 * Sign-in to Marc HQ by a link sent by e-mail (no password). Only the addresses allowed on the
 * server can then use what is behind it.
 */
export default function AccountGate({ title, text, icon }: { title: string; text: string; icon?: ReactNode }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: here() } });
    setBusy(false);
    setMessage(error ? 'Le lien n’a pas pu partir. Vérifie l’adresse.' : `Lien envoyé à ${email.trim()}. Ouvre-le sur cet appareil.`);
  }

  return (
    <form className="tool-card mail-gate" onSubmit={sendLink}>
      {icon && (
        <span className="mail-gate-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <h2 className="mail-gate-title">{title}</h2>
      <p className="mail-gate-text">{text}</p>
      <div className="tool-add">
        <label className="visually-hidden" htmlFor="gate-email">
          Ton adresse e-mail
        </label>
        <input id="gate-email" className="tool-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ton adresse e-mail" autoComplete="email" />
        <button type="submit" className="tool-primary" disabled={busy || !email.trim()}>
          Recevoir le lien
        </button>
      </div>
      {message && (
        <p className="mail-message" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
