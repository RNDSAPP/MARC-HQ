import { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import AgentCard from '../components/AgentCard';
import DataTable from '../components/DataTable';
import Hero from '../components/Hero';
import KpiStrip from '../components/KpiStrip';
import Pipeline from '../components/Pipeline';
import Sidebar from '../components/Sidebar';
import TabBar from '../components/TabBar';
import TodoList from '../components/TodoList';
import Topbar from '../components/Topbar';
import { getProjects } from '../data/api';
import type { PipelineColumn, ProjectId, TableRow } from '../data/types';
import { useData } from '../data/useData';
import { useSessionSet } from '../hooks/useSessionSet';
import { dayLabel } from '../lib/dates';
import './Workspace.css';

type Props = {
  project: ProjectId;
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** The workspace of one project: same screen for RNDS and Club 421, only the data changes. */
export default function Workspace({ project: projectId }: Props) {
  const { module: slug } = useParams();
  const projects = useData('projects', getProjects);
  const todos = useSessionSet(`marc-hq:todos:${projectId}`);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  // A new module starts with an empty search and no message.
  useEffect(() => {
    setSearch('');
    setNotice('');
  }, [slug]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const project = projects?.find((p) => p.id === projectId);
  const module = project?.modules.find((m) => m.slug === slug);
  const query = normalize(search.trim());

  const columns = useMemo<PipelineColumn[]>(() => {
    if (!project) return [];
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

  useEffect(() => {
    if (project && module) document.title = `${module.label} · ${project.name} · Marc HQ`;
  }, [project, module]);

  if (!projects || !project) return <div className="workspace-loading" data-project={projectId} />;
  if (!module) return <Navigate to={`/${projectId}/vue-d-ensemble`} replace />;

  const showAction = (label: string) =>
    setNotice(`« ${label} » n'est pas encore branché : ce sera fait avec les vraies données.`);

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
  const doneCount = project.todos.filter((todo) => todos.ids.has(todo.id)).length;

  return (
    <div className="workspace" data-project={project.id}>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <Sidebar current={project} projects={projects} />

      <main className="workspace-main" id="contenu" tabIndex={-1}>
        <Topbar
          projectName={project.name}
          projectHref={`/${project.id}/vue-d-ensemble`}
          moduleLabel={module.label}
          searchPlaceholder={project.searchPlaceholder}
          search={search}
          onSearch={setSearch}
        />

        <div className="workspace-body">
          <Hero
            eyebrow={`${project.name} · ${dayLabel()}`}
            headline={module.headline}
            sub={module.sub}
            cta={module.cta}
            heroLabel={module.heroLabel}
            heroNum={module.heroNum}
            heroDelta={module.heroDelta}
            series={module.series}
            onAction={showAction}
          />

          <KpiStrip kpis={module.kpis} />

          <div className="workspace-columns">
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
                <Pipeline columns={columns} hotAction={project.pipeline.hotAction} onAction={showAction} />
              )}
            </section>

            <aside className="workspace-aside" aria-label="Agents et tâches">
              <section className="workspace-agents" aria-labelledby="agents-title">
                <h2 id="agents-title" className="workspace-h2">
                  Tes agents
                </h2>
                {project.agents.map((agent) => (
                  <AgentCard key={agent.name} agent={agent} onAction={showAction} />
                ))}
              </section>

              <section aria-labelledby="todo-title">
                <div className="workspace-section-head workspace-todo-head">
                  <h2 id="todo-title" className="workspace-h2">
                    À faire
                  </h2>
                  <span className="workspace-meta">
                    {doneCount} / {project.todos.length}
                  </span>
                </div>
                <TodoList todos={project.todos} done={todos.ids} onToggle={todos.toggle} />
              </section>
            </aside>
          </div>
        </div>
      </main>

      <TabBar project={project} />

      <p className="workspace-notice" role="status">
        {notice}
      </p>
    </div>
  );
}
