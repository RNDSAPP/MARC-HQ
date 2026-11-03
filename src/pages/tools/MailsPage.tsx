import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import BrandIcon from '../../components/BrandIcon';
import type { Project } from '../../data/types';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import './Tools.css';

type Mail = { id: string; thread: string; from: string; subject: string; date: number; snippet: string; unread: boolean };
type Props = { project: Project; query: (text: string) => boolean };

/** The page without its ?google=… return flag: where Google sends Marc back. */
const here = () => window.location.href.split('?')[0];

/** "Inès D. <ines@…>" → "Inès D." */
const senderName = (from: string) => from.replace(/<[^>]*>/, '').replace(/"/g, '').trim() || from;

const when = (ms: number) => {
  const date = new Date(ms);
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

/** The message of a server function's refusal. */
async function failure(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => ({}));
    return { message: (body.error as string) ?? 'Erreur du serveur.', reconnect: Boolean(body.reconnect) };
  }
  return { message: 'Pas de réponse du serveur.', reconnect: false };
}

const RETURNS: Record<string, string> = {
  ok: 'Boîte connectée.',
  annule: 'Connexion annulée.',
  erreur: 'Google n’a pas pu connecter la boîte. Réessaie.',
};

/**
 * The project's own Gmail box: sign in to Marc HQ by e-mail link, connect the box once with
 * Google, then the latest mails, each opening in Gmail. Each project has its own box.
 */
export default function MailsPage({ project, query }: Props) {
  const session = useSession();
  const [email, setEmail] = useState('');
  const [box, setBox] = useState<string | null | undefined>(undefined);
  const [mails, setMails] = useState<Mail[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reconnect, setReconnect] = useState(false);

  // Coming back from Google: say how it went, then clean the address
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('google');
    if (result) {
      setMessage(RETURNS[result] ?? '');
      window.history.replaceState(null, '', here());
    }
  }, []);

  // Which box this project has, if any
  useEffect(() => {
    if (!supabase || !session) return;
    setBox(undefined);
    supabase
      .from('mail_connections')
      .select('email')
      .eq('project_id', project.id)
      .maybeSingle()
      .then(({ data }) => setBox(data?.email ?? null));
  }, [session, project.id]);

  const load = useCallback(async () => {
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('gmail-inbox', { body: { project_id: project.id } });
    setBusy(false);
    if (error) {
      const fail = await failure(error);
      setMessage(fail.message);
      setReconnect(fail.reconnect);
      return;
    }
    setReconnect(false);
    setMails(data.messages as Mail[]);
  }, [project.id]);

  useEffect(() => {
    if (box) load();
  }, [box, load]);

  if (!supabase) {
    return (
      <section className="tool" aria-labelledby="tool-title">
        <Title project={project} />
        <p className="tool-empty">Supabase n’est pas réglé sur cet appareil : ajoute son adresse et sa clé dans .env.local.</p>
      </section>
    );
  }

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !email.trim()) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: here() } });
    setBusy(false);
    setMessage(error ? 'Le lien n’a pas pu partir. Vérifie l’adresse.' : `Lien envoyé à ${email.trim()}. Ouvre-le sur cet appareil.`);
  }

  async function connect() {
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('gmail-connect', { body: { project_id: project.id, return_to: here() } });
    if (error) {
      setBusy(false);
      setMessage((await failure(error)).message);
      return;
    }
    window.location.href = data.url as string;
  }

  async function disconnect() {
    if (!supabase) return;
    await supabase.from('mail_connections').delete().eq('project_id', project.id);
    setBox(null);
    setMails(null);
    setMessage('Boîte déconnectée de Marc HQ.');
  }

  const visible = (mails ?? []).filter((m) => query(`${m.from} ${m.subject} ${m.snippet}`));
  const unread = (mails ?? []).filter((m) => m.unread).length;

  return (
    <section className="tool" aria-labelledby="tool-title">
      <Title project={project} count={box && mails ? unread : undefined} />
      {message && (
        <p className="mail-message" role="status">
          {message}
        </p>
      )}

      {session === undefined || (session && box === undefined) ? null : !session ? (
        <form className="tool-card mail-gate" onSubmit={sendLink}>
          <span className="mail-gate-icon" aria-hidden="true">
            <BrandIcon brand="gmail" size={26} />
          </span>
          <h2 className="mail-gate-title">Connecte-toi à Marc HQ</h2>
          <p className="mail-gate-text">Tes mails restent protégés : toi seul peux les lire. Entre ton adresse, tu reçois un lien pour entrer.</p>
          <div className="tool-add">
            <label className="visually-hidden" htmlFor="mail-login">
              Ton adresse e-mail
            </label>
            <input id="mail-login" className="tool-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Ton adresse e-mail" autoComplete="email" />
            <button type="submit" className="tool-primary" disabled={busy || !email.trim()}>
              Recevoir le lien
            </button>
          </div>
        </form>
      ) : !box || reconnect ? (
        <div className="tool-card mail-gate">
          <span className="mail-gate-icon" aria-hidden="true">
            <BrandIcon brand="gmail" size={26} />
          </span>
          <h2 className="mail-gate-title">{reconnect ? 'Reconnecte la boîte' : `La boîte Gmail de ${project.name}`}</h2>
          <p className="mail-gate-text">
            {reconnect
              ? 'Google demande de confirmer l’accès de temps en temps.'
              : `Choisis le compte Gmail de ${project.name}. Marc HQ lit seulement tes mails, il n’en envoie et n’en supprime aucun.`}
          </p>
          <button type="button" className="tool-primary" onClick={connect} disabled={busy}>
            {reconnect ? 'Reconnecter avec Google' : 'Connecter avec Google'}
          </button>
        </div>
      ) : (
        <>
          <div className="mail-bar">
            <span className="mail-box">
              <BrandIcon brand="gmail" size={16} />
              {box}
            </span>
            <button type="button" className="tool-ghost" onClick={load} disabled={busy}>
              {busy ? 'Actualisation…' : 'Actualiser'}
            </button>
            <a className="tool-ghost mail-open" href={`https://mail.google.com/mail/u/${box}/`}>
              Ouvrir Gmail
            </a>
            <button type="button" className="tool-ghost" onClick={disconnect}>
              Déconnecter
            </button>
          </div>
          {mails === null ? (
            <p className="tool-empty">Chargement des mails…</p>
          ) : visible.length === 0 ? (
            <p className="tool-empty">{mails.length === 0 ? 'Boîte de réception vide.' : 'Aucun mail ne correspond.'}</p>
          ) : (
            <ul className="tool-card mails">
              {visible.map((mail) => (
                <li key={mail.id}>
                  <a className={`mail${mail.unread ? ' mail--unread' : ''}`} href={`https://mail.google.com/mail/u/${box}/#inbox/${mail.thread}`}>
                    <span className="mail-dot" aria-label={mail.unread ? 'non lu' : undefined} />
                    <span className="mail-from">{senderName(mail.from)}</span>
                    <span className="mail-date">{when(mail.date)}</span>
                    <span className="mail-subject">{mail.subject || '(sans objet)'}</span>
                    <span className="mail-snippet">{mail.snippet}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {session && (
        <button type="button" className="mail-signout" onClick={() => supabase?.auth.signOut()}>
          Se déconnecter de Marc HQ
        </button>
      )}
    </section>
  );
}

function Title({ project, count }: { project: Project; count?: number }) {
  return (
    <div className="tool-head">
      <h1 id="tool-title" className="tool-title">
        <span className="tool-title-light">Mails</span> <span className="tool-title-bold">{count !== undefined ? `${count} non lus` : project.name}</span>
      </h1>
    </div>
  );
}
