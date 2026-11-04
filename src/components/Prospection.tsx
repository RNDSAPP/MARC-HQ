import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Project } from '../data/types';
import { handToAgent } from '../lib/agents';
import { isoDate } from '../lib/dates';
import { STAGES, TYPES, handle, isDue, messagesOf, stageChange, stageOf, templates, toCsv, typeOf } from '../lib/prospects';
import type { Stage, TargetType } from '../lib/prospects';
import { removeRecord, saveRecord, useRecords } from '../lib/records';
import type { RecordRow } from '../lib/records';
import './Prospection.css';

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const shortDate = (iso?: string) => (iso ? iso.split('-').reverse().slice(0, 2).join('/') : '');

/** The targets of Club 421: every "bde" record of the project. */
export function useTargets(project: Project) {
  return useRecords().filter((r) => r.project_id === project.id && r.kind === 'bde');
}

/** A die whose pips tell the step: 1 to contact, 2 contacted, 4 talking, 6 partner, a cross for a no. */
function Die({ pips, size = 32 }: { pips: number; size?: number }) {
  const P: Record<string, [number, number]> = { tl: [10, 10], tr: [24, 10], ml: [10, 17], mr: [24, 17], c: [17, 17], bl: [10, 24], br: [24, 24] };
  const map: Record<number, string[]> = { 1: ['c'], 2: ['tl', 'br'], 4: ['tl', 'tr', 'bl', 'br'], 6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'] };
  return (
    <svg className={`pro-die pro-die--${pips}`} width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <rect x="1" y="1" width="32" height="32" rx="9" />
      {pips === 0 ? (
        <path d="M11 11 L23 23 M23 11 L11 23" />
      ) : (
        (map[pips] ?? []).map((k) => <circle key={k} cx={P[k][0]} cy={P[k][1]} r="2.8" />)
      )}
    </svg>
  );
}

/** Where the scene usually is: the targets by kind and by city (contacted, partners). */
export function ProspectionStats({ project }: { project: Project }) {
  const targets = useTargets(project);
  const contacted = (r: RecordRow) => stageOf(r) !== 'À contacter';
  const partner = (r: RecordRow) => stageOf(r) === 'Partenaires';
  const byType = (Object.keys(TYPES) as TargetType[]).map((k) => {
    const all = targets.filter((r) => typeOf(r) === k);
    return { label: TYPES[k], n: all.length, c: all.filter(contacted).length, p: all.filter(partner).length };
  });
  const cities = new Map<string, RecordRow[]>();
  targets.forEach((r) => {
    const city = r.data.city || 'Sans ville';
    cities.set(city, [...(cities.get(city) ?? []), r]);
  });
  const byCity = [...cities.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8)
    .map(([label, all]) => ({ label, n: all.length, c: all.filter(contacted).length, p: all.filter(partner).length }));
  const Bars = ({ rows }: { rows: { label: string; n: number; c: number; p: number }[] }) => {
    const max = Math.max(1, ...rows.map((r) => r.n));
    return (
      <div className="pro-bars">
        {rows.map((r) => (
          <div key={r.label} className="pro-bar" title={`${r.n} cibles, ${r.c} contactées, ${r.p} partenaires`}>
            <span className="pro-bar-label">{r.label}</span>
            <span className="pro-bar-track">
              <span className="pro-bar-all" style={{ width: `${(r.n / max) * 100}%` }} />
              <span className="pro-bar-done" style={{ width: `${(r.c / max) * 100}%` }} />
              <span className="pro-bar-won" style={{ width: `${(r.p / max) * 100}%` }} />
            </span>
            <span className="pro-bar-value">
              {r.c}/{r.n}
            </span>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="pro-stats tool-card">
      <div className="pro-stats-col">
        <h3 className="pro-stats-title">Par type</h3>
        <Bars rows={byType} />
      </div>
      <div className="pro-stats-col">
        <h3 className="pro-stats-title">Par ville</h3>
        {byCity.length ? <Bars rows={byCity} /> : <p className="pro-hint">Les villes apparaîtront ici.</p>}
      </div>
      <p className="pro-legend">
        <span><i className="pro-key pro-key--all" />cibles</span>
        <span><i className="pro-key pro-key--done" />contactées</span>
        <span><i className="pro-key pro-key--won" />partenaires</span>
      </p>
      <p className="pro-hint pro-offer">L’offre : un dé (ou une table) aux couleurs du club, offert dans 421 Club. En échange, un partage de l’app à leurs étudiants, clients ou abonnés.</p>
    </div>
  );
}

type Props = {
  project: Project;
  /** The workspace search, already lowercased without accents. */
  query: string;
  onNotice: (text: string) => void;
  onAddTask: (text: string) => void;
};

/**
 * Prospecting (formerly the « Prospection 421 Club » artifact): the targets with filters, the
 * follow-ups of the day, and for each one its sheet with the DM and the mail ready to copy.
 * Marc sends them himself; a tap on « Contactés » plans the follow-up 5 days later.
 */
export default function Prospection({ project, query, onNotice, onAddTask }: Props) {
  const targets = useTargets(project);
  const [params, setParams] = useSearchParams();
  const opened = params.get('fiche');
  const [type, setType] = useState<TargetType | ''>('');
  const [stage, setStage] = useState<Stage | 'relance' | ''>('');
  const [city, setCity] = useState('');
  const [withMail, setWithMail] = useState(false);
  const [order, setOrder] = useState<'action' | 'recent' | 'nom'>('action');
  const [limit, setLimit] = useState(60);
  const today = isoDate();

  const open = (id: string) => setParams({ fiche: id });
  const close = () => setParams({}, { replace: true });

  // A new filter or search starts the list from the top again
  useEffect(() => setLimit(60), [type, stage, city, withMail, order, query]);

  const cities = useMemo(() => [...new Set(targets.map((r) => r.data.city).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr')), [targets]);
  const rank: Record<Stage, number> = { 'En discussion': 0, 'À contacter': 1, Contactés: 2, Partenaires: 3, Refus: 4 };
  const list = targets
    .filter(
      (r) =>
        (!type || typeOf(r) === type) &&
        (!stage || (stage === 'relance' ? isDue(r, today) : stageOf(r) === stage)) &&
        (!city || r.data.city === city) &&
        (!withMail || !!r.data.email) &&
        (!query || normalize([r.data.name, r.data.school, r.data.city, r.data.instagram, r.data.note, r.data.notes].join(' ')).includes(query)),
    )
    .sort((a, b) => {
      if (order === 'nom') return (a.data.name ?? '').localeCompare(b.data.name ?? '', 'fr');
      if (order === 'recent') return (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at);
      const due = Number(isDue(b, today)) - Number(isDue(a, today));
      if (due) return due;
      const step = rank[stageOf(a)] - rank[stageOf(b)];
      return step || (a.data.name ?? '').localeCompare(b.data.name ?? '', 'fr');
    });

  const dueCount = targets.filter((r) => isDue(r, today)).length;
  const count = (fn: (r: RecordRow) => boolean) => targets.filter(fn).length;

  function exportCsv() {
    const blob = new Blob([toCsv(list)], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `prospection-421-club-${today}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    onNotice(`${list.length} cibles exportées.`);
  }

  return (
    <section className="workspace-list pro" aria-labelledby="pro-title">
      <div className="workspace-section-head">
        <h2 id="pro-title" className="workspace-h2">
          Cibles
        </h2>
        <span className="workspace-meta" aria-live="polite">
          {list.length === targets.length ? `${targets.length} au total` : `${list.length} sur ${targets.length}`}
        </span>
      </div>

      <div className="pro-actions">
        <button type="button" className="tool-primary tool-primary--small" onClick={() => open('new')}>
          + Ajouter une cible
        </button>
        <button type="button" className="tool-ghost pro-ghost" onClick={() => open('find')}>
          Trouver d’autres cibles
        </button>
        <button type="button" className="tool-ghost pro-ghost" onClick={exportCsv} disabled={!list.length}>
          Exporter (Excel)
        </button>
      </div>

      <div className="pro-filters">
        <div className="pro-chips" role="group" aria-label="Type">
          <Chip on={!type} onClick={() => setType('')} label="Tous" n={targets.length} />
          {(Object.keys(TYPES) as TargetType[]).map((k) => (
            <Chip key={k} on={type === k} onClick={() => setType(type === k ? '' : k)} label={TYPES[k]} n={count((r) => typeOf(r) === k)} />
          ))}
          <Chip on={withMail} onClick={() => setWithMail(!withMail)} label="Avec mail" n={count((r) => !!r.data.email)} />
        </div>
        <div className="pro-chips" role="group" aria-label="Étape">
          <Chip on={!stage} onClick={() => setStage('')} label="Toutes les étapes" />
          <Chip on={stage === 'relance'} onClick={() => setStage(stage === 'relance' ? '' : 'relance')} label="À relancer" n={dueCount} hot={dueCount > 0} />
          {STAGES.map((s) => (
            <Chip key={s.name} on={stage === s.name} onClick={() => setStage(stage === s.name ? '' : s.name)} label={s.name} n={count((r) => stageOf(r) === s.name)} />
          ))}
        </div>
        <div className="pro-selects">
          <select className="tool-select pro-select" value={city} onChange={(e) => setCity(e.target.value)} aria-label="Ville">
            <option value="">Toutes les villes</option>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select className="tool-select pro-select" value={order} onChange={(e) => setOrder(e.target.value as typeof order)} aria-label="Ordre">
            <option value="action">À faire d’abord</option>
            <option value="recent">Modifiées récemment</option>
            <option value="nom">Par nom</option>
          </select>
        </div>
      </div>

      {targets.length === 0 ? (
        <p className="tool-empty">Aucune cible pour l’instant. Ajoute un BDE, un bar ou un créateur, ou demande à un agent d’en trouver.</p>
      ) : list.length === 0 ? (
        <p className="tool-empty">Rien avec ces filtres.</p>
      ) : (
        <ul className="pro-list">
          {list.slice(0, limit).map((r) => {
            const s = stageOf(r);
            const pips = STAGES.find((x) => x.name === s)!.pips;
            const due = isDue(r, today);
            const reach = [r.data.instagram && `@${handle(r.data.instagram)}`, r.data.email && 'mail', r.data.followers && `${r.data.followers} abonnés`].filter(Boolean).join(' · ');
            return (
              <li key={r.id}>
                <button type="button" className="pro-item" onClick={() => open(r.id)}>
                  <Die pips={pips} />
                  <span className="pro-who">
                    <span className="pro-name">{r.data.name || 'Sans nom'}</span>
                    <span className="pro-meta">{[TYPES[typeOf(r)], r.data.school, r.data.city].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="pro-side">
                    {due ? (
                      <span className="pro-tag pro-tag--due">{r.data.relance < today ? `Relancer (depuis le ${shortDate(r.data.relance)})` : 'Relancer aujourd’hui'}</span>
                    ) : s === 'Partenaires' ? (
                      <span className="pro-tag pro-tag--won">Partenaire</span>
                    ) : s === 'Refus' ? (
                      <span className="pro-tag pro-tag--no">Refus</span>
                    ) : r.data.relance ? (
                      <span className="pro-tag">Relance le {shortDate(r.data.relance)}</span>
                    ) : (
                      <span className="pro-tag pro-tag--plain">{s}</span>
                    )}
                    {reach && <span className="pro-meta">{reach}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {list.length > limit && (
        <button type="button" className="tool-ghost pro-more" onClick={() => setLimit(limit + 100)}>
          Voir {Math.min(100, list.length - limit)} de plus ({list.length - limit} restantes)
        </button>
      )}

      {opened === 'find' && <FindSheet project={project} onClose={close} onNotice={onNotice} />}
      {opened && opened !== 'find' && (
        <TargetSheet
          key={opened}
          project={project}
          target={opened === 'new' ? null : targets.find((r) => r.id === opened) ?? null}
          isNew={opened === 'new'}
          onClose={close}
          onNotice={onNotice}
          onAddTask={onAddTask}
        />
      )}
    </section>
  );
}

function Chip({ on, onClick, label, n, hot }: { on: boolean; onClick: () => void; label: string; n?: number; hot?: boolean }) {
  return (
    <button type="button" className={`pro-chip${hot ? ' pro-chip--hot' : ''}`} aria-pressed={on} onClick={onClick}>
      {label}
      {n !== undefined && <span className="pro-chip-n">{n}</span>}
    </button>
  );
}

/** A side sheet that closes with Escape or a tap outside. */
function Sheet({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: ReactNode }) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const key = (event: KeyboardEvent) => event.key === 'Escape' && close.current();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  return (
    <div className="pro-sheet-wrap" role="dialog" aria-modal="true" aria-labelledby="pro-sheet-title">
      <button type="button" className="pro-scrim" aria-label="Fermer" onClick={onClose} />
      <div className="pro-sheet">
        <div className="pro-sheet-head">
          <div>
            <h2 id="pro-sheet-title" className="pro-sheet-title">
              {title}
            </h2>
            {sub && <p className="pro-sheet-sub">{sub}</p>}
          </div>
          <button type="button" className="pro-close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

async function copy(text: string, done: string, onNotice: (t: string) => void) {
  try {
    await navigator.clipboard.writeText(text);
    onNotice(done);
  } catch {
    onNotice('Copie impossible ici : sélectionne le texte à la main.');
  }
}

const FIELDS: { key: string; label: string; ph?: string; full?: boolean; type?: string }[] = [
  { key: 'name', label: 'Nom', ph: 'BDE ESSEC', full: true },
  { key: 'city', label: 'Ville', ph: 'Lyon' },
  { key: 'school', label: 'École ou lieu', ph: 'EM Lyon', full: true },
  { key: 'instagram', label: 'Instagram', ph: 'bde_exemple' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'email', label: 'Mail', ph: 'bde@ecole.fr', type: 'email' },
  { key: 'followers', label: 'Abonnés', ph: '4 k' },
  { key: 'site', label: 'Site', ph: 'https://', full: true },
];

/** One target: its step, its follow-up, its links, the DM and the mail, its details and notes. */
function TargetSheet({ project, target, isNew, onClose, onNotice, onAddTask }: {
  project: Project;
  target: RecordRow | null;
  isNew: boolean;
  onClose: () => void;
  onNotice: (t: string) => void;
  onAddTask: (t: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => ({ type: 'bde', ...(target?.data ?? {}) }));
  const [tab, setTab] = useState<'dm' | 'mail'>('dm');
  const msg = target ? messagesOf(target) : null;
  const [dm, setDm] = useState(msg?.dm ?? '');
  const [objet, setObjet] = useState(msg?.objet ?? '');
  const [mail, setMail] = useState(msg?.mail ?? '');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // The target was deleted elsewhere, or the address points to nothing
  if (!isNew && !target) {
    return (
      <Sheet title="Cible introuvable" onClose={onClose}>
        <p className="pro-hint">Cette cible n’existe plus. Elle a peut-être été supprimée.</p>
      </Sheet>
    );
  }

  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  const save = async (data: Record<string, string>, done: string) => {
    if (!target) return;
    setBusy(true);
    const failed = await saveRecord(project.id, 'bde', data, target.id);
    setBusy(false);
    onNotice(failed || done);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, (v ?? '').trim()]));
    if (!clean.name) return;
    clean.instagram = handle(clean.instagram);
    clean.tiktok = handle(clean.tiktok);
    if (isNew) {
      setBusy(true);
      const failed = await saveRecord(project.id, 'bde', { ...clean, stage: 'À contacter' });
      setBusy(false);
      if (failed) return onNotice(failed);
      onNotice(`Ajouté : ${clean.name}. Touche-le dans la liste pour ses messages.`);
      onClose();
    } else if (target) {
      save({ ...target.data, ...clean }, 'Enregistré.');
    }
  }

  async function remove() {
    if (!target) return;
    if (!confirming) return setConfirming(true);
    setBusy(true);
    const failed = await removeRecord(target.id);
    setBusy(false);
    onNotice(failed || `Supprimé : ${target.data.name}.`);
    if (!failed) onClose();
  }

  const ig = handle(target?.data.instagram);
  const tk = handle(target?.data.tiktok);
  const due = target ? isDue(target) : false;
  const sub = target ? [TYPES[typeOf(target)], target.data.school, target.data.city].filter(Boolean).join(' · ') : undefined;

  return (
    <Sheet title={isNew ? 'Nouvelle cible' : target!.data.name || 'Sans nom'} sub={sub} onClose={onClose}>
      {target && (
        <>
          <div className="pro-steps" role="group" aria-label="Étape">
            {STAGES.map((s) => (
              <button
                key={s.name}
                type="button"
                className="pro-step"
                aria-pressed={stageOf(target) === s.name}
                disabled={busy}
                onClick={() => {
                  if (stageOf(target) === s.name) return;
                  const data = stageChange(target, s.name);
                  save(data, `${s.name}${data.relance ? ` · relance le ${shortDate(data.relance)}` : ''}.`);
                }}
              >
                <Die pips={s.pips} size={26} />
                {s.name}
              </button>
            ))}
          </div>
          <div className="pro-row">
            <label className="pro-field pro-field--inline">
              Relance le
              <input
                className="tool-input tool-input--date"
                type="date"
                value={target.data.relance ?? ''}
                onChange={(e) => save({ ...target.data, relance: e.target.value }, e.target.value ? `Relance le ${shortDate(e.target.value)}.` : 'Relance retirée.')}
              />
            </label>
            {target.data.contacted_at && <span className="pro-hint">Contacté le {shortDate(target.data.contacted_at)}</span>}
            {due && (
              <button type="button" className="tool-ghost pro-ghost" onClick={() => onAddTask(`Relancer ${target.data.name}`)}>
                Ajouter à mes tâches
              </button>
            )}
          </div>
          <div className="pro-links">
            {ig && (
              <a className="tool-ghost pro-link" href={`https://instagram.com/${encodeURIComponent(ig)}`} target="_blank" rel="noopener noreferrer">
                Instagram @{ig}
              </a>
            )}
            {tk && (
              <a className="tool-ghost pro-link" href={`https://www.tiktok.com/@${encodeURIComponent(tk)}`} target="_blank" rel="noopener noreferrer">
                TikTok @{tk}
              </a>
            )}
            {target.data.email && (
              <button type="button" className="tool-ghost pro-link" onClick={() => copy(target.data.email, 'Adresse copiée.', onNotice)}>
                Copier {target.data.email}
              </button>
            )}
            {target.data.site && /^https?:/.test(target.data.site) && (
              <a className="tool-ghost pro-link" href={target.data.site} target="_blank" rel="noopener noreferrer">
                Site
              </a>
            )}
            {target.data.source && /^https?:/.test(target.data.source) && target.data.source !== target.data.site && (
              <a className="tool-ghost pro-link" href={target.data.source} target="_blank" rel="noopener noreferrer">
                Source
              </a>
            )}
            {target.data.source_contact && /^https?:/.test(target.data.source_contact) && target.data.source_contact !== target.data.source && (
              <a className="tool-ghost pro-link" href={target.data.source_contact} target="_blank" rel="noopener noreferrer">
                Où le mail a été trouvé
              </a>
            )}
          </div>

          <div className="pro-panel">
            <div className="pro-row pro-row--between">
              <h3 className="pro-panel-title">Message</h3>
              <div className="tool-segment" role="group" aria-label="Message">
                <button type="button" aria-pressed={tab === 'dm'} onClick={() => setTab('dm')}>
                  DM
                </button>
                <button type="button" aria-pressed={tab === 'mail'} onClick={() => setTab('mail')}>
                  Mail
                </button>
              </div>
            </div>
            {tab === 'dm' ? (
              <>
                <textarea className="pro-text" value={dm} onChange={(e) => setDm(e.target.value)} aria-label="Message privé" />
                <div className="pro-row">
                  <button type="button" className="tool-primary tool-primary--small" onClick={() => copy(dm, 'DM copié.', onNotice)}>
                    Copier le DM
                  </button>
                  {ig && (
                    <a className="tool-ghost pro-link" href={`https://ig.me/m/${encodeURIComponent(ig)}`} target="_blank" rel="noopener noreferrer">
                      Ouvrir la conversation
                    </a>
                  )}
                </div>
              </>
            ) : (
              <>
                <input className="tool-input pro-subject" value={objet} onChange={(e) => setObjet(e.target.value)} aria-label="Objet" />
                <textarea className="pro-text" value={mail} onChange={(e) => setMail(e.target.value)} aria-label="Mail" />
                <div className="pro-row">
                  <button type="button" className="tool-primary tool-primary--small" onClick={() => copy(mail, 'Mail copié.', onNotice)}>
                    Copier le mail
                  </button>
                  <button type="button" className="tool-ghost pro-ghost" onClick={() => copy(objet, 'Objet copié.', onNotice)}>
                    Copier l’objet
                  </button>
                </div>
              </>
            )}
            <div className="pro-row">
              <button type="button" className="tool-ghost pro-ghost" disabled={busy} onClick={() => save({ ...target.data, msg_dm: dm, msg_objet: objet, msg_mail: mail }, 'Texte gardé pour cette cible.')}>
                Garder ce texte
              </button>
              {msg?.own && (
                <button
                  type="button"
                  className="tool-ghost pro-ghost"
                  disabled={busy}
                  onClick={() => {
                    const rest = Object.fromEntries(Object.entries(target.data).filter(([k]) => !k.startsWith('msg_')));
                    const t = templates(target);
                    setDm(t.dm);
                    setObjet(t.objet);
                    setMail(t.mail);
                    save(rest, 'Modèle remis.');
                  }}
                >
                  Revenir au modèle
                </button>
              )}
            </div>
            <p className="pro-hint">Tu copies, tu envoies toi-même, puis tu touches « Contactés » : la relance est prévue 5 jours après.</p>
          </div>
        </>
      )}

      <form className="pro-panel" onSubmit={submit}>
        <h3 className="pro-panel-title">{isNew ? 'Infos' : 'Infos et notes'}</h3>
        <div className="pro-fields">
          <label className="pro-field">
            Type
            <select className="tool-select pro-input" value={values.type ?? 'bde'} onChange={(e) => set('type', e.target.value)}>
              {(Object.keys(TYPES) as TargetType[]).map((k) => (
                <option key={k} value={k}>
                  {TYPES[k]}
                </option>
              ))}
            </select>
          </label>
          {FIELDS.map((f) => (
            <label key={f.key} className={`pro-field${f.full ? ' pro-field--full' : ''}`}>
              {f.label}
              <input className="pro-input" type={f.type ?? 'text'} value={values[f.key] ?? ''} placeholder={f.ph} onChange={(e) => set(f.key, e.target.value)} required={f.key === 'name'} />
            </label>
          ))}
          <label className="pro-field pro-field--full">
            Ce qu’on sait d’eux
            <textarea className="pro-input pro-area" value={values.note ?? ''} placeholder="Gala en mars, soirées tous les jeudis…" onChange={(e) => set('note', e.target.value)} />
          </label>
          {!isNew && (
            <label className="pro-field pro-field--full">
              Mes notes
              <textarea className="pro-input pro-area" value={values.notes ?? ''} placeholder="Réponse de Léa, veut le dé en violet…" onChange={(e) => set('notes', e.target.value)} />
            </label>
          )}
        </div>
        <div className="pro-row pro-row--between">
          {target ? (
            <button type="button" className="tool-ghost tool-ghost--danger" onClick={remove} disabled={busy}>
              {confirming ? 'Confirmer la suppression' : 'Supprimer'}
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="tool-primary tool-primary--small" disabled={busy || !values.name?.trim()}>
            {busy ? '…' : isNew ? 'Ajouter' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}

/** « Trouver d'autres cibles »: a request handed to the Club 421 agent, who searches the web and adds them. */
function FindSheet({ project, onClose, onNotice }: { project: Project; onClose: () => void; onNotice: (t: string) => void }) {
  const [what, setWhat] = useState('BDE et BDS');
  const [n, setN] = useState('20');
  const [where, setWhere] = useState('');
  const [busy, setBusy] = useState(false);
  const text = `Trouve ${n} ${what}${where.trim() ? ` à ${where.trim()}` : ' en France'} pour la prospection de 421 Club, avec leur Instagram et leur mail public vérifiés sur une vraie page, et ajoute-les à la Prospection de Marc HQ (sans doublons).`;
  async function send() {
    setBusy(true);
    const failed = await handToAgent(project.id, text);
    setBusy(false);
    onNotice(failed || 'Demande confiée aux agents : elle apparaît sous les agents jusqu’à ce qu’un agent la termine.');
    if (!failed) onClose();
  }
  return (
    <Sheet title="Trouver d’autres cibles" sub="Un agent Claude cherche sur le web et ajoute les cibles à cette liste." onClose={onClose}>
      <div className="pro-panel">
        <div className="pro-fields">
          <label className="pro-field">
            Quoi
            <select className="tool-select pro-input" value={what} onChange={(e) => setWhat(e.target.value)}>
              <option value="BDE et BDS">BDE et BDS</option>
              <option value="associations étudiantes festives">Assos étudiantes</option>
              <option value="bars étudiants et bars à jeux">Bars</option>
              <option value="créateurs Instagram et TikTok sur la vie étudiante">Créateurs</option>
            </select>
          </label>
          <label className="pro-field">
            Combien
            <select className="tool-select pro-input" value={n} onChange={(e) => setN(e.target.value)}>
              <option>10</option>
              <option>20</option>
              <option>40</option>
            </select>
          </label>
          <label className="pro-field pro-field--full">
            Où
            <input className="pro-input" value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Lille, ou une école : KEDGE, INSA…" />
          </label>
        </div>
        <p className="pro-request">{text}</p>
        <div className="pro-row">
          <button type="button" className="tool-primary tool-primary--small" onClick={send} disabled={busy}>
            {busy ? '…' : 'Confier à l’agent'}
          </button>
          <button type="button" className="tool-ghost pro-ghost" onClick={() => copy(text, 'Demande copiée.', onNotice)}>
            Copier la demande
          </button>
        </div>
        <p className="pro-hint">La demande part dans Marc HQ : l’agent Club 421 la prend à sa prochaine session, vérifie chaque contact et ne remet pas les cibles déjà là.</p>
      </div>
    </Sheet>
  );
}
