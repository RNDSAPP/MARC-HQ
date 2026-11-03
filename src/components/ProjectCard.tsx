import { Link } from 'react-router-dom';
import type { Project } from '../data/types';
import WeeklySteps from './WeeklySteps';
import './ProjectCard.css';

type Props = {
  project: Project;
};

/** Home page card of a project: main number, its 12-week step chart and two small figures. */
export default function ProjectCard({ project }: Props) {
  const { home } = project;
  const trend = project.modules.find((module) => module.slug === home.trendModule) ?? project.modules[0];

  return (
    <Link to={`/${project.id}/vue-d-ensemble`} className="project-card" data-project={project.id}>
      <span className="project-card-head">
        <span className="project-card-name">{home.label}</span>
        <span className="project-card-tag">{project.tag}</span>
      </span>
      <span className="project-card-main">
        <span className="project-card-big">
          <span className="project-card-num">{home.big}</span>
          <span className="project-card-big-label">{home.bigLabel}</span>
        </span>
        <WeeklySteps series={trend.series} label={trend.heroLabel} compact />
      </span>
      <span className="project-card-minis">
        {home.mini.map((item) => (
          <span key={item.label} className="project-card-mini">
            <span className="project-card-mini-label">{item.label}</span>
            <span className="project-card-mini-value">{item.value}</span>
          </span>
        ))}
      </span>
    </Link>
  );
}
