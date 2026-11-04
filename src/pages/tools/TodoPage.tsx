import { useState } from 'react';
import type { FormEvent } from 'react';
import { useSettling } from '../../data/tools';
import type { Task } from '../../data/types';
import { daysFromToday, dueLabel, isoDate } from '../../lib/dates';
import './Tools.css';

type Props = {
  tasks: Task[];
  query: (text: string) => boolean;
  onAdd: (text: string, due: string | null) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

type Filter = 'open' | 'done';

// Open tasks are grouped by when they are due.
const GROUPS: { key: string; label: string; test: (task: Task) => boolean }[] = [
  { key: 'late', label: 'En retard', test: (t) => t.due !== null && daysFromToday(t.due) < 0 },
  { key: 'today', label: "Aujourd'hui", test: (t) => t.due !== null && daysFromToday(t.due) === 0 },
  { key: 'week', label: 'Cette semaine', test: (t) => t.due !== null && daysFromToday(t.due) > 0 && daysFromToday(t.due) < 7 },
  { key: 'later', label: 'Plus tard', test: (t) => t.due !== null && daysFromToday(t.due) >= 7 },
  { key: 'none', label: 'Sans date', test: (t) => t.due === null },
];

/** The project's full task list: add, tick, delete, grouped by due date. */
export default function TodoPage({ tasks, query, onAdd, onToggle, onRemove }: Props) {
  const [text, setText] = useState('');
  const [due, setDue] = useState(isoDate());
  const [filter, setFilter] = useState<Filter>('open');

  const { settling, tick } = useSettling(onToggle, tasks);

  const visible = tasks.filter((task) => query(task.text));
  // A task just ticked stays a moment in "En cours", struck through, then moves to "Faites"
  const open = visible.filter((task) => !task.done || settling.has(task.id)).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  const done = visible.filter((task) => task.done && !settling.has(task.id));

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value) return;
    onAdd(value, due || null);
    setText('');
  }

  const row = (task: Task) => (
    <li key={task.id} className={`task${task.done ? ' task--done' : ''}${settling.has(task.id) ? ' task--leaving' : ''}`}>
      <label className="task-main">
        <input type="checkbox" className="tool-check" checked={task.done} onChange={() => tick(task.id)} />
        <span className="task-text">{task.text}</span>
      </label>
      {task.due && (
        <span className={`task-due${!task.done && daysFromToday(task.due) < 0 ? ' task-due--late' : ''}`}>{dueLabel(task.due)}</span>
      )}
      <button type="button" className="tool-remove" onClick={() => onRemove(task.id)} aria-label={`Supprimer « ${task.text} »`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </li>
  );

  return (
    <section className="tool" aria-labelledby="tool-title">
      <div className="tool-head">
        <h1 id="tool-title" className="tool-title">
          <span className="tool-title-light">To do</span> <span className="tool-title-bold">{open.length} en cours</span>
        </h1>
        <div className="tool-segment" role="group" aria-label="Afficher">
          <button type="button" aria-pressed={filter === 'open'} onClick={() => setFilter('open')}>
            En cours
          </button>
          <button type="button" aria-pressed={filter === 'done'} onClick={() => setFilter('done')}>
            Faites {done.length > 0 && <span className="tool-segment-count">{done.length}</span>}
          </button>
        </div>
      </div>

      <form className="tool-add" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="task-text">
          Nouvelle tâche
        </label>
        <input id="task-text" className="tool-input" value={text} onChange={(event) => setText(event.target.value)} placeholder="Nouvelle tâche" autoComplete="off" />
        <label className="visually-hidden" htmlFor="task-due">
          Échéance
        </label>
        <input id="task-due" type="date" className="tool-input tool-input--date" value={due} onChange={(event) => setDue(event.target.value)} />
        <button type="submit" className="tool-primary" disabled={!text.trim()}>
          Ajouter
        </button>
      </form>

      {filter === 'open' ? (
        open.length === 0 ? (
          <p className="tool-empty">Tout est fait. Ajoute une tâche juste au-dessus.</p>
        ) : (
          GROUPS.map((group) => {
            const items = open.filter((task) => group.test(task));
            if (items.length === 0) return null;
            return (
              <div key={group.key} className="tool-group">
                <h2 className={`tool-group-title${group.key === 'late' ? ' tool-group-title--late' : ''}`}>
                  {group.label} <span>{items.length}</span>
                </h2>
                <ul className="tool-card task-list">{items.map(row)}</ul>
              </div>
            );
          })
        )
      ) : done.length === 0 ? (
        <p className="tool-empty">Aucune tâche faite pour l'instant.</p>
      ) : (
        <ul className="tool-card task-list">{done.map(row)}</ul>
      )}
    </section>
  );
}
