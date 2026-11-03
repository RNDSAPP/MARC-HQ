import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './Topbar.css';

type Props = {
  projectName: string;
  projectHref: string;
  moduleLabel: string;
  searchPlaceholder: string;
  search: string;
  onSearch: (value: string) => void;
};

export default function Topbar({ projectName, projectHref, moduleLabel, searchPlaceholder, search, onSearch }: Props) {
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
    <header className="topbar">
      <nav aria-label="Fil d'Ariane">
        <ol className="topbar-crumbs">
          <li>
            <Link to="/" className="topbar-crumb">
              HQ
            </Link>
          </li>
          <li>
            <Link to={projectHref} className="topbar-crumb topbar-crumb--project">
              {projectName}
            </Link>
          </li>
          <li>
            <span className="topbar-crumb topbar-crumb--current" aria-current="page">
              {moduleLabel}
            </span>
          </li>
        </ol>
      </nav>

      <label className="topbar-search">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4 -4" />
        </svg>
        <span className="visually-hidden">Rechercher dans {projectName}</span>
        <input
          ref={inputRef}
          type="search"
          value={search}
          placeholder={searchPlaceholder}
          onChange={(event) => onSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') onSearch('');
          }}
        />
        <kbd className="topbar-kbd" aria-hidden="true">
          ⌘K
        </kbd>
      </label>
    </header>
  );
}
