import { Link, NavLink } from 'react-router-dom';
import type { Project } from '../data/types';
import { TOOLS, shortLabel } from '../data/sections';
import { agentStatusLabel, projectStatus } from '../lib/format';
import ModuleIcon from './ModuleIcon';
import ProjectMark from './ProjectMark';
import './AppRail.css';

type Props = {
  projects: Project[];
  /** The open project, if any: its modules and tools are listed under the project logos. */
  current?: Project;
};

/** Narrow side rail, on every page: HQ, the projects, then the open project's modules and tools. */
export default function AppRail({ projects, current }: Props) {
  return (
    <nav className="rail" aria-label="Navigation">
      <Link to="/" className={`rail-hq${current ? '' : ' rail-hq--active'}`} aria-label="Accueil Marc HQ" aria-current={current ? undefined : 'page'}>
        HQ
      </Link>

      <ul className="rail-projects">
        {projects.map((project) => {
          const status = projectStatus(project);
          const active = project.id === current?.id;
          return (
            <li key={project.id}>
              <Link
                to={`/${project.id}/vue-d-ensemble`}
                className={`rail-project${active ? ' rail-project--active' : ''}`}
                data-project={project.id}
                aria-current={active ? 'true' : undefined}
              >
                <span className="rail-project-mark" aria-hidden="true">
                  <ProjectMark id={project.id} />
                </span>
                <span className={`rail-project-dot rail-project-dot--${status}`} aria-hidden="true" />
                <span className="rail-label">{project.name}</span>
                <span className="visually-hidden">, agent : {agentStatusLabel[status]}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      {current && (
        <div className="rail-sections" data-project={current.id}>
          <span className="rail-sep" aria-hidden="true" />
          <ul className="rail-list" aria-label={`Rubriques ${current.name}`}>
            {current.modules.map((module) => (
              <li key={module.slug}>
                <NavLink to={`/${current.id}/${module.slug}`} className="rail-item">
                  <ModuleIcon slug={module.slug} size={20} />
                  <span className="rail-label">{shortLabel(module.slug, module.label)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
          <span className="rail-heading">Outils</span>
          <ul className="rail-list" aria-label={`Outils ${current.name}`}>
            {TOOLS.map((tool) => (
              <li key={tool.slug}>
                <NavLink to={`/${current.id}/${tool.slug}`} className="rail-item">
                  <ModuleIcon slug={tool.slug} size={20} />
                  <span className="rail-label">{tool.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      )}

      <span className="rail-user" title="Marc Bouraoui · données d'exemple">
        MB
      </span>
    </nav>
  );
}
