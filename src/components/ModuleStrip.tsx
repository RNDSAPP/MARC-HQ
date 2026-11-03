import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { shortLabel } from '../data/sections';
import type { Project } from '../data/types';
import ModuleIcon from './ModuleIcon';
import './ModuleStrip.css';

/**
 * On phones, the project's modules as a row of pills under the header, scrolled sideways: the
 * modules are one tap away at the top, the tools in the tab bar at the bottom. The open one is
 * brought into view.
 */
export default function ModuleStrip({ project }: { project: Project }) {
  const list = useRef<HTMLUListElement>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    const box = list.current;
    const active = box?.querySelector<HTMLElement>('.mstrip-item.active');
    if (!box || !active) return;
    // Where the pill sits inside the row, measured on screen, kept at the page margin
    const left = active.getBoundingClientRect().left - box.getBoundingClientRect().left + box.scrollLeft - 16;
    box.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [pathname]);
  return (
    <nav className="mstrip" aria-label={`Rubriques ${project.name}`}>
      <ul ref={list} className="mstrip-list">
        {project.modules.map((module) => (
          <li key={module.slug}>
            <NavLink to={`/${project.id}/${module.slug}`} className="mstrip-item">
              <ModuleIcon slug={module.slug} size={16} />
              <span>{shortLabel(module.slug, module.label)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
