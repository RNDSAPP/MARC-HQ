import { Link } from 'react-router-dom';
import type { Project } from '../data/types';
import { agentStatusLabel, projectStatus } from '../lib/format';
import ProjectMark from './ProjectMark';
import WeeklySteps from './WeeklySteps';
import './ProjectCard.css';

type Props = {
  project: Project;
};

/** Home card of a project: logo and agent status, main figure over its 12-week chart, two figures, the way in. */
export default function ProjectCard({ project }: Props) {
  const { home } = project;
  const trend = project.modules.find((module) => module.slug === home.trendModule) ?? project.modules[0];
  const status = projectStatus(project);

  return (
    <article className="pcard" data-project={project.id}>
      <header className="pcard-head">
        <span className="pcard-mark" aria-hidden="true">
          <ProjectMark project={project} />
        </span>
        <span className="pcard-name">
          <span className="pcard-title">{project.name}</span>
          <span className="pcard-tag">{project.tag}</span>
        </span>
        <span className={`pcard-status pcard-status--${status}`}>
          <span className="pcard-status-dot" aria-hidden="true" />
          {agentStatusLabel[status]}
        </span>
      </header>

      <div className="pcard-figure">
        <span className="pcard-num">{home.big}</span>
        <span className="pcard-label">{home.bigLabel}</span>
      </div>
      <WeeklySteps series={trend.series} label={trend.heroLabel} compact />

      <dl className="pcard-minis">
        {home.mini.map((item) => (
          <div key={item.label} className="pcard-mini">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>

      <Link to={`/${project.id}/vue-d-ensemble`} className="pcard-open">
        Ouvrir l'espace {project.name}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </Link>
    </article>
  );
}
