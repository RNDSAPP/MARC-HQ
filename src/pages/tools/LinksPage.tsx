import { useState } from 'react';
import type { FormEvent } from 'react';
import type { useLinks } from '../../data/tools';
import './Tools.css';

type Props = { api: ReturnType<typeof useLinks>; query: (text: string) => boolean };

// The tools an app usually lives in, one tap to add them.
const SUGGESTIONS = [
  { label: 'App Store Connect', url: 'https://appstoreconnect.apple.com' },
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'Supabase', url: 'https://supabase.com/dashboard' },
  { label: 'Figma', url: 'https://www.figma.com' },
  { label: 'Instagram', url: 'https://www.instagram.com' },
  { label: 'TikTok', url: 'https://www.tiktok.com' },
  { label: 'Meta Business', url: 'https://business.facebook.com' },
  { label: 'Gmail', url: 'https://mail.google.com' },
  { label: 'Claude', url: 'https://claude.ai' },
];

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/** The project's shortcuts: consoles, repos, socials. Open in a new tab. */
export default function LinksPage({ api, query }: Props) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const visible = api.links.filter((l) => query(`${l.label} ${l.url}`));
  const missing = SUGGESTIONS.filter((s) => !api.links.some((l) => l.label === s.label));

  function submit(event: FormEvent) {
    event.preventDefault();
    const href = /^https?:\/\//.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    if (!label.trim() || !url.trim()) return;
    api.add(label.trim(), href);
    setLabel('');
    setUrl('');
  }

  return (
    <section className="tool" aria-labelledby="tool-title">
      <div className="tool-head">
        <h1 id="tool-title" className="tool-title">
          <span className="tool-title-light">Liens</span> <span className="tool-title-bold">{api.links.length}</span>
        </h1>
      </div>
      <form className="tool-add" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="link-label">
          Nom
        </label>
        <input id="link-label" className="tool-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Nom" autoComplete="off" />
        <label className="visually-hidden" htmlFor="link-url">
          Adresse
        </label>
        <input id="link-url" className="tool-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Adresse (ex. github.com/…)" autoComplete="off" inputMode="url" />
        <button type="submit" className="tool-primary" disabled={!label.trim() || !url.trim()}>
          Ajouter
        </button>
      </form>

      {missing.length > 0 && (
        <div className="link-suggest">
          <span>Ajouter en un clic :</span>
          {missing.map((s) => (
            <button key={s.label} type="button" className="tool-ghost" onClick={() => api.add(s.label, s.url)}>
              + {s.label}
            </button>
          ))}
        </div>
      )}

      {visible.length === 0 ? (
        <p className="tool-empty">Aucun lien. Garde ici tes consoles, ton dépôt, tes réseaux.</p>
      ) : (
        <ul className="links">
          {visible.map((link) => (
            <li key={link.id} className="link">
              <a href={link.url} target="_blank" rel="noreferrer" className="link-open">
                <span className="link-icon" aria-hidden="true">
                  {link.label.charAt(0).toUpperCase()}
                </span>
                <span className="link-text">
                  <span className="link-label">{link.label}</span>
                  <span className="link-host">{host(link.url)}</span>
                </span>
              </a>
              <button type="button" className="tool-remove" onClick={() => api.remove(link.id)} aria-label={`Supprimer le lien ${link.label}`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
