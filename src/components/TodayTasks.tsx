import { Link } from 'react-router-dom';
import { useSettling, useTasks } from '../data/tools';
import type { Project } from '../data/types';
import { dayLabel, daysFromToday, dueLabel } from '../lib/dates';
import ProjectMark from './ProjectMark';
import './TodayTasks.css';

/** Home: today's and overdue tasks of every project, ticked right here. Same lists as each To do. */
export default function TodayTasks({ projects }: { projects: Project[] }) {
  return (
    <section className="today" aria-labelledby="today-title">
      <h2 id="today-title" className="today-title">
        <span className="today-title-light">Aujourd'hui</span> <span className="today-title-bold">à faire</span>
      </h2>
      <p className="today-date">{dayLabel()}</p>
      {projects.map((project) => (
        <ProjectToday key={project.id} project={project} />
      ))}
    </section>
  );
}

function ProjectToday({ project }: { project: Project }) {
  const { tasks, toggle } = useTasks(project);
  const { settling, tick } = useSettling(toggle, tasks);
  // Due today or late and not done; a task just ticked stays a moment, struck through, then goes
  // to "Faites" in the project's To do (where it can be unticked).
  const due = tasks
    .filter((task) => task.due !== null && daysFromToday(task.due) <= 0 && (!task.done || settling.has(task.id)))
    .sort((a, b) => (a.due ?? '').localeCompare(b.due ?? ''));
  const open = due.filter((task) => !task.done).length;
  const doneToday = tasks.filter((task) => task.done && task.due !== null && daysFromToday(task.due) <= 0 && !settling.has(task.id)).length;

  return (
    <div className="today-group" data-project={project.id}>
      <div className="today-group-head">
        <span className="today-mark" aria-hidden="true">
          <ProjectMark project={project} />
        </span>
        <span className="today-group-name">{project.name}</span>
        <Link to={`/${project.id}/todo`} className="today-all">
          {open} à faire{doneToday > 0 ? ` · ${doneToday} ${doneToday > 1 ? 'faites' : 'faite'}` : ''} · Tout voir
        </Link>
      </div>
      {due.length === 0 ? (
        <p className="today-empty">Rien pour aujourd'hui.</p>
      ) : (
        <ul className="today-list">
          {due.map((task) => {
            const late = !task.done && daysFromToday(task.due as string) < 0;
            return (
              <li key={task.id}>
                <label className={`today-item${task.done ? ' today-item--done' : ''}${settling.has(task.id) ? ' today-item--leaving' : ''}`}>
                  <input type="checkbox" className="today-check" checked={task.done} onChange={() => tick(task.id)} />
                  <span className="today-text">{task.text}</span>
                  {late && <span className="today-late">{dueLabel(task.due as string)}</span>}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
