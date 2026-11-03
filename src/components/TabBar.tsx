import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { TOOLS, shortLabel } from '../data/sections';
import type { Project } from '../data/types';
import ModuleIcon from './ModuleIcon';
import { openNewProject } from './NewProjectDialog';
import ProjectMark from './ProjectMark';
import './TabBar.css';

type Props = {
  project: Project;
};

/**
 * iPhone-style tab bar, on small screens only: the overview, the three daily tools, and "Plus",
 * which opens a sheet with the project's other modules and tools. The modules are also in the
 * row of pills under the header.
 */
export default function TabBar({ project }: Props) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const others = project.modules.filter((module) => module.slug !== 'vue-d-ensemble');
  const moreTools = TOOLS.slice(3);
  // Modules have their own row of pills at the top (ModuleStrip): « Plus » lights up for the tools only
  const inOther = moreTools.some((item) => pathname.endsWith(`/${item.slug}`));

  // Close the sheet when a page is chosen, and with Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      {open && (
        <div className="sheet" role="dialog" aria-modal="true" aria-label={`Rubriques et outils ${project.name}`}>
          <button type="button" className="sheet-backdrop" aria-label="Fermer" onClick={() => setOpen(false)} />
          <div className="sheet-panel">
            <span className="sheet-grabber" aria-hidden="true" />
            <p className="sheet-title">Rubriques</p>
            <ul className="sheet-list">
              {others.map((module) => (
                <li key={module.slug}>
                  <NavLink to={`/${project.id}/${module.slug}`} className="sheet-item">
                    <ModuleIcon slug={module.slug} size={22} />
                    <span>{module.label}</span>
                    {module.count && <span className="sheet-count">{module.count}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
            <p className="sheet-title">Outils</p>
            <ul className="sheet-list sheet-list--grid">
              {moreTools.map((tool) => (
                <li key={tool.slug}>
                  <NavLink to={`/${project.id}/${tool.slug}`} className="sheet-item">
                    <ModuleIcon slug={tool.slug} size={22} />
                    <span>{tool.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <nav className="tabbar" aria-label={`Navigation ${project.name}`}>
        <ul className="tabbar-list">
          <li>
            <NavLink to={`/${project.id}/vue-d-ensemble`} className="tabbar-item">
              <ModuleIcon slug="vue-d-ensemble" size={24} />
              <span className="tabbar-label">{shortLabel('vue-d-ensemble', '')}</span>
            </NavLink>
          </li>
          {TOOLS.slice(0, 3).map((tool) => (
            <li key={tool.slug}>
              <NavLink to={`/${project.id}/${tool.slug}`} className="tabbar-item">
                <ModuleIcon slug={tool.slug} size={24} />
                <span className="tabbar-label">{tool.label}</span>
              </NavLink>
            </li>
          ))}
          <li>
            <button type="button" className={`tabbar-item${inOther ? ' active' : ''}`} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
              <ModuleIcon slug="plus" size={24} />
              <span className="tabbar-label">Plus</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}

/**
 * The same bar on the home page, on phones: home itself, one tab per project (its logo, a dot when
 * its agent is waiting for Marc) and a tab to add a project. It replaces the side rail there.
 */
export function HomeTabBar({ projects }: { projects: Project[] }) {
  return (
    <nav className="tabbar" aria-label="Navigation">
      <ul className="tabbar-list">
        <li>
          <Link to="/" className="tabbar-item active" aria-current="page">
            <span className="tabbar-hq" aria-hidden="true">
              HQ
            </span>
            <span className="tabbar-label">Accueil</span>
          </Link>
        </li>
        {projects.map((project) => (
          <li key={project.id}>
            <Link to={`/${project.id}/vue-d-ensemble`} className="tabbar-item" data-project={project.id}>
              <span className="tabbar-mark" aria-hidden="true">
                <ProjectMark project={project} />
              </span>
              <span className="tabbar-label">{project.name}</span>
            </Link>
          </li>
        ))}
        <li>
          <button type="button" className="tabbar-item" onClick={openNewProject}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <rect x="3.5" y="3.5" width="17" height="17" rx="5" strokeDasharray="3 2.4" />
              <path d="M12 8.5v7M8.5 12h7" />
            </svg>
            <span className="tabbar-label">Nouveau</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
