import { useTasks } from '../data/tools';
import type { Project } from '../data/types';
import { moneyText, useStoreOverviews } from '../lib/appstore';
import { isoDate } from '../lib/dates';
import { useRecords } from '../lib/records';
import ProjectMark from './ProjectMark';
import './WeekCard.css';

const WEEK = 7 * 86400000;

/**
 * Home: the last 7 days of each project at a glance, the same figures as the Monday notification:
 * downloads and revenue (Apple's reports, a day behind), tasks ticked, clubs or BDE won, and the
 * soirées of the coming week.
 */
export default function WeekCard({ projects }: { projects: Project[] }) {
  const own = projects.filter((project) => project.id === 'rnds' || project.id === 'club421');
  if (own.length === 0) return null;
  return (
    <section className="week" aria-labelledby="week-title">
      <h2 id="week-title" className="week-title">
        <span className="week-title-light">Ces 7 jours</span> <span className="week-title-bold">en bref</span>
      </h2>
      {own.map((project) => (
        <WeekRow key={project.id} project={project} />
      ))}
    </section>
  );
}

function WeekRow({ project }: { project: Project }) {
  const { tasks } = useTasks(project);
  const records = useRecords().filter((record) => record.project_id === project.id);
  const store = useStoreOverviews()[project.id];
  const since = Date.now() - WEEK;
  const today = isoDate();
  const sevenAgo = isoDate(new Date(since));
  const inSoon = isoDate(new Date(Date.now() + WEEK));

  const days = (store?.sales?.days ?? []).filter((day) => day.day >= sevenAgo && day.day < today);
  const downloads = days.reduce((sum, day) => sum + day.downloads, 0);
  const proceeds: Record<string, number> = {};
  for (const day of days) for (const [currency, value] of Object.entries(day.proceeds)) proceeds[currency] = (proceeds[currency] ?? 0) + value;
  const done = tasks.filter((task) => task.done && (task.doneAt ?? 0) >= since).length;
  const [kind, stage] = project.id === 'rnds' ? ['club', 'Affiliés'] : ['bde', 'Partenaires'];
  const won = records.filter((record) => record.kind === kind && record.data.stage === stage && (record.data.signed_at ?? '') >= sevenAgo).length;
  const soon = records.filter((record) => record.kind === 'soiree' && record.data.status !== 'Faite' && (record.data.date ?? '') >= today && (record.data.date ?? '') <= inSoon).length;

  const figures = [
    { value: String(downloads), label: downloads > 1 ? 'téléchargements' : 'téléchargement', show: Boolean(store?.sales) },
    { value: moneyText(proceeds), label: 'de CA', show: Object.values(proceeds).some((value) => value) },
    { value: String(done), label: done > 1 ? 'tâches faites' : 'tâche faite', show: true },
    { value: String(won), label: project.id === 'rnds' ? (won > 1 ? 'clubs signés' : 'club signé') : won > 1 ? 'BDE partenaires' : 'BDE partenaire', show: true },
    { value: String(soon), label: soon > 1 ? 'soirées à venir' : 'soirée à venir', show: project.id === 'club421' },
  ].filter((figure) => figure.show);

  return (
    <div className="week-row" data-project={project.id}>
      <span className="week-mark" aria-hidden="true">
        <ProjectMark project={project} />
      </span>
      <span className="week-name">{project.name}</span>
      <ul className="week-figures">
        {figures.map((figure) => (
          <li key={figure.label} className="week-figure">
            <span className="week-value">{figure.value}</span> {figure.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
