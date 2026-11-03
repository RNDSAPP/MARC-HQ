import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { Project } from '../../data/types';
import { removeRecord, saveRecord, useRecords } from '../../lib/records';
import type { RecordRow } from '../../lib/records';
import './Tools.css';

type Account = { network: 'tiktok' | 'instagram'; handle: string };

/** "@boxe", "boxe", "https://www.tiktok.com/@boxe/video/…" or an Instagram link → the account. */
export function readAccount(text: string): Account | null {
  const value = text.trim();
  const insta = value.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (insta) return { network: 'instagram', handle: insta[1] };
  const tiktok = value.match(/tiktok\.com\/@([A-Za-z0-9._]+)/i);
  if (tiktok) return { network: 'tiktok', handle: tiktok[1] };
  const bare = value.replace(/^@/, '');
  return /^[A-Za-z0-9._]{2,30}$/.test(bare) ? { network: 'tiktok', handle: bare } : null;
}

/** TikTok's official profile embed: their script turns the quote into a live profile with videos. */
function TikTokProfile({ handle }: { handle: string }) {
  useEffect(() => {
    // The script only reads the page once: load it again for every new profile shown
    document.querySelectorAll('script[data-tiktok-embed]').forEach((s) => s.remove());
    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    script.dataset.tiktokEmbed = '';
    document.body.appendChild(script);
  }, [handle]);
  return (
    <div className="veille-embed">
      <blockquote className="tiktok-embed" cite={`https://www.tiktok.com/@${handle}`} data-unique-id={handle} data-embed-type="creator" style={{ maxWidth: 780, minWidth: 288, margin: 0 }}>
        <section>
          <a target="_blank" rel="noreferrer" href={`https://www.tiktok.com/@${handle}`}>
            @{handle}
          </a>
        </section>
      </blockquote>
    </div>
  );
}

/**
 * Veille: the accounts Marc follows for this project. TikTok accounts show with TikTok's own
 * profile embed (latest videos, follow button); Instagram has no profile embed, so a link opens it.
 * Kept in Supabase, the same on every device.
 */
export default function VeillePage({ project, query }: { project: Project; query: (text: string) => boolean }) {
  const records = useRecords().filter((r) => r.project_id === project.id && r.kind === 'veille');
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const visible = records.filter((r) => query(`${r.data.name} ${r.data.note ?? ''}`));

  async function add(event: FormEvent) {
    event.preventDefault();
    const account = readAccount(text);
    if (!account) {
      setMessage('Je ne reconnais pas ce compte : colle un @nom ou un lien TikTok ou Instagram.');
      return;
    }
    if (records.some((r) => r.data.handle === account.handle && r.data.network === account.network)) {
      setMessage(`@${account.handle} est déjà dans ta veille.`);
      return;
    }
    const failed = await saveRecord(project.id, 'veille', { name: `@${account.handle}`, handle: account.handle, network: account.network, note: note.trim() });
    setMessage(failed || `@${account.handle} ajouté à ta veille.`);
    if (!failed) {
      setText('');
      setNote('');
    }
  }

  return (
    <section className="tool" aria-labelledby="tool-title">
      <div className="tool-head">
        <h1 id="tool-title" className="tool-title">
          <span className="tool-title-light">Veille</span> <span className="tool-title-bold">{records.length}</span>
        </h1>
      </div>
      <form className="tool-add" onSubmit={add}>
        <label className="visually-hidden" htmlFor="veille-account">
          Compte
        </label>
        <input id="veille-account" className="tool-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="@compte ou lien TikTok / Instagram" autoComplete="off" />
        <label className="visually-hidden" htmlFor="veille-note">
          Pourquoi tu le suis
        </label>
        <input id="veille-note" className="tool-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Pourquoi tu le suis (facultatif)" autoComplete="off" />
        <button type="submit" className="tool-primary" disabled={!text.trim()}>
          Ajouter
        </button>
      </form>
      {message && (
        <p className="mail-message" role="status">
          {message}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="tool-empty">Aucun compte pour l’instant. Ajoute les comptes TikTok qui t’inspirent : tu verras leurs abonnés, leurs « j’aime » et leurs dernières vidéos ici.</p>
      ) : (
        <ul className="veille">
          {visible.map((record: RecordRow) => (
            <li key={record.id} className="tool-card veille-item">
              <div className="veille-head">
                <span className="veille-name">
                  {record.data.name}
                  <span className="veille-network">{record.data.network === 'instagram' ? 'Instagram' : 'TikTok'}</span>
                </span>
                <button type="button" className="tool-remove" onClick={() => removeRecord(record.id)} aria-label={`Retirer ${record.data.name} de la veille`}>
                  ×
                </button>
              </div>
              {record.data.note && <p className="veille-note">{record.data.note}</p>}
              {record.data.network === 'instagram' ? (
                <a className="tool-ghost veille-open" href={`https://www.instagram.com/${record.data.handle}/`} target="_blank" rel="noreferrer">
                  Ouvrir sur Instagram
                </a>
              ) : (
                <TikTokProfile handle={record.data.handle} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
