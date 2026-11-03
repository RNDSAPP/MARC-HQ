import { useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, useParams } from 'react-router-dom';
import Activity from '../components/Activity';
import AgentCard from '../components/AgentCard';
import { ProjectScene } from '../components/Building';
import DataTable from '../components/DataTable';
import Hero from '../components/Hero';
import KpiStrip from '../components/KpiStrip';
import Pipeline from '../components/Pipeline';
import StatPanel from '../components/StatPanel';
import TabBar from '../components/TabBar';
import WorkspaceHeader from '../components/WorkspaceHeader';
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

  return (
    <div className="workspace" data-project={project.id}>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>

      <div className="workspace-main">
        <WorkspaceHeader project={project} projects={projects} search={search} onSearch={setSearch} />

        <main className="workspace-body" id="contenu" tabIndex={-1}>
          <div className="workspace-stage">
            <div className="workspace-center">
              <Hero eyebrow={`${project.name} · ${dayLabel()}`} headline={module.headline} sub={module.sub} cta={module.cta} onAction={showAction} />

              <nav className="workspace-pills" aria-label={`Rubriques ${project.name}`}>
                {project.modules.map((item) => (
                  <NavLink key={item.slug} to={`/${project.id}/${item.slug}`} className="workspace-pill">
                    {item.label}
                    {item.count && <span className="workspace-pill-count">{item.count}</span>}
                  </NavLink>
                ))}
              </nav>

              <ProjectScene project={project} current={module.slug} />
            </div>

            <div className="workspace-side">
              <section className="workspace-group" aria-labelledby="agents-title">
                <h2 id="agents-title" className="workspace-h3">
                  Agents <span className="workspace-h3-count">{project.agents.length}</span>
                </h2>
                {project.agents.map((agent) => (
                  <AgentCard key={agent.name} agent={agent} onAction={showAction} />
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
              <Pipeline columns={columns} hotAction={project.pipeline.hotAction} onAction={showAction} />
            )}
          </section>
        </main>
      </div>

      <aside className="workspace-panel" aria-label={`${module.label} : chiffre clé et tâches`}>
        <p className="workspace-panel-title">
          <span className="workspace-panel-light">{project.space}</span>
          <span className="workspace-panel-bold">{module.label}</span>
        </p>
        <StatPanel label={module.heroLabel} value={module.heroNum} delta={module.heroDelta} series={module.series} />
        <Activity todos={project.todos} done={todos.ids} onToggle={todos.toggle} />
      </aside>

      <TabBar project={project} />

      <p className="workspace-notice" role="status">
        {notice}
      </p>
    </div>
  );
}
