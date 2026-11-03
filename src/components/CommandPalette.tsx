import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getProjects } from '../data/api';
import { TOOLS } from '../data/sections';
import { useIdeas, useNotes, useTasks } from '../data/tools';
import type { Project } from '../data/types';
import { useData } from '../data/useData';
import { isoDate } from '../lib/dates';
import ModuleIcon from './ModuleIcon';
import './CommandPalette.css';

type Command = { id: string; group: string; label: string; hint?: string; icon: string; run: () => void };

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/**
 * ⌘K (or Ctrl+K) anywhere: go to any page by typing its name, or add a task, a note or an idea
 * to the open project without leaving the page.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const projects = useData('projects', getProjects);
  const { pathname } = useLocation();
  const current = projects?.find((p) => pathname.startsWith(`/${p.id}`));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  if (!open || !projects) return null;
  return current ? (
    <WithProject key={current.id} project={current} projects={projects} onClose={() => setOpen(false)} />
  ) : (
    <Palette projects={projects} onClose={() => setOpen(false)} />
  );
}

/** The open project's add actions need its stores. */
function WithProject({ project, projects, onClose }: { project: Project; projects: Project[]; onClose: () => void }) {
  const tasks = useTasks(project);
  const notes = useNotes(project);
  const ideas = useIdeas(project);
  const navigate = useNavigate();
  const adds = (text: string): Command[] =>
    text
      ? [
          {
            id: 'add-task',
            group: `Ajouter à ${project.name}`,
            label: `Tâche : « ${text} »`,
            hint: "pour aujourd'hui",
            icon: 'todo',
            run: () => {
              tasks.add(text, isoDate());
              navigate(`/${project.id}/todo`);
            },
          },
          {
            id: 'add-idea',
            group: `Ajouter à ${project.name}`,
            label: `Idée : « ${text} »`,
            icon: 'idees',
            run: () => {
              ideas.add(text);
              navigate(`/${project.id}/idees`);
            },
          },
          {
            id: 'add-note',
            group: `Ajouter à ${project.name}`,
            label: `Note : « ${text} »`,
            icon: 'notes',
            run: () => {
              const id = notes.add();
              notes.update(id, { title: text });
              navigate(`/${project.id}/notes`);
            },
          },
        ]
      : [];
  return <Palette projects={projects} current={project} adds={adds} onClose={onClose} />;
}

function Palette({ projects, current, adds, onClose }: {
  projects: Project[];
  current?: Project;
  adds?: (text: string) => Command[];
  onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => input.current?.focus(), []);

  const pages = useMemo<Command[]>(() => {
    const list: Command[] = [{ id: 'home', group: 'Aller à', label: 'Accueil Marc HQ', icon: 'vue-d-ensemble', run: () => navigate('/') }];
    // The open project first
    const ordered = current ? [current, ...projects.filter((p) => p.id !== current.id)] : projects;
    for (const project of ordered) {
      for (const module of project.modules) {
        list.push({ id: `${project.id}-${module.slug}`, group: 'Aller à', label: `${project.name} · ${module.label}`, icon: module.slug, run: () => navigate(`/${project.id}/${module.slug}`) });
      }
      for (const tool of TOOLS) {
        list.push({ id: `${project.id}-${tool.slug}`, group: 'Aller à', label: `${project.name} · ${tool.label}`, icon: tool.slug, run: () => navigate(`/${project.id}/${tool.slug}`) });
      }
    }
    return list;
  }, [projects, current, navigate]);

  const query = normalize(text.trim());
  const results = [...(adds?.(text.trim()) ?? []), ...pages.filter((c) => !query || normalize(c.label).includes(query)).slice(0, 12)];
  const safeActive = Math.min(active, Math.max(results.length - 1, 0));

  const run = (command?: Command) => {
    if (!command) return;
    command.run();
    onClose();
  };

  return (
    <div className="palette-layer">
      <button type="button" className="palette-shade" aria-label="Fermer" onClick={onClose} />
      <div className="palette" role="dialog" aria-modal="true" aria-label="Aller à ou ajouter">
        <div className="palette-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4 -4" />
          </svg>
          <input
            ref={input}
            value={text}
            placeholder={current ? `Aller à… ou ajouter à ${current.name}` : 'Aller à…'}
            aria-label="Aller à ou ajouter"
            aria-activedescendant={results[safeActive] ? `palette-${results[safeActive].id}` : undefined}
            onChange={(event) => {
              setText(event.target.value);
              setActive(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((i) => Math.min(i + 1, results.length - 1));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              }
              if (event.key === 'Enter') run(results[safeActive]);
            }}
          />
          <kbd className="palette-esc">Échap</kbd>
        </div>
        <ul className="palette-list" role="listbox" aria-label="Résultats">
          {results.map((command, index) => {
            const first = index === 0 || results[index - 1].group !== command.group;
            return (
              <li key={command.id} role="presentation">
                {first && <p className="palette-group">{command.group}</p>}
                <button
                  type="button"
                  id={`palette-${command.id}`}
                  role="option"
                  aria-selected={index === safeActive}
                  className={`palette-item${index === safeActive ? ' palette-item--active' : ''}`}
                  onPointerEnter={() => setActive(index)}
                  onClick={() => run(command)}
                >
                  <ModuleIcon slug={command.icon} size={18} />
                  <span className="palette-label">{command.label}</span>
                  {command.hint && <span className="palette-hint">{command.hint}</span>}
                </button>
              </li>
            );
          })}
          {results.length === 0 && <li className="palette-empty">Rien ne correspond.</li>}
        </ul>
      </div>
    </div>
  );
}
