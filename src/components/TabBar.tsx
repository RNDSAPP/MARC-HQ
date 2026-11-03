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
 * iPhone-style tab bar, on small screens only: the overview, the three tools, and "Rubriques",
 * which opens a sheet with the project's other modules.
 */
export default function TabBar({ project }: Props) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const others = project.modules.filter((module) => module.slug !== 'vue-d-ensemble');
  const inOther = others.some((module) => pathname.endsWith(`/${module.slug}`));

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
        <div className="sheet" role="dialog" aria-modal="true" aria-label={`Rubriques ${project.name}`}>
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
          {TOOLS.map((tool) => (
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
              <span className="tabbar-label">Rubriques</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
