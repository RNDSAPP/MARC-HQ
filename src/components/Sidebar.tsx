import { Link, NavLink } from 'react-router-dom';
import type { Project } from '../data/types';
import { agentStatusLabel, projectStatus } from '../lib/format';
import './Sidebar.css';

type Props = {
  current: Project;
  projects: Project[];
};

export default function Sidebar({ current, projects }: Props) {
  return (
    <nav className="sidebar" aria-label="Navigation principale">
      <Link to="/" className="sidebar-home">
        <span className="sidebar-hq" aria-hidden="true">
          HQ
        </span>
        <span className="sidebar-home-label">Marc HQ</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M15 6l-6 6l6 6" />
        </svg>
      </Link>

      <div className="sidebar-group">
        <span className="sidebar-heading" id="sidebar-projects">
          PROJETS
        </span>
        <ul className="sidebar-projects" aria-labelledby="sidebar-projects">
          {projects.map((project) => {
            const status = projectStatus(project);
            const active = project.id === current.id;
            return (
              <li key={project.id}>
                <Link
                  to={`/${project.id}/vue-d-ensemble`}
                  className="sidebar-project"
                  aria-current={active ? 'page' : undefined}
                  data-project={project.id}
                >
                  <span className="sidebar-mark" aria-hidden="true">
                    {project.mark}
                  </span>
                  <span className="sidebar-project-text">
                    <span className="sidebar-project-name">{project.name}</span>
                    <span className="sidebar-project-tag">{project.tag}</span>
                  </span>
                  <span className={`sidebar-dot sidebar-dot--${status}`} aria-hidden="true" />
                  <span className="visually-hidden">, agent : {agentStatusLabel[status]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="sidebar-group">
        <span className="sidebar-heading" id="sidebar-modules">
          {current.space}
        </span>
        <ul className="sidebar-modules" aria-labelledby="sidebar-modules">
          {current.modules.map((module) => (
            <li key={module.slug}>
              <NavLink to={`/${current.id}/${module.slug}`} className="sidebar-module">
                <span className="sidebar-module-bar" aria-hidden="true" />
                <span className="sidebar-module-label">{module.label}</span>
                {module.count && <span className="sidebar-module-count">{module.count}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="sidebar-user">
        <span className="sidebar-avatar" aria-hidden="true">
          MB
        </span>
        <span className="sidebar-user-text">
          <span className="sidebar-user-name">Marc Bouraoui</span>
          <span className="sidebar-user-note">DONNÉES D'EXEMPLE</span>
        </span>
      </div>
    </nav>
  );
}
