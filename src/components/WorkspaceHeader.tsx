import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '../data/types';
import { agentStatusLabel, projectStatus } from '../lib/format';
import { useOnline } from '../lib/online';
import ProjectMark from './ProjectMark';
import './WorkspaceHeader.css';

type Props = {
  project: Project;
  projects: Project[];
  search: string;
  onSearch: (value: string) => void;
  placeholder: string;
};

/**
 * Top of a workspace: the project's logo and name, and the search. On a phone, where the side
 * rail is hidden, it also has the way back to HQ and the project switch.
 */
export default function WorkspaceHeader({ project, projects, search, onSearch, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const online = useOnline();

  // "/" jumps to the search field (⌘K opens the palette, CommandPalette.tsx).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const typing = event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]');
      if (event.key === '/' && !typing) {
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
        <Link to="/" className="wh-back wh-phone" aria-label="Retour à HQ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <span className="wh-mark" aria-hidden="true">
          <ProjectMark project={project} />
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
          placeholder={placeholder}
          onChange={(event) => onSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onSearch('');
          }}
        />
        <kbd className="wh-kbd" aria-hidden="true">
          /
        </kbd>
      </label>

      <nav className="wh-switch wh-phone" aria-label="Projets">
        {projects.map((item) => {
          const status = projectStatus(item);
          const active = item.id === project.id;
          return (
            <Link key={item.id} to={`/${item.id}/vue-d-ensemble`} className="wh-switch-item" aria-current={active ? 'page' : undefined} data-project={item.id}>
              <span className="wh-switch-mark" aria-hidden="true">
                <ProjectMark project={item} />
              </span>
              <span className="wh-switch-name">{item.name}</span>
              {/* The dot says whether the phone has a network: bright green, or red without one */}
              <span className={`wh-switch-dot${online ? '' : ' wh-switch-dot--offline'}`} aria-hidden="true" />
              <span className="visually-hidden">
                , agent : {agentStatusLabel[status]}
                {online ? '' : ', pas de réseau'}
              </span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
