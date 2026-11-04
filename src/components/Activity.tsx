import { Link } from 'react-router-dom';
import { useSettling } from '../data/tools';
import type { Task } from '../data/types';
import { dayLabel, daysFromToday, dueLabel, fromIsoDate, weekDays } from '../lib/dates';
import './Activity.css';

type Props = {
  tasks: Task[];
  onToggle: (id: string) => void;
  /** Link to the full To do page. */
  allHref: string;
};

const SHOWN = 4;

/** This week at a glance (days with tasks are marked), then the next tasks as a timeline Marc can tick. */
export default function Activity({ tasks, onToggle, allHref }: Props) {
  const days = weekDays();
  const open = tasks.filter((task) => !task.done);
  const busy = new Set(
    open
      .filter((task) => task.due && Math.abs(daysFromToday(task.due)) < 7)
      .map((task) => (fromIsoDate(task.due as string).getDay() + 6) % 7),
  );
  // Only what is left to do, by date, undated last. A task just ticked stays a moment, struck
  // through, then disappears (it is in "Faites" on the To do page).
  const { settling, tick } = useSettling(onToggle, tasks);
  const sorted = tasks.filter((task) => !task.done || settling.has(task.id)).sort((a, b) => (a.due ?? '9999').localeCompare(b.due ?? '9999'));
  const shown = sorted.slice(0, SHOWN);
  const next = sorted.find((task) => !task.done);

  return (
    <section className="activity" aria-labelledby="activity-title">
      <div className="activity-head">
        <h2 id="activity-title" className="activity-title">
          À faire
        </h2>
        <Link to={allHref} className="activity-all">
          {open.length} en cours · Tout voir
        </Link>
      </div>
      <p className="activity-date">{dayLabel()}</p>

      <ol className="activity-week" aria-label="Cette semaine">
        {days.map((day, index) => (
          <li key={day.short} className={`activity-day${day.isToday ? ' activity-day--today' : ''}`}>
            <span className="activity-day-date">{day.date}</span>
            <span className="activity-day-name">{day.short}</span>
            <span className={`activity-day-dot${busy.has(index) ? ' activity-day-dot--on' : ''}`} aria-hidden="true" />
            {busy.has(index) && <span className="visually-hidden">, tâche prévue</span>}
          </li>
        ))}
      </ol>

      {shown.length === 0 ? (
        <p className="activity-empty">Rien à faire. Ajoute une tâche depuis la page To do.</p>
      ) : (
        <ul className="activity-list">
          {shown.map((task) => (
            <li key={task.id} className="activity-row">
              <span className="activity-when">{task.due ? dueLabel(task.due) : '—'}</span>
              <label className={`activity-card${task === next ? ' activity-card--next' : ''}${task.done ? ' activity-card--done' : ''}${settling.has(task.id) ? ' activity-card--leaving' : ''}`}>
                <input type="checkbox" className="activity-box" checked={task.done} onChange={() => tick(task.id)} />
                <span className="activity-text">{task.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
