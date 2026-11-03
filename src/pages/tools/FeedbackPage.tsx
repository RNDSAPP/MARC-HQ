import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Feedback, FeedbackKind, FeedbackPriority, FeedbackStatus } from '../../data/types';
import type { useFeedback } from '../../data/tools';
import './Tools.css';

type Props = { api: ReturnType<typeof useFeedback>; query: (text: string) => boolean };

const KINDS: Record<FeedbackKind, string> = { bug: 'Bug', demande: 'Demande', avis: 'Avis' };
const PRIORITIES: Record<FeedbackPriority, string> = { haute: 'Haute', moyenne: 'Moyenne', basse: 'Basse' };
const STATUSES: Record<FeedbackStatus, string> = { ouvert: 'Ouvert', 'en-cours': 'En cours', resolu: 'Résolu' };
const RANK: Record<FeedbackPriority, number> = { haute: 0, moyenne: 1, basse: 2 };

/** Bugs, requests and user feedback in one inbox, by priority. */
export default function FeedbackPage({ api, query }: Props) {
  const [text, setText] = useState('');
  const [kind, setKind] = useState<FeedbackKind>('bug');
  const [priority, setPriority] = useState<FeedbackPriority>('moyenne');
  const [filter, setFilter] = useState<'open' | 'done'>('open');
  const visible = api.items
    .filter((f) => query(f.text))
    .filter((f) => (filter === 'open' ? f.status !== 'resolu' : f.status === 'resolu'))
    .sort((a, b) => RANK[a.priority] - RANK[b.priority] || b.createdAt - a.createdAt);
  const open = api.items.filter((f) => f.status !== 'resolu').length;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    api.add(text.trim(), kind, priority);
    setText('');
  }

  return (
    <section className="tool" aria-labelledby="tool-title">
      <div className="tool-head">
        <h1 id="tool-title" className="tool-title">
          <span className="tool-title-light">Retours</span> <span className="tool-title-bold">{open} ouverts</span>
        </h1>
        <div className="tool-segment" role="group" aria-label="Afficher">
          <button type="button" aria-pressed={filter === 'open'} onClick={() => setFilter('open')}>
            À traiter
          </button>
          <button type="button" aria-pressed={filter === 'done'} onClick={() => setFilter('done')}>
            Résolus
          </button>
        </div>
      </div>
      <form className="tool-add" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="fb-text">
          Nouveau retour
        </label>
        <input id="fb-text" className="tool-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Un bug, une demande, un avis…" autoComplete="off" />
        <label className="visually-hidden" htmlFor="fb-kind">
          Type
        </label>
        <select id="fb-kind" className="tool-select" value={kind} onChange={(e) => setKind(e.target.value as FeedbackKind)}>
          {Object.entries(KINDS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <label className="visually-hidden" htmlFor="fb-priority">
          Priorité
        </label>
        <select id="fb-priority" className="tool-select" value={priority} onChange={(e) => setPriority(e.target.value as FeedbackPriority)}>
          {Object.entries(PRIORITIES).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <button type="submit" className="tool-primary" disabled={!text.trim()}>
          Ajouter
        </button>
      </form>

      {visible.length === 0 ? (
        <p className="tool-empty">{filter === 'open' ? 'Rien à traiter. Note ici le prochain bug ou la prochaine demande.' : 'Aucun retour résolu pour l’instant.'}</p>
      ) : (
        <ul className="tool-card task-list">
          {visible.map((f: Feedback) => (
            <li key={f.id} className="task feedback">
              <span className={`feedback-kind feedback-kind--${f.kind}`}>{KINDS[f.kind]}</span>
              <span className="task-text feedback-text">{f.text}</span>
              <span className={`feedback-priority feedback-priority--${f.priority}`}>{PRIORITIES[f.priority]}</span>
              <label className="visually-hidden" htmlFor={`${f.id}-status`}>
                État
              </label>
              <select id={`${f.id}-status`} className="tool-select" value={f.status} onChange={(e) => api.update(f.id, { status: e.target.value as FeedbackStatus })}>
                {Object.entries(STATUSES).map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </select>
              <button type="button" className="tool-remove" onClick={() => api.remove(f.id)} aria-label={`Supprimer « ${f.text} »`}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
