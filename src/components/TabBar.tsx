import { NavLink } from 'react-router-dom';
import type { Project } from '../data/types';
import ModuleIcon from './ModuleIcon';
import './TabBar.css';

type Props = {
  project: Project;
};

/** iPhone-style tab bar with the project's sections. Only shown on small screens. */
export default function TabBar({ project }: Props) {
  return (
    <nav className="tabbar" aria-label={`Rubriques ${project.name}`}>
      <ul className="tabbar-list">
        {project.modules.map((module) => (
          <li key={module.slug}>
            <NavLink to={`/${project.id}/${module.slug}`} className="tabbar-item">
              <ModuleIcon slug={module.slug} size={24} />
              <span className="tabbar-label">{module.slug === 'vue-d-ensemble' ? 'Aperçu' : module.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
