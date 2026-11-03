import type { Todo } from '../data/types';
import { dayLabel, dueDayIndex, weekDays } from '../lib/dates';
import './Activity.css';

type Props = {
  todos: Todo[];
  done: Set<string>;
  onToggle: (id: string) => void;
};

/** This week at a glance (days with tasks are marked), then the tasks as a timeline Marc can tick. */
export default function Activity({ todos, done, onToggle }: Props) {
  const days = weekDays();
  const busy = new Set(todos.filter((todo) => !done.has(todo.id)).map((todo) => dueDayIndex(todo.due)));
  const next = todos.find((todo) => !done.has(todo.id));

  return (
    <section className="activity" aria-labelledby="activity-title">
      <div className="activity-head">
        <h2 id="activity-title" className="activity-title">
          À faire
        </h2>
        <span className="activity-count">
          {todos.filter((todo) => done.has(todo.id)).length} / {todos.length}
        </span>
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

      <ul className="activity-list">
        {todos.map((todo) => {
          const checked = done.has(todo.id);
          const isNext = todo === next;
          return (
            <li key={todo.id} className="activity-row">
              <span className="activity-when">{todo.due}</span>
              <label className={`activity-card${isNext ? ' activity-card--next' : ''}${checked ? ' activity-card--done' : ''}`}>
                <input type="checkbox" className="activity-box" checked={checked} onChange={() => onToggle(todo.id)} />
                <span className="activity-text">{todo.text}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
