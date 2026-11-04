import { useEffect, useState } from 'react';
import AccountGate, { here } from '../../components/AccountGate';
import BrandIcon from '../../components/BrandIcon';
import type { Brand } from '../../components/BrandIcon';
import type { Project } from '../../data/types';
import { useSynced } from '../../hooks/useSynced';
import type { useCalendarSync } from '../../lib/calendar';
import { supabase } from '../../lib/supabase';
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
export default function ConnectionsPage({ project, calendar, query, onRemoveProject }: {
  project: Project;
  calendar: ReturnType<typeof useCalendarSync>;
  query: (text: string) => boolean;
  /** Only for projects added from the app. */
  onRemoveProject?: () => void;
}) {
  const [addresses, setAddresses] = useSynced<Addresses>(`marc-hq:${project.id}:services`, () => ({}));
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
      <AgendaCard project={project} calendar={calendar} />

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
            <p className="conn-gives">Le projet disparaît de Marc HQ. Ses tâches, notes et idées restent enregistrées : elles reviennent si tu le recrées avec le même nom.</p>
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

const RETURNS: Record<string, string> = {
  ok: 'Google Agenda est relié.',
  annule: 'Liaison annulée.',
  erreur: 'Google n’a pas pu relier l’agenda. Réessaie.',
};

/**
 * Google Agenda, at the top of Connexions: sign in to Marc HQ, link Google Calendar once, then
 * the project's own calendar ("RNDS", "Club 421") follows its dated tasks, soirées and meetings.
 */
function AgendaCard({ project, calendar }: { project: Project; calendar: ReturnType<typeof useCalendarSync> }) {
  const { session, email, status, busy, events, sync, reload } = calendar;
  const [message, setMessage] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get('google');
    if (result) {
      setMessage(RETURNS[result] ?? '');
      window.history.replaceState(null, '', here());
      reload();
    }
  }, [reload]);

  if (!supabase || session === undefined || (session && email === undefined)) return null;
  const icon = <BrandIcon brand="agenda" size={26} />;
  if (!session) {
    return (
      <AccountGate
        icon={icon}
        title="Google Agenda"
        text={`Connecte-toi à Marc HQ pour que les tâches datées, les soirées et les rendez-vous de ${project.name} arrivent dans ton Google Agenda.`}
      />
    );
  }

  async function link() {
    if (!supabase) return;
    setLinking(true);
    const { data, error } = await supabase.functions.invoke('calendar-connect', { body: { return_to: here() } });
    if (error || !data?.url) {
      setLinking(false);
      setMessage('Google Agenda ne peut pas encore être relié : l’identifiant Google n’est pas réglé.');
      return;
    }
    window.location.href = data.url as string;
  }

  async function unlink() {
    if (!supabase) return;
    await supabase.from('calendar_connections').delete().not('user_id', 'is', null);
    reload();
    setMessage('Google Agenda est délié. Les agendas déjà créés restent dans Google, tu peux les supprimer là-bas.');
  }

  const time = status ? new Date(status.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '';
  return (
    <div className="tool-card agenda">
      <div className="agenda-head">
        <span className="mail-gate-icon" aria-hidden="true">
          {icon}
        </span>
        <div className="agenda-text">
          <h2 className="mail-gate-title">Google Agenda</h2>
          <p className="mail-gate-text">
            {email
              ? `Relié à ${email} · agenda « ${project.name} » · ${events.length} événement${events.length > 1 ? 's' : ''}`
              : `Marc HQ crée un agenda « ${project.name} » dans ton Google Agenda et y met les tâches datées, les soirées et les rendez-vous. Il ne touche à aucun de tes autres agendas.`}
          </p>
          {email && status && (
            <p className={`agenda-status${status.error ? ' agenda-status--error' : ''}`}>
              {status.error
                ? status.error
                : `Synchronisé à ${time} · ${status.created} ajouté${status.created > 1 ? 's' : ''}, ${status.changed} modifié${status.changed > 1 ? 's' : ''}, ${status.removed} retiré${status.removed > 1 ? 's' : ''}`}
            </p>
          )}
        </div>
      </div>
      <div className="agenda-actions">
        {email ? (
          <>
            <button type="button" className="tool-primary tool-primary--small" onClick={sync} disabled={busy}>
              {busy ? 'Synchronisation…' : 'Synchroniser'}
            </button>
            <a className="tool-ghost mail-open" href={`https://calendar.google.com/calendar/u/${email}/r`}>
              Ouvrir Google Agenda
            </a>
            <button type="button" className="tool-ghost" onClick={unlink}>
              Délier
            </button>
          </>
        ) : (
          <button type="button" className="tool-primary tool-primary--small" onClick={link} disabled={linking}>
            Relier Google Agenda
          </button>
        )}
      </div>
      {message && (
        <p className="mail-message" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
