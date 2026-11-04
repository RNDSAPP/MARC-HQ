import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { useSettling } from '../../data/tools';
import type { Task } from '../../data/types';
import ViewSwitch, { useView } from '../../components/ViewSwitch';
import { daysFromToday, dueLabel, isoDate } from '../../lib/dates';
import './Tools.css';

/** Four ways to see the tasks when there are many. */
const VIEWS = [
  { key: 'liste', label: 'Liste' },
  { key: 'colonnes', label: 'Colonnes' },
  { key: 'calendrier', label: 'Calendrier' },
  { key: 'compact', label: 'Compact' },
] as const;

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

type Props = {
  tasks: Task[];
  failed?: string;
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
export default function TodoPage({ tasks, failed, query, onAdd, onToggle, onRemove }: Props) {
  const [text, setText] = useState('');
  const [due, setDue] = useState(isoDate());
  const [filter, setFilter] = useState<Filter>('open');
  const [view, setView] = useView('todo', VIEWS);

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
      {task.due && <span className={`task-due${!task.done && daysFromToday(task.due) < 0 ? ' task-due--late' : ''}`}>{dueLabel(task.due)}</span>}
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
        <div className="tool-head-actions">
          <ViewSwitch views={VIEWS} value={view} onChange={setView} />
          {(view === 'liste' || view === 'compact') && (
            <div className="tool-segment" role="group" aria-label="Afficher">
              <button type="button" aria-pressed={filter === 'open'} onClick={() => setFilter('open')}>
                En cours
              </button>
              <button type="button" aria-pressed={filter === 'done'} onClick={() => setFilter('done')}>
                Faites {done.length > 0 && <span className="tool-segment-count">{done.length}</span>}
              </button>
            </div>
          )}
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

      {failed && (
        <p className="tool-failed" role="alert">
          {failed}
        </p>
      )}

      {view === 'colonnes' ? (
        <TaskColumns open={open} done={done} row={row} />
      ) : view === 'calendrier' ? (
        <TaskCalendar tasks={[...open, ...done]} row={row} />
      ) : view === 'compact' ? (
        (filter === 'open' ? open : done).length === 0 ? (
          <p className="tool-empty">{filter === 'open' ? 'Tout est fait. Ajoute une tâche juste au-dessus.' : 'Aucune tâche faite pour l’instant.'}</p>
        ) : (
          <ul className="tool-card task-list task-list--compact">{(filter === 'open' ? open : done).map(row)}</ul>
        )
      ) : filter === 'open' ? (
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

/** Colonnes: one column per moment (late, today, this week, later, no date) and the done ones. */
function TaskColumns({ open, done, row }: { open: Task[]; done: Task[]; row: (task: Task) => JSX.Element }) {
  // Empty moments are left out (an empty "En retard" is good news, not a column to scroll past)
  const columns = [...GROUPS.map((group) => ({ key: group.key, label: group.label, items: open.filter((task) => group.test(task)) })), { key: 'done', label: 'Faites', items: done }].filter(
    (column) => column.items.length > 0 || column.key === 'today',
  );
  return (
    <div className="task-columns">
      {columns.map((column) => (
        <section key={column.key} className={`task-column${column.key === 'late' && column.items.length ? ' task-column--late' : ''}`} aria-label={column.label}>
          <h2 className="task-column-title">
            {column.label} <span>{column.items.length}</span>
          </h2>
          {column.items.length === 0 ? <p className="task-column-empty">Rien ici</p> : <ul className="tool-card task-list">{column.items.map(row)}</ul>}
        </section>
      ))}
    </div>
  );
}

/** Calendrier: the month, with each day's tasks; a day picked shows its tasks underneath. */
function TaskCalendar({ tasks, row }: { tasks: Task[]; row: (task: Task) => JSX.Element }) {
  const [shift, setShift] = useState(0);
  const [picked, setPicked] = useState(isoDate());
  const today = isoDate();
  const first = new Date();
  first.setDate(1);
  first.setMonth(first.getMonth() + shift);
  const monthLabel = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(first);
  // Monday on the left, six weeks at most
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  const weeks = days[35].getMonth() === first.getMonth() ? 6 : 5;
  const byDay = new Map<string, Task[]>();
  for (const task of tasks) if (task.due) byDay.set(task.due, [...(byDay.get(task.due) ?? []), task]);
  const dayTasks = byDay.get(picked) ?? [];
  const undated = tasks.filter((task) => !task.due && !task.done);

  return (
    <div className="task-calendar">
      <div className="task-calendar-head">
        <button type="button" className="tool-ghost" onClick={() => setShift((s) => s - 1)} aria-label="Mois précédent">
          ←
        </button>
        <span className="task-calendar-month">{monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}</span>
        <button type="button" className="tool-ghost" onClick={() => setShift((s) => s + 1)} aria-label="Mois suivant">
          →
        </button>
        {shift !== 0 && (
          <button
            type="button"
            className="tool-ghost"
            onClick={() => {
              setShift(0);
              setPicked(today);
            }}
          >
            Aujourd’hui
          </button>
        )}
      </div>
      <div className="task-calendar-grid tool-card">
        {WEEKDAYS.map((day) => (
          <span key={day} className="task-calendar-weekday">
            {day}
          </span>
        ))}
        {days.slice(0, weeks * 7).map((d) => {
          const key = isoDate(d);
          const items = byDay.get(key) ?? [];
          const left = items.filter((task) => !task.done);
          const late = key < today && left.length > 0;
          return (
            <button
              key={key}
              type="button"
              className={`task-day${d.getMonth() !== first.getMonth() ? ' task-day--out' : ''}${key === today ? ' task-day--today' : ''}${key === picked ? ' task-day--picked' : ''}${late ? ' task-day--late' : ''}`}
              onClick={() => setPicked(key)}
              aria-label={`${d.getDate()} : ${items.length} tâche${items.length > 1 ? 's' : ''}`}
            >
              <span className="task-day-number">{d.getDate()}</span>
              {items.length > 0 && (
                <>
                  <span className="task-day-dots" aria-hidden="true">
                    {items.slice(0, 4).map((task) => (
                      <span key={task.id} className={`task-day-dot${task.done ? ' task-day-dot--done' : ''}`} />
                    ))}
                  </span>
                  <span className="task-day-items" aria-hidden="true">
                    {items.slice(0, 3).map((task) => (
                      <span key={task.id} className={`task-day-item${task.done ? ' task-day-item--done' : ''}`}>
                        {task.text}
                      </span>
                    ))}
                    {items.length > 3 && <span className="task-day-more">+{items.length - 3}</span>}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
      <div className="tool-group">
        <h2 className="tool-group-title">
          {picked === today ? 'Aujourd’hui' : new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${picked}T12:00:00`))}{' '}
          <span>{dayTasks.length}</span>
        </h2>
        {dayTasks.length === 0 ? <p className="task-column-empty">Rien ce jour-là.</p> : <ul className="tool-card task-list">{dayTasks.map(row)}</ul>}
      </div>
      {undated.length > 0 && (
        <div className="tool-group">
          <h2 className="tool-group-title">
            Sans date <span>{undated.length}</span>
          </h2>
          <ul className="tool-card task-list">{undated.map(row)}</ul>
        </div>
      )}
    </div>
  );
}
