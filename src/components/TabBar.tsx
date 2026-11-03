import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { TOOLS, shortLabel } from '../data/sections';
import type { Project } from '../data/types';
import Club421Logo from './Club421Logo';
import ModuleIcon from './ModuleIcon';
import { openNewProject } from './NewProjectDialog';
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
 * Tab glyph for a project: its real logo in one colour, the tab bar's (the RNDS "R", the Club 421
 * king and dice). A project added from the app shows its initial in a rounded square.
 */
function ProjectGlyph({ project }: { project: Project }) {
  if (project.id === 'club421') return <Club421Logo mono className="tabbar-logo tabbar-logo--club421" />;
  if (project.id === 'rnds') {
    return (
      <svg width="26" height="26" viewBox="236 236 462 462" aria-hidden="true">
        <path
          fillRule="evenodd"
          fill="currentColor"
          d="M312,236 L547,236 L622,346 L622,421 L563,482 L622,569 L622,686 L544,686 L544,581 L485,496 L423,496 L389,475 L389,686 L312,686 Z M389,309 L508,309 L544,360 L544,399 L519,424 L389,424 Z"
        />
      </svg>
    );
  }
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
      <rect x="2.5" y="2.5" width="21" height="21" rx="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <text x="13" y="17.4" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="currentColor" fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif">
        {project.mark}
      </text>
    </svg>
  );
}

/**
 * The same bar on the home page, on phones, drawn like an iPhone app's: monochrome glyphs, the
 * open tab filled and tinted, the others grey. Home itself, one tab per project (a dot when its
 * agent waits for Marc) and a tab to add a project. It replaces the side rail there.
 */
export function HomeTabBar({ projects }: { projects: Project[] }) {
  return (
    <nav className="tabbar tabbar--home" aria-label="Navigation">
      <ul className="tabbar-list">
        <li>
          <Link to="/" className="tabbar-item active" aria-current="page">
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3.6 10.4 12 3.6l8.4 6.8V19a1.6 1.6 0 0 1-1.6 1.6h-4.2v-5.4H9.4v5.4H5.2A1.6 1.6 0 0 1 3.6 19Z" fill="currentColor" />
            </svg>
            <span className="tabbar-label">Accueil</span>
          </Link>
        </li>
        {projects.map((project) => (
          <li key={project.id}>
            <Link to={`/${project.id}/vue-d-ensemble`} className="tabbar-item">
              <span className="tabbar-glyph">
                <ProjectGlyph project={project} />
                {project.agents.some((agent) => agent.status === 'wait') && <span className="tabbar-badge" aria-label="un agent attend ta réponse" />}
              </span>
              <span className="tabbar-label">{project.name}</span>
            </Link>
          </li>
        ))}
        <li>
          <button type="button" className="tabbar-item" onClick={openNewProject}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            <span className="tabbar-label">Nouveau</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
