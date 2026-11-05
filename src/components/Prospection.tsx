import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Project } from '../data/types';
import { handToAgent } from '../lib/agents';
import { isoDate } from '../lib/dates';
import { LANGS, SPORTS, contactedStage, handle, isDue, messagesOf, parseHandles, refusedStage, specOf, stageChange, stageOf, toCsv, typeOf } from '../lib/prospects';
import type { ProspectSpec } from '../lib/prospects';
import { addRecords, removeRecord, saveRecord, useRecords } from '../lib/records';
import type { RecordRow } from '../lib/records';
import './Prospection.css';

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const shortDate = (iso?: string) => (iso ? iso.split('-').reverse().slice(0, 2).join('/') : '');
const validEmail = (e?: string) => /^[^\s@<>()"]+@[^\s@<>()"]+\.[a-z]{2,}$/i.test(e ?? '');
const mailto = (email: string, subject: string, body: string) => `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
const igDm = (ig: string) => `https://ig.me/m/${encodeURIComponent(ig)}`;

/** The targets of a project's prospecting: every record of its kind. */
export function useTargets(project: Project) {
  const spec = specOf(project.id);
  return useRecords().filter((r) => r.project_id === project.id && !!spec && r.kind === spec.kind);
}

/** Sent today (first message or follow-up): the counter of the day. */
const sentToday = (list: RecordRow[], today: string) => list.filter((r) => r.data.contacted_at === today || r.data.relanced_at === today).length;

/** A die whose pips tell the step (Club 421): 1 to contact, 2 contacted, 4 talking, 6 partner, a cross for a no. */
function Die({ pips, size = 32 }: { pips: number; size?: number }) {
  const P: Record<string, [number, number]> = { tl: [10, 10], tr: [24, 10], ml: [10, 17], mr: [24, 17], c: [17, 17], bl: [10, 24], br: [24, 24] };
  const map: Record<number, string[]> = { 1: ['c'], 2: ['tl', 'br'], 4: ['tl', 'tr', 'bl', 'br'], 6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'] };
  return (
    <svg className={`pro-die pro-die--${pips}`} width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <rect x="1" y="1" width="32" height="32" rx="9" />
      {pips === 0 ? <path d="M11 11 L23 23 M23 11 L11 23" /> : (map[pips] ?? []).map((k) => <circle key={k} cx={P[k][0]} cy={P[k][1]} r="2.8" />)}
    </svg>
  );
}

/** A round counter (RNDS): one bar lit per step, four lit for a sign-up, a cross for a no. */
function Rounds({ pips, size = 32 }: { pips: number; size?: number }) {
  return (
    <svg className={`pro-rounds pro-rounds--${pips}`} width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
      <rect className="pro-rounds-frame" x="1" y="1" width="32" height="32" rx="9" />
      {pips === 0 ? (
        <path d="M11 11 L23 23 M23 11 L11 23" />
      ) : (
        [0, 1, 2, 3].map((i) => <rect key={i} className={`pro-rounds-bar${i < pips ? ' is-on' : ''}`} x={8.5 + i * 4.75} y={10} width="2.6" height="14" rx="1.3" />)
      )}
    </svg>
  );
}

function Marker({ spec, pips, size }: { spec: ProspectSpec; pips: number; size?: number }) {
  return spec.marker === 'rounds' ? <Rounds pips={pips} size={size} /> : <Die pips={pips} size={size} />;
}

/** In place of the scene: the targets by two groups (type and city, or sport and country). */
export function ProspectionStats({ project }: { project: Project }) {
  const spec = specOf(project.id);
  const targets = useTargets(project);
  if (!spec) return null;
  const contacted = (r: RecordRow) => stageOf(spec, r) !== spec.stages[0].name;
  const won = (r: RecordRow) => stageOf(spec, r) === spec.won;
  const groups = spec.stats.map((group) => {
    const map = new Map<string, RecordRow[]>();
    targets.forEach((r) => {
      const key = group.of(r);
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    const rows = [...map.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 8)
      .map(([label, all]) => ({ label, n: all.length, c: all.filter(contacted).length, p: all.filter(won).length }));
    return { title: group.title, rows };
  });
  const Bars = ({ rows }: { rows: { label: string; n: number; c: number; p: number }[] }) => {
    const max = Math.max(1, ...rows.map((r) => r.n));
    return (
      <div className="pro-bars">
        {rows.map((r) => (
          <div key={r.label} className="pro-bar" title={`${r.n} ${spec.legend[0]}, ${r.c} ${spec.legend[1]}, ${r.p} ${spec.legend[2]}`}>
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
      {groups.map((g) => (
        <div key={g.title} className="pro-stats-col">
          <h3 className="pro-stats-title">{g.title}</h3>
          {g.rows.length ? <Bars rows={g.rows} /> : <p className="pro-hint">Ça apparaîtra ici avec les premiers {spec.many}.</p>}
        </div>
      ))}
      <p className="pro-legend">
        <span><i className="pro-key pro-key--all" />{spec.legend[0]}</span>
        <span><i className="pro-key pro-key--done" />{spec.legend[1]}</span>
        <span><i className="pro-key pro-key--won" />{spec.legend[2]}</span>
      </p>
      <p className="pro-hint pro-offer">{spec.offer}</p>
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
 * Prospecting: the targets with filters, the follow-ups of the day, and for each one its sheet
 * with the DM and the mail ready to copy. Marc sends them himself (one by one, or « à la chaîne »);
 * once sent, the follow-up is planned a few days later.
 */
export default function Prospection({ project, query, onNotice, onAddTask }: Props) {
  const spec = specOf(project.id)!;
  const targets = useTargets(project);
  const [params, setParams] = useSearchParams();
  const opened = params.get('fiche');
  const [type, setType] = useState('');
  const [stage, setStage] = useState('');
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [withMail, setWithMail] = useState(false);
  const [order, setOrder] = useState<'action' | 'recent' | 'nom'>('action');
  const [limit, setLimit] = useState(60);
  const [chain, setChain] = useState<{ ids: string[]; mode: 'first' | 'relance' } | null>(null);
  const today = isoDate();

  const open = (id: string) => setParams({ fiche: id });
  const close = () => setParams({}, { replace: true });

  // A new filter or search starts the list from the top again
  useEffect(() => setLimit(60), [type, stage, picks, withMail, order, query]);

  const options = useMemo(
    () => Object.fromEntries(spec.selects.map((s) => [s.key, [...new Set(targets.map((r) => r.data[s.key]).filter(Boolean))].sort((a, b) => (s.label ? s.label(a) : a).localeCompare(s.label ? s.label(b) : b, 'fr'))])),
    [targets, spec],
  );
  const rank = Object.fromEntries([spec.stages[2].name, spec.stages[0].name, spec.stages[1].name, spec.stages[3].name, spec.stages[4].name].map((name, i) => [name, i]));
  const list = targets
    .filter(
      (r) =>
        (!type || typeOf(spec, r) === type) &&
        (!stage || (stage === 'relance' ? isDue(spec, r, today) : stageOf(spec, r) === stage)) &&
        spec.selects.every((s) => !picks[s.key] || r.data[s.key] === picks[s.key]) &&
        (!withMail || !!r.data.email) &&
        (!query || normalize(spec.searchKeys.map((k) => r.data[k] ?? '').join(' ')).includes(query)),
    )
    .sort((a, b) => {
      if (order === 'nom') return (a.data.name ?? '').localeCompare(b.data.name ?? '', 'fr');
      if (order === 'recent') return (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at);
      const due = Number(isDue(spec, b, today)) - Number(isDue(spec, a, today));
      if (due) return due;
      const step = rank[stageOf(spec, a)] - rank[stageOf(spec, b)];
      return step || (a.data.name ?? '').localeCompare(b.data.name ?? '', 'fr');
    });

  const dueCount = targets.filter((r) => isDue(spec, r, today)).length;
  const count = (fn: (r: RecordRow) => boolean) => targets.filter(fn).length;
  const sent = sentToday(targets, today);
  // « Envoyer à la chaîne »: the follow-ups when that filter is on (and the project has a text), else the targets to contact
  const relanceMode = stage === 'relance' && !!spec.relance;
  const queue = list.filter((r) => (relanceMode ? isDue(spec, r, today) : stageOf(spec, r) === spec.stages[0].name)).map((r) => r.id);

  function exportCsv() {
    const blob = new Blob([toCsv(spec, list)], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${spec.csv.name}-${today}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    onNotice(`${list.length} ${spec.many} exportés.`);
  }

  return (
    <section className="workspace-list pro" aria-labelledby="pro-title">
      <div className="workspace-section-head">
        <h2 id="pro-title" className="workspace-h2">
          {spec.many.charAt(0).toUpperCase() + spec.many.slice(1)}
        </h2>
        <span className="workspace-meta" aria-live="polite">
          {list.length === targets.length ? `${targets.length} au total` : `${list.length} sur ${targets.length}`}
        </span>
      </div>

      <div className="pro-actions">
        <button type="button" className="tool-primary tool-primary--small" onClick={() => setChain({ ids: queue, mode: relanceMode ? 'relance' : 'first' })} disabled={!queue.length}>
          {relanceMode ? `Relancer à la chaîne (${queue.length})` : `Envoyer à la chaîne${queue.length ? ` (${queue.length})` : ''}`}
        </button>
        <button type="button" className="tool-ghost pro-ghost" onClick={() => open(spec.bulk ? 'ajout' : 'new')}>
          {spec.bulk ? '+ Ajouter des profils' : '+ Ajouter une cible'}
        </button>
        {spec.bulk && (
          <button type="button" className="tool-ghost pro-ghost" onClick={() => open('new')}>
            + Un profil détaillé
          </button>
        )}
        <button type="button" className="tool-ghost pro-ghost" onClick={() => open('find')}>
          Trouver d’autres {spec.many}
        </button>
        <button type="button" className="tool-ghost pro-ghost" onClick={exportCsv} disabled={!list.length}>
          Exporter (Excel)
        </button>
        <span className={`pro-today${sent >= spec.dailyGoal ? ' is-full' : ''}`} title="Premiers messages et relances envoyés aujourd’hui">
          <b>{sent}</b>/{spec.dailyGoal} aujourd’hui
        </span>
      </div>

      <div className="pro-filters">
        <div className="pro-chips" role="group" aria-label="Type">
          <Chip on={!type} onClick={() => setType('')} label="Tous" n={targets.length} />
          {Object.keys(spec.types).map((k) => (
            <Chip key={k} on={type === k} onClick={() => setType(type === k ? '' : k)} label={spec.types[k]} n={count((r) => typeOf(spec, r) === k)} />
          ))}
          <Chip on={withMail} onClick={() => setWithMail(!withMail)} label="Avec mail" n={count((r) => !!r.data.email)} />
        </div>
        <div className="pro-chips" role="group" aria-label="Étape">
          <Chip on={!stage} onClick={() => setStage('')} label="Toutes les étapes" />
          <Chip on={stage === 'relance'} onClick={() => setStage(stage === 'relance' ? '' : 'relance')} label="À relancer" n={dueCount} hot={dueCount > 0} />
          {spec.stages.map((s) => (
            <Chip key={s.name} on={stage === s.name} onClick={() => setStage(stage === s.name ? '' : s.name)} label={s.name} n={count((r) => stageOf(spec, r) === s.name)} />
          ))}
        </div>
        <div className="pro-selects">
          {spec.selects.map((s) => (
            <select key={s.key} className="tool-select pro-select" value={picks[s.key] ?? ''} onChange={(e) => setPicks({ ...picks, [s.key]: e.target.value })} aria-label={s.all}>
              <option value="">{s.all}</option>
              {(options[s.key] ?? []).map((v) => (
                <option key={v} value={v}>
                  {s.label ? s.label(v) : v}
                </option>
              ))}
            </select>
          ))}
          <select className="tool-select pro-select" value={order} onChange={(e) => setOrder(e.target.value as typeof order)} aria-label="Ordre">
            <option value="action">À faire d’abord</option>
            <option value="recent">Modifiés récemment</option>
            <option value="nom">Par nom</option>
          </select>
        </div>
      </div>

      {targets.length === 0 ? (
        <p className="tool-empty">{spec.empty}</p>
      ) : list.length === 0 ? (
        <p className="tool-empty">Rien avec ces filtres.</p>
      ) : (
        <ul className="pro-list">
          {list.slice(0, limit).map((r) => {
            const s = stageOf(spec, r);
            const pips = spec.stages.find((x) => x.name === s)!.pips;
            const due = isDue(spec, r, today);
            const where = spec.project === 'rnds' ? [r.data.discipline, r.data.city, r.data.country] : [r.data.school, r.data.city];
            const reach = [r.data.instagram && `@${handle(r.data.instagram)}`, r.data.email && 'mail', spec.project === 'rnds' && r.data.lang && r.data.lang !== 'fr' && LANGS[r.data.lang], r.data.followers && `${r.data.followers} abonnés`]
              .filter(Boolean)
              .join(' · ');
            return (
              <li key={r.id}>
                <button type="button" className="pro-item" onClick={() => open(r.id)}>
                  <Marker spec={spec} pips={pips} />
                  <span className="pro-who">
                    <span className="pro-name">{r.data.name || 'Sans nom'}</span>
                    <span className="pro-meta">{[spec.types[typeOf(spec, r)], ...where].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="pro-side">
                    {due ? (
                      <span className="pro-tag pro-tag--due">{r.data.relance < today ? `Relancer (depuis le ${shortDate(r.data.relance)})` : 'Relancer aujourd’hui'}</span>
                    ) : s === spec.won ? (
                      <span className="pro-tag pro-tag--won">{spec.won}</span>
                    ) : s === refusedStage(spec) ? (
                      <span className="pro-tag pro-tag--no">{s}</span>
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
          Voir {Math.min(100, list.length - limit)} de plus ({list.length - limit} restants)
        </button>
      )}

      {opened === 'find' && <FindSheet spec={spec} project={project} onClose={close} onNotice={onNotice} />}
      {opened === 'ajout' && spec.bulk && <BulkSheet spec={spec} project={project} targets={targets} onClose={close} onNotice={onNotice} />}
      {opened && opened !== 'find' && opened !== 'ajout' && (
        <TargetSheet
          key={opened}
          spec={spec}
          project={project}
          target={opened === 'new' ? null : targets.find((r) => r.id === opened) ?? null}
          isNew={opened === 'new'}
          onClose={close}
          onNotice={onNotice}
          onAddTask={onAddTask}
        />
      )}
      {chain && <ChainSheet spec={spec} project={project} targets={targets} ids={chain.ids} mode={chain.mode} onClose={() => setChain(null)} onNotice={onNotice} />}
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

const subOf = (spec: ProspectSpec, r: RecordRow) =>
  [spec.types[typeOf(spec, r)], ...(spec.project === 'rnds' ? [r.data.discipline, r.data.city, r.data.country] : [r.data.school, r.data.city])].filter(Boolean).join(' · ');

/** One target: its step, its follow-up, its links, the DM and the mail, its details and notes. */
function TargetSheet({ spec, project, target, isNew, onClose, onNotice, onAddTask }: {
  spec: ProspectSpec;
  project: Project;
  target: RecordRow | null;
  isNew: boolean;
  onClose: () => void;
  onNotice: (t: string) => void;
  onAddTask: (t: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => ({ type: spec.defaultType, ...(spec.project === 'rnds' ? { lang: 'fr' } : {}), ...(target?.data ?? {}) }));
  const msg = target ? messagesOf(spec, target) : null;
  const canRelance = !!(target && spec.relance && [contactedStage(spec), spec.stages[2].name].includes(stageOf(spec, target)));
  const [tab, setTab] = useState<'dm' | 'mail' | 'relance'>(() => (target && isDue(spec, target) && spec.relance ? 'relance' : target && !target.data.instagram && target.data.email ? 'mail' : 'dm'));
  const [dm, setDm] = useState(msg?.dm ?? '');
  const [objet, setObjet] = useState(msg?.objet ?? '');
  const [mail, setMail] = useState(msg?.mail ?? '');
  const relanceChannel: 'dm' | 'mail' = target?.data.channel === 'mail' || (target && !target.data.instagram) ? 'mail' : 'dm';
  const [relance, setRelance] = useState(() => (target && spec.relance ? spec.relance(target, relanceChannel) : ''));
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // The target was deleted elsewhere, or the address points to nothing
  if (!isNew && !target) {
    return (
      <Sheet title="Introuvable" onClose={onClose}>
        <p className="pro-hint">Cette fiche n’existe plus. Elle a peut-être été supprimée.</p>
      </Sheet>
    );
  }

  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));
  const save = async (data: Record<string, string>, done: string) => {
    if (!target) return;
    setBusy(true);
    const failed = await saveRecord(project.id, spec.kind, data, target.id);
    setBusy(false);
    onNotice(failed || done);
  };
  /** « C'est envoyé »: contacted by DM or by mail, the edited text kept. */
  const markSent = (channel: 'dm' | 'mail') => {
    if (!target) return;
    const t = spec.templates(target);
    const data: Record<string, string> = { ...stageChange(spec, target, contactedStage(spec)), channel };
    if (channel === 'dm' && dm !== t.dm) data.msg_dm = dm;
    if (channel === 'mail' && (mail !== t.mail || objet !== t.objet)) Object.assign(data, { msg_mail: mail, msg_objet: objet });
    save(data, `${contactedStage(spec)}${data.relance ? ` · relance le ${shortDate(data.relance)}` : ''}.`);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, (v ?? '').trim()]));
    if (!clean.name) return;
    clean.instagram = handle(clean.instagram);
    if ('tiktok' in clean) clean.tiktok = handle(clean.tiktok);
    if (clean.country) clean.country = clean.country.toUpperCase();
    if (isNew) {
      setBusy(true);
      const failed = await saveRecord(project.id, spec.kind, { ...clean, stage: spec.stages[0].name });
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
  const email = target?.data.email ?? '';
  const due = target ? isDue(spec, target) : false;

  return (
    <Sheet title={isNew ? (spec.bulk ? 'Nouveau profil' : 'Nouvelle cible') : target!.data.name || 'Sans nom'} sub={target ? subOf(spec, target) : undefined} onClose={onClose}>
      {target && (
        <>
          <div className="pro-steps" role="group" aria-label="Étape">
            {spec.stages.map((s) => (
              <button
                key={s.name}
                type="button"
                className="pro-step"
                aria-pressed={stageOf(spec, target) === s.name}
                disabled={busy}
                onClick={() => {
                  if (stageOf(spec, target) === s.name) return;
                  const data = stageChange(spec, target, s.name);
                  save(data, `${s.name}${data.relance ? ` · relance le ${shortDate(data.relance)}` : ''}.`);
                }}
              >
                <Marker spec={spec} pips={s.pips} size={26} />
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
            {target.data.contacted_at && (
              <span className="pro-hint">
                Contacté le {shortDate(target.data.contacted_at)}
                {target.data.channel === 'mail' ? ' par mail' : target.data.channel === 'dm' ? ' sur Instagram' : ''}
                {target.data.relanced_at ? `, relancé le ${shortDate(target.data.relanced_at)}` : ''}
              </span>
            )}
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
            {email && (
              <button type="button" className="tool-ghost pro-link" onClick={() => copy(email, 'Adresse copiée.', onNotice)}>
                Copier {email}
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
              <h3 className="pro-panel-title">Message{target.data.lang && target.data.lang !== 'fr' && LANGS[target.data.lang] ? ` · ${LANGS[target.data.lang].toLowerCase()}` : ''}</h3>
              <div className="tool-segment" role="group" aria-label="Message">
                <button type="button" aria-pressed={tab === 'dm'} onClick={() => setTab('dm')}>
                  DM
                </button>
                <button type="button" aria-pressed={tab === 'mail'} onClick={() => setTab('mail')}>
                  Mail
                </button>
                {canRelance && (
                  <button type="button" aria-pressed={tab === 'relance'} onClick={() => setTab('relance')}>
                    Relance
                  </button>
                )}
              </div>
            </div>
            {tab === 'dm' ? (
              <>
                <textarea className="pro-text" value={dm} onChange={(e) => setDm(e.target.value)} aria-label="Message privé" />
                <div className="pro-row">
                  {ig ? (
                    <a className="tool-primary tool-primary--small pro-link" href={igDm(ig)} target="_blank" rel="noopener noreferrer" onClick={() => copy(dm, 'DM copié : colle-le dans Instagram.', onNotice)}>
                      Copier et ouvrir Instagram
                    </a>
                  ) : (
                    <button type="button" className="tool-primary tool-primary--small" onClick={() => copy(dm, 'DM copié.', onNotice)}>
                      Copier le DM
                    </button>
                  )}
                  {stageOf(spec, target) === spec.stages[0].name && (
                    <button type="button" className="tool-ghost pro-ghost" disabled={busy} onClick={() => markSent('dm')}>
                      C’est envoyé
                    </button>
                  )}
                </div>
              </>
            ) : tab === 'mail' ? (
              <>
                {!email && <p className="pro-hint">Pas encore d’adresse : ajoute-la dans les infos plus bas.</p>}
                <input className="tool-input pro-subject" value={objet} onChange={(e) => setObjet(e.target.value)} aria-label="Objet" />
                <textarea className="pro-text pro-text--mail" value={mail} onChange={(e) => setMail(e.target.value)} aria-label="Mail" />
                <div className="pro-row">
                  {validEmail(email) && (
                    <a className="tool-primary tool-primary--small pro-link" href={mailto(email, objet, mail)}>
                      Ouvrir dans Mail
                    </a>
                  )}
                  <button type="button" className={validEmail(email) ? 'tool-ghost pro-ghost' : 'tool-primary tool-primary--small'} onClick={() => copy(mail, 'Mail copié.', onNotice)}>
                    Copier le mail
                  </button>
                  <button type="button" className="tool-ghost pro-ghost" onClick={() => copy(objet, 'Objet copié.', onNotice)}>
                    Copier l’objet
                  </button>
                  {stageOf(spec, target) === spec.stages[0].name && email && (
                    <button type="button" className="tool-ghost pro-ghost" disabled={busy} onClick={() => markSent('mail')}>
                      Mail envoyé
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <textarea className={`pro-text${relanceChannel === 'mail' ? ' pro-text--mail' : ''}`} value={relance} onChange={(e) => setRelance(e.target.value)} aria-label="Relance" />
                <div className="pro-row">
                  {relanceChannel === 'dm' && ig ? (
                    <a className="tool-primary tool-primary--small pro-link" href={igDm(ig)} target="_blank" rel="noopener noreferrer" onClick={() => copy(relance, 'Relance copiée : colle-la dans Instagram.', onNotice)}>
                      Copier et ouvrir Instagram
                    </a>
                  ) : validEmail(email) ? (
                    <a className="tool-primary tool-primary--small pro-link" href={mailto(email, `Re: ${objet}`, relance)}>
                      Ouvrir dans Mail
                    </a>
                  ) : null}
                  <button type="button" className="tool-ghost pro-ghost" onClick={() => copy(relance, 'Relance copiée.', onNotice)}>
                    Copier la relance
                  </button>
                  <button type="button" className="tool-ghost pro-ghost" disabled={busy} onClick={() => save({ ...target.data, relance: '', relanced_at: isoDate() }, 'Relance notée. Une seule relance : on attend sa réponse.')}>
                    Relance envoyée
                  </button>
                </div>
              </>
            )}
            {tab !== 'relance' && (
              <div className="pro-row">
                <button type="button" className="tool-ghost pro-ghost" disabled={busy} onClick={() => save({ ...target.data, msg_dm: dm, msg_objet: objet, msg_mail: mail }, 'Texte gardé pour cette fiche.')}>
                  Garder ce texte
                </button>
                {msg?.own && (
                  <button
                    type="button"
                    className="tool-ghost pro-ghost"
                    disabled={busy}
                    onClick={() => {
                      const rest = Object.fromEntries(Object.entries(target.data).filter(([k]) => !k.startsWith('msg_')));
                      const t = spec.templates(target);
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
            )}
            <p className="pro-hint">
              Tu copies, tu envoies toi-même, puis « C’est envoyé » (ou l’étape {contactedStage(spec)}) : la relance est prévue {spec.relanceDays.contacted} jours après.
            </p>
          </div>
        </>
      )}

      <form className="pro-panel" onSubmit={submit}>
        <h3 className="pro-panel-title">{isNew ? 'Infos' : 'Infos et notes'}</h3>
        <div className="pro-fields">
          <label className="pro-field">
            Type
            <select className="tool-select pro-input" value={values.type ?? spec.defaultType} onChange={(e) => set('type', e.target.value)}>
              {Object.keys(spec.types).map((k) => (
                <option key={k} value={k}>
                  {spec.types[k]}
                </option>
              ))}
            </select>
          </label>
          {spec.fields.map((f) => (
            <label key={f.key} className={`pro-field${f.full ? ' pro-field--full' : ''}`}>
              {f.label}
              {f.options ? (
                <select className="tool-select pro-input" value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                  <option value="">—</option>
                  {f.options.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : (
                <input className="pro-input" type={f.type ?? 'text'} value={values[f.key] ?? ''} placeholder={f.ph} onChange={(e) => set(f.key, e.target.value)} required={f.key === 'name'} />
              )}
            </label>
          ))}
          <label className="pro-field pro-field--full">
            Ce qu’on sait d’eux
            <textarea className="pro-input pro-area" value={values.note ?? ''} placeholder={spec.project === 'rnds' ? 'Champion régional, combat le 12 décembre…' : 'Gala en mars, soirées tous les jeudis…'} onChange={(e) => set('note', e.target.value)} />
          </label>
          {!isNew && (
            <label className="pro-field pro-field--full">
              Mes notes
              <textarea className="pro-input pro-area" value={values.notes ?? ''} placeholder={spec.project === 'rnds' ? 'A répondu, veut tester avec son club…' : 'Réponse de Léa, veut le dé en violet…'} onChange={(e) => set('notes', e.target.value)} />
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

/** « Envoyer à la chaîne »: one target at a time, copy and open, « C'est envoyé », the next one. */
function ChainSheet({ spec, project, targets, ids, mode, onClose, onNotice }: {
  spec: ProspectSpec;
  project: Project;
  targets: RecordRow[];
  ids: string[];
  mode: 'first' | 'relance';
  onClose: () => void;
  onNotice: (t: string) => void;
}) {
  const [done, setDone] = useState<string[]>([]);
  const [opened, setOpened] = useState(false);
  const today = isoDate();
  const fits = (r: RecordRow) => (mode === 'relance' ? isDue(spec, r, today) : stageOf(spec, r) === spec.stages[0].name);
  const byId = new Map(targets.map((r) => [r.id, r]));
  const rest = ids.filter((id) => !done.includes(id) && byId.has(id) && fits(byId.get(id)!));
  const current = rest.length ? byId.get(rest[0])! : null;
  const sent = sentToday(targets, today);

  if (!current) {
    return (
      <Sheet title={mode === 'relance' ? 'Relances faites' : 'Liste terminée'} sub={`${sent} envoyés aujourd’hui`} onClose={onClose}>
        <div className="pro-panel">
          <p className="pro-hint">
            {mode === 'relance' ? 'Plus de relance à faire pour l’instant.' : `Plus personne à contacter dans cette liste. Ajoute des ${spec.many}, ou demande à un agent d’en trouver.`}
          </p>
          <div className="pro-row">
            <button type="button" className="tool-primary tool-primary--small" onClick={onClose}>
              Retour à la liste
            </button>
          </div>
        </div>
      </Sheet>
    );
  }
  return <ChainStep key={current.id} spec={spec} project={project} target={current} mode={mode} left={rest.length - 1} sent={sent} opened={opened} setOpened={setOpened} next={() => { setOpened(false); setDone((d) => [...d, current.id]); }} onClose={onClose} onNotice={onNotice} />;
}

function ChainStep({ spec, project, target, mode, left, sent, opened, setOpened, next, onClose, onNotice }: {
  spec: ProspectSpec;
  project: Project;
  target: RecordRow;
  mode: 'first' | 'relance';
  left: number;
  sent: number;
  opened: boolean;
  setOpened: (v: boolean) => void;
  next: () => void;
  onClose: () => void;
  onNotice: (t: string) => void;
}) {
  const msg = messagesOf(spec, target);
  const ig = handle(target.data.instagram);
  const email = target.data.email ?? '';
  const [channel, setChannel] = useState<'dm' | 'mail'>(mode === 'relance' && target.data.channel === 'mail' ? 'mail' : ig ? 'dm' : 'mail');
  const [dm, setDm] = useState(() => (mode === 'relance' && spec.relance ? spec.relance(target, 'dm') : msg.dm));
  const [objet, setObjet] = useState(mode === 'relance' ? `Re: ${msg.objet}` : msg.objet);
  const [mail, setMail] = useState(() => (mode === 'relance' && spec.relance ? spec.relance(target, 'mail') : msg.mail));
  const [busy, setBusy] = useState(false);

  async function sentAndNext() {
    setBusy(true);
    let data: Record<string, string>;
    if (mode === 'relance') data = { ...target.data, relance: '', relanced_at: isoDate() };
    else {
      const t = spec.templates(target);
      data = { ...stageChange(spec, target, contactedStage(spec)), channel };
      if (channel === 'dm' && dm !== t.dm) data.msg_dm = dm;
      if (channel === 'mail' && (mail !== t.mail || objet !== t.objet)) Object.assign(data, { msg_mail: mail, msg_objet: objet });
    }
    next();
    const failed = await saveRecord(project.id, spec.kind, data, target.id);
    setBusy(false);
    onNotice(failed || (mode === 'relance' ? `Relance notée : ${target.data.name}.` : `Envoyé : ${target.data.name}.`));
  }
  async function refuse() {
    next();
    const failed = await saveRecord(project.id, spec.kind, stageChange(spec, target, refusedStage(spec)), target.id);
    onNotice(failed || `${target.data.name} : ${refusedStage(spec).toLowerCase()}.`);
  }

  const goalNote = sent >= spec.dailyGoal ? ` · objectif du jour atteint, mieux vaut reprendre demain (Instagram surveille les comptes qui envoient beaucoup)` : '';
  return (
    <Sheet title={target.data.name || 'Sans nom'} sub={subOf(spec, target)} onClose={onClose}>
      <p className={`pro-chain-count${sent >= spec.dailyGoal ? ' is-full' : ''}`}>
        <b>{sent}</b>/{spec.dailyGoal} envoyés aujourd’hui · {left > 0 ? `encore ${left} après celui-ci` : 'le dernier de la liste'}
        {goalNote}
      </p>
      {target.data.note && <p className="pro-hint">{target.data.note}</p>}
      <div className="pro-panel">
        <div className="pro-row pro-row--between">
          <h3 className="pro-panel-title">{mode === 'relance' ? 'Relance' : 'Message'}{target.data.lang && target.data.lang !== 'fr' && LANGS[target.data.lang] ? ` · ${LANGS[target.data.lang].toLowerCase()}` : ''}</h3>
          {ig && email && (
            <div className="tool-segment" role="group" aria-label="Canal">
              <button type="button" aria-pressed={channel === 'dm'} onClick={() => setChannel('dm')}>
                DM
              </button>
              <button type="button" aria-pressed={channel === 'mail'} onClick={() => setChannel('mail')}>
                Mail
              </button>
            </div>
          )}
        </div>
        {channel === 'dm' ? (
          <>
            <textarea className="pro-text" value={dm} onChange={(e) => setDm(e.target.value)} aria-label="Message privé" />
            <a
              className={`${opened ? 'tool-ghost pro-ghost' : 'tool-primary'} pro-big`}
              href={igDm(ig)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                copy(dm, 'Copié : colle-le dans Instagram, envoie, puis reviens ici.', onNotice);
                setOpened(true);
              }}
            >
              Copier et ouvrir Instagram
            </a>
          </>
        ) : (
          <>
            <div className="pro-row">
              <button type="button" className="tool-ghost pro-link" onClick={() => copy(email, 'Adresse copiée.', onNotice)}>
                Copier {email}
              </button>
              <button type="button" className="tool-ghost pro-ghost" onClick={() => copy(objet, 'Objet copié.', onNotice)}>
                Copier l’objet
              </button>
            </div>
            <input className="tool-input pro-subject" value={objet} onChange={(e) => setObjet(e.target.value)} aria-label="Objet" />
            <textarea className="pro-text pro-text--mail" value={mail} onChange={(e) => setMail(e.target.value)} aria-label="Mail" />
            <div className="pro-row">
              {validEmail(email) && (
                <a className={`${opened ? 'tool-ghost pro-ghost' : 'tool-primary'} pro-big`} href={mailto(email, objet, mail)} onClick={() => setOpened(true)}>
                  Ouvrir dans Mail
                </a>
              )}
              <button
                type="button"
                className="tool-ghost pro-ghost"
                onClick={() => {
                  copy(mail, 'Mail copié.', onNotice);
                  setOpened(true);
                }}
              >
                Copier le mail
              </button>
            </div>
          </>
        )}
        <button type="button" className={`${opened ? 'tool-primary' : 'tool-ghost pro-ghost'} pro-big`} disabled={busy} onClick={sentAndNext}>
          {mode === 'relance' ? 'Relance envoyée, suivant' : channel === 'mail' ? 'Mail envoyé, suivant' : 'C’est envoyé, suivant'}
        </button>
        <div className="pro-row pro-row--between">
          <button type="button" className="tool-ghost pro-ghost" onClick={next}>
            Passer
          </button>
          <button type="button" className="tool-ghost tool-ghost--danger" onClick={refuse}>
            {refusedStage(spec)}
          </button>
        </div>
      </div>
      {(target.data.source || target.data.site) && (
        <div className="pro-links">
          {ig && (
            <a className="tool-ghost pro-link" href={`https://instagram.com/${encodeURIComponent(ig)}`} target="_blank" rel="noopener noreferrer">
              Voir le profil
            </a>
          )}
          {target.data.source && /^https?:/.test(target.data.source) && (
            <a className="tool-ghost pro-link" href={target.data.source} target="_blank" rel="noopener noreferrer">
              Source
            </a>
          )}
        </div>
      )}
    </Sheet>
  );
}

/** « Ajouter des profils »: paste the @ (or links) found while scrolling, all at once. */
function BulkSheet({ spec, project, targets, onClose, onNotice }: { spec: ProspectSpec; project: Project; targets: RecordRow[]; onClose: () => void; onNotice: (t: string) => void }) {
  const [text, setText] = useState('');
  const [type, setType] = useState(spec.defaultType);
  const [sport, setSport] = useState('');
  const [lang, setLang] = useState('fr');
  const [country, setCountry] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const known = useMemo(() => new Set(targets.map((r) => handle(r.data.instagram).toLowerCase()).filter(Boolean)), [targets]);
  const found = parseHandles(text);
  const fresh = found.filter((h) => !known.has(h)).slice(0, 200);
  const dup = found.length - found.filter((h) => !known.has(h)).length;

  async function add() {
    if (!fresh.length) return;
    setBusy(true);
    const day = isoDate();
    const failed = await addRecords(
      project.id,
      spec.kind,
      fresh.map((h) => ({
        name: `@${h}`,
        instagram: h,
        type,
        lang,
        ...(sport ? { discipline: sport } : {}),
        ...(country.trim() ? { country: country.trim().toUpperCase() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        source: 'Trouvé par Marc',
        stage: spec.stages[0].name,
        added_at: day,
      })),
    );
    setBusy(false);
    if (failed) return onNotice(failed);
    onNotice(`${fresh.length} ${fresh.length > 1 ? spec.many : spec.one} ajouté${fresh.length > 1 ? 's' : ''} dans « ${spec.stages[0].name} ». Lance « Envoyer à la chaîne ».`);
    onClose();
  }

  return (
    <Sheet title="Ajouter des profils" sub="Colle les @ ou les liens Instagram repérés en scrollant, autant que tu veux." onClose={onClose}>
      <div className="pro-panel">
        <label className="pro-field pro-field--full">
          Profils
          <textarea className="pro-input pro-area pro-bulk" value={text} onChange={(e) => setText(e.target.value)} placeholder={'@boxeur_lyon\nhttps://www.instagram.com/club_de_boxe/\n…'} autoFocus />
        </label>
        <p className="pro-hint" aria-live="polite">
          {found.length ? (
            <>
              <b>{fresh.length}</b> nouveau{fresh.length > 1 ? 'x' : ''}
              {dup ? ` · ${dup} déjà dans ta liste` : ''}
              {found.length - dup > 200 ? ' · 200 au plus à la fois' : ''}
            </>
          ) : (
            'Un @ par ligne, ou des liens collés en vrac. Un mot sans @ n’est pris que s’il est seul sur sa ligne.'
          )}
        </p>
        <div className="pro-chips" role="group" aria-label="Type">
          {Object.keys(spec.types).map((k) => (
            <Chip key={k} on={type === k} onClick={() => setType(k)} label={spec.types[k]} />
          ))}
        </div>
        <div className="pro-fields">
          <label className="pro-field">
            Sport
            <select className="tool-select pro-input" value={sport} onChange={(e) => setSport(e.target.value)}>
              <option value="">Plusieurs ou je ne sais pas</option>
              {SPORTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="pro-field">
            Langue des messages
            <select className="tool-select pro-input" value={lang} onChange={(e) => setLang(e.target.value)}>
              {Object.entries(LANGS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="pro-field">
            Pays (code)
            <input className="pro-input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="FR, BR, US…" maxLength={2} />
          </label>
          <label className="pro-field pro-field--full">
            Ce qu’ils ont en commun (facultatif)
            <input className="pro-input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Combattants du gala de Lyon du 8 novembre" />
          </label>
        </div>
        <div className="pro-row">
          <button type="button" className="tool-primary tool-primary--small" onClick={add} disabled={busy || !fresh.length}>
            {busy ? '…' : fresh.length ? `Ajouter ${fresh.length} ${fresh.length > 1 ? spec.many : spec.one}` : 'Ajouter'}
          </button>
        </div>
        <p className="pro-hint">Chaque profil reçoit un DM et un mail prêts dans sa langue. Tu peux les retoucher dans sa fiche, ou au moment de l’envoi.</p>
      </div>
    </Sheet>
  );
}

/** « Trouver d'autres … »: a request handed to the project's agent, who searches the web and adds them. */
function FindSheet({ spec, project, onClose, onNotice }: { spec: ProspectSpec; project: Project; onClose: () => void; onNotice: (t: string) => void }) {
  const [what, setWhat] = useState(spec.find.defaultWhat);
  const [n, setN] = useState('20');
  const [where, setWhere] = useState('');
  const [busy, setBusy] = useState(false);
  const text = spec.find.text(n, what, where.trim());
  async function send() {
    setBusy(true);
    const failed = await handToAgent(project.id, text);
    setBusy(false);
    onNotice(failed || 'Demande confiée aux agents : elle apparaît sous les agents jusqu’à ce qu’un agent la termine.');
    if (!failed) onClose();
  }
  return (
    <Sheet title={`Trouver d’autres ${spec.many}`} sub={`Un agent Claude cherche sur le web et ajoute les ${spec.many} à cette liste.`} onClose={onClose}>
      <div className="pro-panel">
        <div className="pro-fields">
          <label className="pro-field">
            Quoi
            <select className="tool-select pro-input" value={what} onChange={(e) => setWhat(e.target.value)}>
              {spec.find.options.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="pro-field">
            Combien
            <select className="tool-select pro-input" value={n} onChange={(e) => setN(e.target.value)}>
              <option>10</option>
              <option>20</option>
              <option>40</option>
              {spec.project === 'rnds' && <option>60</option>}
            </select>
          </label>
          <label className="pro-field pro-field--full">
            Où
            <input className="pro-input" value={where} onChange={(e) => setWhere(e.target.value)} placeholder={spec.find.where} />
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
        <p className="pro-hint">La demande part dans Marc HQ : l’agent {project.name} la prend à sa prochaine session, vérifie chaque contact et ne remet pas ceux déjà là.</p>
      </div>
    </Sheet>
  );
}
