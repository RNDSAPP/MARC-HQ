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
    const active = list.current?.querySelector<HTMLElement>('.mstrip-item.active');
    if (active && list.current) {
      list.current.scrollTo({ left: active.offsetLeft - 16, behavior: 'smooth' });
    }
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
