import { useState } from 'react';
import BrandIcon from '../../components/BrandIcon';
import type { Brand } from '../../components/BrandIcon';
import type { Project } from '../../data/types';
import { useStored } from '../../hooks/useStored';
import './Tools.css';

type Service = {
  brand: Brand;
  name: string;
  group: string;
  /** What Marc finds there for this project. */
  gives: string;
  /** Where "Ouvrir" goes when no address is set for the project. */
  url: string;
};

const SERVICES: Service[] = [
  { brand: 'claude', name: 'Claude', group: 'Agents', gives: 'Tes agents et conversations pour ce projet.', url: 'https://claude.ai' },
  { brand: 'gmail', name: 'Gmail', group: 'Mails et agenda', gives: 'Les mails des clubs, partenaires et utilisateurs.', url: 'https://mail.google.com' },
  { brand: 'agenda', name: 'Google Agenda', group: 'Mails et agenda', gives: 'Rendez-vous, appels et soirées.', url: 'https://calendar.google.com' },
  { brand: 'instagram', name: 'Instagram', group: 'Réseaux', gives: 'Le compte du projet, ses posts et ses messages.', url: 'https://www.instagram.com' },
  { brand: 'tiktok', name: 'TikTok', group: 'Réseaux', gives: 'Le compte TikTok et ses vidéos.', url: 'https://www.tiktok.com' },
  { brand: 'meta', name: 'Meta Business', group: 'Réseaux', gives: 'Publicités Facebook et Instagram, messagerie.', url: 'https://business.facebook.com' },
  { brand: 'youtube', name: 'YouTube', group: 'Réseaux', gives: 'La chaîne et ses vidéos.', url: 'https://studio.youtube.com' },
  { brand: 'appstore', name: 'App Store Connect', group: 'App et code', gives: 'Téléchargements, avis, versions et review Apple.', url: 'https://appstoreconnect.apple.com' },
  { brand: 'github', name: 'GitHub', group: 'App et code', gives: 'Le dépôt du code, ses tickets et ses versions.', url: 'https://github.com' },
  { brand: 'supabase', name: 'Supabase', group: 'App et code', gives: 'La base de données de l’app.', url: 'https://supabase.com/dashboard' },
  { brand: 'figma', name: 'Figma', group: 'App et code', gives: 'Les maquettes et le design.', url: 'https://www.figma.com' },
  { brand: 'stripe', name: 'Stripe', group: 'Paiements', gives: 'Paiements, abonnements et chiffre d’affaires.', url: 'https://dashboard.stripe.com' },
];

/** Addresses Marc set for this project, by service (his Instagram account, his repo…). */
type Addresses = Partial<Record<Brand, string>>;

const withScheme = (url: string) => (/^https?:\/\//.test(url) ? url : `https://${url}`);

/**
 * The services a project lives in, with their logo. "Ouvrir" goes to the page in this same tab
 * (back comes back to Marc HQ). Each one can point to the project's own page: its Instagram
 * account, its GitHub repo, its App Store Connect app.
 */
export default function ConnectionsPage({ project, query, onRemoveProject }: {
  project: Project;
  query: (text: string) => boolean;
  /** Only for projects added from the app. */
  onRemoveProject?: () => void;
}) {
  const [addresses, setAddresses] = useStored<Addresses>(`marc-hq:${project.id}:services`, () => ({}));
  const [editing, setEditing] = useState<Brand | null>(null);
  const [draft, setDraft] = useState('');
  const [confirm, setConfirm] = useState(false);
  const visible = SERVICES.filter((s) => query(`${s.name} ${s.group} ${s.gives}`));
  const groups = [...new Set(visible.map((s) => s.group))];
  const own = Object.values(addresses).filter(Boolean).length;

  return (
    <section className="tool" aria-labelledby="tool-title">
      <div className="tool-head">
        <h1 id="tool-title" className="tool-title">
          <span className="tool-title-light">Connexions</span> <span className="tool-title-bold">{SERVICES.length} outils</span>
        </h1>
      </div>
      <p className="conn-intro">
        Ouvre chaque outil en un clic, dans cet onglet. Donne l'adresse propre à {project.name} (son compte, son dépôt, son app) pour arriver directement au bon
        endroit{own > 0 ? ` : ${own} déjà réglée${own > 1 ? 's' : ''}` : ''}.
      </p>

      {groups.map((group) => (
        <div key={group} className="tool-group">
          <h2 className="tool-group-title">{group}</h2>
          <ul className="conns">
            {visible
              .filter((s) => s.group === group)
              .map((s) => {
                const url = addresses[s.brand] || s.url;
                return (
                  <li key={s.brand} className="conn">
                    <div className="conn-head">
                      <span className="conn-icon" aria-hidden="true">
                        <BrandIcon brand={s.brand} size={22} />
                      </span>
                      <span className="conn-name">{s.name}</span>
                    </div>
                    <p className="conn-gives">{s.gives}</p>
                    {editing === s.brand ? (
                      <form
                        className="conn-edit"
                        onSubmit={(event) => {
                          event.preventDefault();
                          setAddresses((prev) => ({ ...prev, [s.brand]: draft.trim() ? withScheme(draft.trim()) : undefined }));
                          setEditing(null);
                        }}
                      >
                        <label className="visually-hidden" htmlFor={`conn-${s.brand}`}>
                          Adresse {s.name} pour {project.name}
                        </label>
                        <input id={`conn-${s.brand}`} className="tool-input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={s.url.replace('https://', '')} autoFocus inputMode="url" />
                        <button type="submit" className="tool-primary tool-primary--small">
                          OK
                        </button>
                      </form>
                    ) : (
                      <p className="conn-url">{url.replace(/^https?:\/\/(www\.)?/, '')}</p>
                    )}
                    <div className="conn-actions">
                      <button
                        type="button"
                        className="tool-ghost"
                        onClick={() => {
                          setDraft(addresses[s.brand] ?? '');
                          setEditing(editing === s.brand ? null : s.brand);
                        }}
                      >
                        {addresses[s.brand] ? 'Changer l’adresse' : 'Adresse du projet'}
                      </button>
                      <a className="conn-open" href={url}>
                        Ouvrir
                      </a>
                    </div>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}

      {onRemoveProject && (
        <div className="conn-danger">
          <div>
            <h2 className="tool-group-title">Supprimer {project.name}</h2>
            <p className="conn-gives">Le projet disparaît de Marc HQ. Ses tâches, notes et idées restent dans ce navigateur si tu le recrées avec le même nom.</p>
          </div>
          {confirm ? (
            <div className="conn-actions">
              <button type="button" className="tool-ghost" onClick={() => setConfirm(false)}>
                Annuler
              </button>
              <button type="button" className="conn-delete" onClick={onRemoveProject}>
                Oui, supprimer
              </button>
            </div>
          ) : (
            <button type="button" className="tool-ghost tool-ghost--danger" onClick={() => setConfirm(true)}>
              Supprimer le projet
            </button>
          )}
        </div>
      )}
    </section>
  );
}
