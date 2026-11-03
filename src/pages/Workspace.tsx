import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import Activity from '../components/Activity';
import AgentCard from '../components/AgentCard';
import AppRail from '../components/AppRail';
import { ProjectScene } from '../components/Building';
import DataTable from '../components/DataTable';
import Hero from '../components/Hero';
import KpiStrip from '../components/KpiStrip';
import Pipeline from '../components/Pipeline';
import { AmbassadorsPlaza, PipelineCity } from '../components/Scenes';
import StatPanel from '../components/StatPanel';
import TabBar from '../components/TabBar';
import WorkspaceHeader from '../components/WorkspaceHeader';
import { getProjects } from '../data/api';
import { TOOLS, isTool } from '../data/sections';
import { useIdeas, useNotes, useTasks } from '../data/tools';
import type { PipelineColumn, Project, ProjectId, TableRow } from '../data/types';
import { useData } from '../data/useData';
import { dayLabel } from '../lib/dates';
import IdeasPage from './tools/IdeasPage';
import NotesPage from './tools/NotesPage';
import TodoPage from './tools/TodoPage';
import './Workspace.css';

type Props = {
  project: ProjectId;
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** The workspace of one project: same screens for RNDS and Club 421, only the data changes. */
export default function Workspace({ project: projectId }: Props) {
  const { module: slug } = useParams();
  const projects = useData('projects', getProjects);
  const project = projects?.find((p) => p.id === projectId);

  if (!projects || !project) return <div className="workspace-loading" data-project={projectId} />;
  if (!slug || (!isTool(slug) && !project.modules.some((m) => m.slug === slug))) {
    return <Navigate to={`/${projectId}/vue-d-ensemble`} replace />;
  }
  return <ProjectWorkspace project={project} projects={projects} slug={slug} />;
}

function ProjectWorkspace({ project, projects, slug }: { project: Project; projects: Project[]; slug: string }) {
  const tasks = useTasks(project);
  const notes = useNotes(project);
  const ideas = useIdeas(project);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  // A new page starts with an empty search and no message.
  useEffect(() => {
    setSearch('');
    setNotice('');
  }, [slug]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const tool = TOOLS.find((item) => item.slug === slug);
  const module = project.modules.find((m) => m.slug === slug);
  const query = normalize(search.trim());
  const matches = (text: string) => !query || normalize(text).includes(query);

  const columns = useMemo<PipelineColumn[]>(() => {
    if (!query) return project.pipeline.columns;
    return project.pipeline.columns.map((column) => ({
      ...column,
      cards: column.cards.filter((card) => normalize(`${card.name} ${card.meta}`).includes(query)),
    }));
  }, [project, query]);

  const rows = useMemo<TableRow[]>(() => {
    if (module?.view.kind !== 'table') return [];
    if (!query) return module.view.rows;
    return module.view.rows.filter((row) => normalize(row.join(' ')).includes(query));
  }, [module, query]);

  const pageLabel = tool?.label ?? module?.label ?? '';
  useEffect(() => {
    document.title = `${pageLabel} · ${project.name} · Marc HQ`;
  }, [pageLabel, project.name]);

  const showAction = (label: string) =>
    setNotice(`« ${label} » n'est pas encore branché : ce sera fait avec les vraies données.`);

  const placeholder = tool ? `Rechercher dans ${tool.label === 'To do' ? 'les tâches' : `les ${tool.label.toLowerCase()}`}` : project.searchPlaceholder;

  return (
    <div className={`workspace${tool ? ' workspace--tool' : ''}`} data-project={project.id}>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <AppRail projects={projects} current={project} />

      <div className="workspace-main">
        <WorkspaceHeader project={project} projects={projects} search={search} onSearch={setSearch} placeholder={placeholder} />

        <main className="workspace-body" id="contenu" tabIndex={-1}>
          {tool?.slug === 'todo' && <TodoPage tasks={tasks.tasks} query={matches} onAdd={tasks.add} onToggle={tasks.toggle} onRemove={tasks.remove} />}
          {tool?.slug === 'notes' && <NotesPage notes={notes.notes} query={matches} onAdd={notes.add} onUpdate={notes.update} onRemove={notes.remove} />}
          {tool?.slug === 'idees' && <IdeasPage ideas={ideas.ideas} query={matches} onAdd={ideas.add} onUpdate={ideas.update} onRemove={ideas.remove} />}
          {module && (
            <ModuleView
              project={project}
              module={module}
              columns={columns}
              rows={rows}
              query={query}
              onAction={showAction}
              onPick={(name) => {
                setSearch(name);
                document.getElementById('list-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
          )}
        </main>
      </div>

      {module && (
        <aside className="workspace-panel" aria-label={`${module.label} : chiffre clé et tâches`}>
          <p className="workspace-panel-title">
            <span className="workspace-panel-light">{project.space}</span>
            <span className="workspace-panel-bold">{module.label}</span>
          </p>
          <StatPanel label={module.heroLabel} value={module.heroNum} delta={module.heroDelta} series={module.series} />
          <Activity tasks={tasks.tasks} onToggle={tasks.toggle} allHref={`/${project.id}/todo`} />
        </aside>
      )}

      <TabBar project={project} />

      <p className="workspace-notice" role="status">
        {notice}
      </p>
    </div>
  );
}

type ModuleViewProps = {
  project: Project;
  module: Project['modules'][number];
  columns: PipelineColumn[];
  rows: TableRow[];
  query: string;
  onAction: (label: string) => void;
  /** A name tapped on the scene: filter the list below on it. */
  onPick: (name: string) => void;
};

/** A module's dashboard: title and scene, agents and figures, then its pipeline or table. */
function ModuleView({ project, module, columns, rows, query, onAction, onPick }: ModuleViewProps) {
  const isPipeline = module.view.kind === 'pipeline';
  const listTitle = module.view.kind === 'table' ? module.view.title : project.pipeline.title;
  const total = isPipeline
    ? project.pipeline.columns.reduce((sum, column) => sum + column.cards.length, 0)
    : module.view.kind === 'table'
      ? module.view.rows.length
      : 0;
  const shown = isPipeline ? columns.reduce((sum, column) => sum + column.cards.length, 0) : rows.length;
  const unit = isPipeline ? 'au total' : 'lignes';
  const listMeta = query ? `${shown} sur ${total}` : `${total} ${unit}`;

  return (
    <>
      <div className="workspace-stage">
        <div className="workspace-center">
          <Hero eyebrow={`${project.name} · ${dayLabel()}`} headline={module.headline} sub={module.sub} cta={module.cta} onAction={onAction} />
          {module.view.kind === 'pipeline' && module.slug !== 'vue-d-ensemble' ? (
            <PipelineCity project={project} module={module} onPick={onPick} />
          ) : module.slug === 'ambassadeurs' ? (
            <AmbassadorsPlaza project={project} module={module} onPick={onPick} />
          ) : (
            <ProjectScene project={project} current={module.slug} />
          )}
        </div>

        <div className="workspace-side">
          <section className="workspace-group" aria-labelledby="agents-title">
            <h2 id="agents-title" className="workspace-h3">
              Agents <span className="workspace-h3-count">{project.agents.length}</span>
            </h2>
            {project.agents.map((agent) => (
              <AgentCard key={agent.name} agent={agent} onAction={onAction} />
            ))}
          </section>

          <section className="workspace-group" aria-labelledby="figures-title">
            <h2 id="figures-title" className="workspace-h3">
              Chiffres <span className="workspace-h3-count">{module.kpis.length}</span>
            </h2>
            <KpiStrip kpis={module.kpis} />
          </section>
        </div>
      </div>

      <section className="workspace-list" aria-labelledby="list-title">
        <div className="workspace-section-head">
          <h2 id="list-title" className="workspace-h2">
            {listTitle}
          </h2>
          <span className="workspace-meta" aria-live="polite">
            {listMeta}
          </span>
        </div>
        {module.view.kind === 'table' ? (
          <DataTable caption={listTitle} columns={module.view.columns} rows={rows} />
        ) : (
          <Pipeline columns={columns} hotAction={project.pipeline.hotAction} onAction={onAction} />
        )}
      </section>
    </>
  );
}
