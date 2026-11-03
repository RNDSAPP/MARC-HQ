import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { TOOLS, shortLabel } from '../data/sections';
import type { Project } from '../data/types';
import ModuleIcon from './ModuleIcon';
import './TabBar.css';

type Props = {
  project: Project;
};

/**
 * iPhone-style tab bar, on small screens only: the overview, the three daily tools, and "Plus",
 * which opens a sheet with the project's other modules and tools.
 */
export default function TabBar({ project }: Props) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const others = project.modules.filter((module) => module.slug !== 'vue-d-ensemble');
  const moreTools = TOOLS.slice(3);
  const inOther = [...others, ...moreTools].some((item) => pathname.endsWith(`/${item.slug}`));

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
