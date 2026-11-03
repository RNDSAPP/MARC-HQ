import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '../data/types';
import { agentStatusLabel, projectStatus } from '../lib/format';
import ProjectMark from './ProjectMark';
import './WorkspaceHeader.css';

type Props = {
  project: Project;
  projects: Project[];
  search: string;
  onSearch: (value: string) => void;
};

/** Top of a workspace: back to HQ, the project's logo and name, the search, and the project switch. */
export default function WorkspaceHeader({ project, projects, search, onSearch }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K (or Ctrl+K) jumps to the search field from anywhere in the workspace.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <header className="wh">
      <div className="wh-identity">
        <Link to="/" className="wh-back" aria-label="Retour à HQ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <span className="wh-mark" aria-hidden="true">
          <ProjectMark id={project.id} />
        </span>
        <span className="wh-name">
          <span className="wh-title">{project.name}</span>
          <span className="wh-tag">
            <span className="wh-tag-dot" aria-hidden="true" />
            {project.space} · {project.tag}
          </span>
        </span>
      </div>

      <label className="wh-search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4 -4" />
        </svg>
        <span className="visually-hidden">Rechercher dans {project.name}</span>
        <input
          ref={inputRef}
          type="search"
          value={search}
          placeholder={project.searchPlaceholder}
          onChange={(event) => onSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onSearch('');
          }}
        />
        <kbd className="wh-kbd" aria-hidden="true">
          ⌘K
        </kbd>
      </label>

      <nav className="wh-switch" aria-label="Projets">
        {projects.map((item) => {
          const status = projectStatus(item);
          const active = item.id === project.id;
          return (
            <Link
              key={item.id}
              to={`/${item.id}/vue-d-ensemble`}
              className="wh-switch-item"
              aria-current={active ? 'page' : undefined}
              data-project={item.id}
            >
              <span className="wh-switch-mark" aria-hidden="true">
                <ProjectMark id={item.id} />
              </span>
              <span className="wh-switch-name">{item.name}</span>
              <span className={`wh-switch-dot wh-switch-dot--${status}`} aria-hidden="true" />
              <span className="visually-hidden">, agent : {agentStatusLabel[status]}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
