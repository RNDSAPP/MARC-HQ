import { Link } from 'react-router-dom';
import type { Project } from '../data/types';
import { TOOLS } from '../data/sections';
import { compact } from '../lib/format';
import ModuleIcon from './ModuleIcon';
import './ProjectMap.css';

/** One line on what each tool is for, under its name. */
const TOOL_HINTS: Record<string, string> = {
  todo: 'Les tâches du projet',
  notes: 'Ce que tu notes en passant',
  idees: 'Les idées à creuser',
  mails: 'La boîte Gmail du projet',
  versions: 'Ce que contient chaque version',
  retours: 'Bugs et demandes des utilisateurs',
  objectifs: 'Où tu en es de tes objectifs',
  liens: 'Les adresses utiles',
  veille: 'Les comptes TikTok que tu suis',
  connexions: 'Les outils du projet, à ouvrir',
};

/**
 * At the bottom of a project's overview, the whole project on one screen: every module with its
 * key figure, then every tool with what it holds. The same order and icons as the side rail, so
 * finding your way is the same everywhere.
 */
export default function ProjectMap({ project, counts }: { project: Project; counts: Record<string, string> }) {
  const modules = project.modules.filter((module) => module.slug !== 'vue-d-ensemble');
  return (
    <section className="pmap" data-project={project.id} aria-labelledby="pmap-title">
      <div className="pmap-head">
        <h2 id="pmap-title" className="pmap-title">
          Tout {project.name}
        </h2>
        <span className="pmap-meta">
          {modules.length} rubriques · {TOOLS.length} outils
        </span>
      </div>

      <h3 className="pmap-group">Rubriques</h3>
      <ul className="pmap-grid">
        {modules.map((module) => (
          <li key={module.slug}>
            <Link to={`/${project.id}/${module.slug}`} className="pmap-tile pmap-tile--module">
              <span className="pmap-icon" aria-hidden="true">
                <ModuleIcon slug={module.slug} size={20} />
              </span>
              <span className="pmap-name">{module.label}</span>
              <span className="pmap-figure">
                <span className="pmap-num">{compact(module.heroNum)}</span>
                <span className="pmap-label">{module.heroLabel}</span>
              </span>
              <span className="pmap-line">{module.headline}</span>
            </Link>
          </li>
        ))}
      </ul>

      <h3 className="pmap-group">Outils</h3>
      <ul className="pmap-grid pmap-grid--tools">
        {TOOLS.map((tool) => (
          <li key={tool.slug}>
            <Link to={`/${project.id}/${tool.slug}`} className="pmap-tile pmap-tile--tool">
              <span className="pmap-icon" aria-hidden="true">
                <ModuleIcon slug={tool.slug} size={18} />
              </span>
              <span className="pmap-tool-text">
                <span className="pmap-name">{tool.label}</span>
                <span className="pmap-line">{TOOL_HINTS[tool.slug]}</span>
              </span>
              {counts[tool.slug] && <span className="pmap-count">{counts[tool.slug]}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
