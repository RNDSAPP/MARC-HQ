import { useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { Project } from '../data/types';
import { TOOLS, shortLabel } from '../data/sections';
import { agentStatusLabel, projectStatus } from '../lib/format';
import { useStored } from '../hooks/useStored';
import AccountButton from './AccountButton';
import ModuleIcon from './ModuleIcon';
import { openNewProject } from './NewProjectDialog';
import ProjectMark from './ProjectMark';
import './AppRail.css';

type Props = {
  projects: Project[];
  /** The open project, if any: its modules and tools are listed under the project logos. */
  current?: Project;
};

/**
 * Side rail, on every page: HQ, the projects, then the open project's modules and tools. Narrow
 * (icons over short labels) or wide (icons beside full labels), as Marc chooses; the choice is kept
 * in this browser and set on <html> so the page grids follow (--rail-w, tokens.css).
 */
export default function AppRail({ projects, current }: Props) {
  const [wide, setWide] = useStored('marc-hq:rail-wide', () => false);
  useEffect(() => {
    document.documentElement.dataset.rail = wide ? 'wide' : 'narrow';
  }, [wide]);
  return (
    <nav className={`rail${wide ? ' rail--wide' : ''}`} aria-label="Navigation">
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
                  <ProjectMark project={project} />
                </span>
                <span className={`rail-project-dot rail-project-dot--${status}`} aria-hidden="true" />
                <span className="rail-label">{project.name}</span>
                <span className="visually-hidden">, agent : {agentStatusLabel[status]}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" className="rail-add" onClick={openNewProject} aria-label="Nouveau projet" title="Nouveau projet">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </li>
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

      <div className="rail-foot">
        <button
          type="button"
          className="rail-toggle"
          onClick={() => setWide((was) => !was)}
          aria-label={wide ? 'Réduire la barre latérale' : 'Agrandir la barre latérale'}
          aria-pressed={wide}
          title={wide ? 'Réduire' : 'Agrandir'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="3.5" />
            <path d="M9 4v16" />
            <path d={wide ? 'M15.5 10 13.5 12l2 2' : 'M13.5 10l2 2-2 2'} />
          </svg>
          <span className="rail-toggle-label">Réduire</span>
        </button>
        <AccountButton />
      </div>
    </nav>
  );
}
