import { Link } from 'react-router-dom';
import type { Project } from '../data/types';
import { sparkline } from '../lib/spark';
import './ProjectCard.css';

type Props = {
  project: Project;
};

/** Home page card of a project: main number, trend line and two small figures. */
export default function ProjectCard({ project }: Props) {
  const { home } = project;
  const spark = sparkline(150, 44, home.sparkSeed);

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
        <svg width="150" height="44" viewBox="0 0 150 44" className="project-card-spark" aria-hidden="true">
          <polyline points={spark.area} className="project-card-spark-area" />
          <polyline points={spark.line} className="project-card-spark-line" />
        </svg>
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
