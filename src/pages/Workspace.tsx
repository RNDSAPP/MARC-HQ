import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import Activity from '../components/Activity';
import AgentCard from '../components/AgentCard';
import AppRail from '../components/AppRail';
import { ProjectScene } from '../components/Building';
import DataTable from '../components/DataTable';
import EntitySheet from '../components/EntitySheet';
import type { Entity } from '../components/EntitySheet';
import Hero from '../components/Hero';
import KpiStrip from '../components/KpiStrip';
import Pipeline from '../components/Pipeline';
import { AmbassadorsPlaza, AppStorePanel, LiveReviewCards, FollowerCards, FollowersScene, PipelineCity, PostCards, RevenueCards, RevenueScene, ReviewCards, StudioScene } from '../components/Scenes';
import logo421 from '../assets/logo-421-blanc.svg';
import logoRnds from '../assets/logo-rnds.svg';
import StatPanel from '../components/StatPanel';
import TabBar from '../components/TabBar';
import WorkspaceHeader from '../components/WorkspaceHeader';
import ModuleStrip from '../components/ModuleStrip';
import { useCustomProjects, useProjects } from '../data/customProjects';
import { TOOLS, isTool } from '../data/sections';
import ProjectMap from '../components/ProjectMap';
import { useAppStore } from '../lib/appstore';
import { useCalendarSync } from '../lib/calendar';
import AccountGate from '../components/AccountGate';
import AgentDialog from '../components/AgentDialog';
import { ago, useLiveAgents } from '../lib/agents';
import { useFeedback, useGoals, useIdeas, useLinks, useNotes, useTasks, useVersions } from '../data/tools';
import type { PipelineColumn, Project, ProjectId, TableRow } from '../data/types';
import { dayLabel, isoDate } from '../lib/dates';
import { statusTone } from '../lib/format';
import IdeasPage from './tools/IdeasPage';
import NotesPage from './tools/NotesPage';
import TodoPage from './tools/TodoPage';
import FeedbackPage from './tools/FeedbackPage';
import GoalsPage from './tools/GoalsPage';
import LinksPage from './tools/LinksPage';
import VersionsPage from './tools/VersionsPage';
import ConnectionsPage from './tools/ConnectionsPage';
import './Workspace.css';

type Props = {
  project: ProjectId;
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** The workspace of one project: same screens for every project, only the data changes. */
export default function Workspace({ project: projectId }: Props) {
  const { module: slug } = useParams();
  const projects = useProjects();
  const project = projects?.find((p) => p.id === projectId);

  if (!projects) return <div className="workspace-loading" data-project={projectId} />;
  // An address that matches no project (a deleted one, a typo) goes back home
  if (!project) return <Navigate to="/" replace />;
  if (!slug || (!isTool(slug) && !project.modules.some((m) => m.slug === slug))) {
    return <Navigate to={`/${projectId}/vue-d-ensemble`} replace />;
  }
  return <ProjectWorkspace project={project} projects={projects} slug={slug} />;
}

function ProjectWorkspace({ project, projects, slug }: { project: Project; projects: Project[]; slug: string }) {
  const tasks = useTasks(project);
  const notes = useNotes(project);
  const ideas = useIdeas(project);
  const versions = useVersions(project);
  const feedback = useFeedback(project);
  const goals = useGoals(project);
  const links = useLinks(project);
  // The project's Google calendar, kept in step with its dated tasks, soirées and meetings
  const calendar = useCalendarSync(project, tasks.tasks);
  const { remove: removeProject } = useCustomProjects();
  const navigate = useNavigate();
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
    setNotice(
      label.startsWith('Confié aux agents')
        ? 'Demande confiée aux agents : elle apparaît sous les agents jusqu’à ce qu’un agent la termine.'
        : `« ${label} » n'est pas encore branché : ce sera fait avec les vraies données.`,
    );

  const placeholder = tool ? `Rechercher dans ${tool.label === 'To do' ? 'les tâches' : `les ${tool.label.toLowerCase()}`}` : project.searchPlaceholder;

  return (
    <div className={`workspace${tool ? ' workspace--tool' : ''}`} data-project={project.id}>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <AppRail projects={projects} current={project} />

      <div className="workspace-main">
        <WorkspaceHeader project={project} projects={projects} search={search} onSearch={setSearch} placeholder={placeholder} />
        <ModuleStrip project={project} />

        <main className="workspace-body" id="contenu" tabIndex={-1}>
          {tool?.slug === 'todo' && <TodoPage tasks={tasks.tasks} query={matches} onAdd={tasks.add} onToggle={tasks.toggle} onRemove={tasks.remove} />}
          {tool?.slug === 'todo' && calendar.session === null && (
            <AccountGate
              title="Retrouve tes tâches partout"
              text="Pour l'instant, tes tâches restent sur cet appareil. Connecte-toi à Marc HQ : elles seront les mêmes sur ton Mac, ton téléphone et le site, et iront dans ton Google Agenda."
            />
          )}
          {tool?.slug === 'notes' && <NotesPage notes={notes.notes} query={matches} onAdd={notes.add} onUpdate={notes.update} onRemove={notes.remove} />}
          {tool?.slug === 'idees' && <IdeasPage ideas={ideas.ideas} query={matches} onAdd={ideas.add} onUpdate={ideas.update} onRemove={ideas.remove} />}
          {tool?.slug === 'versions' && <VersionsPage api={versions} query={matches} />}
          {tool?.slug === 'retours' && <FeedbackPage api={feedback} query={matches} />}
          {tool?.slug === 'objectifs' && <GoalsPage api={goals} query={matches} />}
          {tool?.slug === 'liens' && <LinksPage api={links} query={matches} />}
          {tool?.slug === 'connexions' && (
            <ConnectionsPage
              project={project}
              calendar={calendar}
              query={matches}
              onRemoveProject={
                project.custom
                  ? () => {
                      removeProject(project.id);
                      navigate('/');
                    }
                  : undefined
              }
            />
          )}
          {module && (
            <ModuleView
              project={project}
              module={module}
              columns={columns}
              rows={rows}
              query={query}
              onAction={showAction}
              onAddTask={(text) => {
                tasks.add(text, isoDate(new Date(Date.now() + 86400000)));
                setNotice(`Tâche ajoutée pour demain : « ${text} ».`);
              }}
            />
          )}
          {module?.slug === 'vue-d-ensemble' && (
            <ProjectMap
              project={project}
              counts={{
                todo: `${tasks.tasks.filter((task) => !task.done).length}`,
                notes: `${notes.notes.length}`,
                idees: `${ideas.ideas.length}`,
                versions: `${versions.versions.length}`,
                retours: `${feedback.items.length}`,
                objectifs: `${goals.goals.length}`,
                liens: `${links.links.length}`,
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
  onAddTask: (text: string) => void;
};

/** A module's dashboard: title and scene, agents and figures, then its pipeline or table. */
function ModuleView({ project, module, columns, rows, query, onAction, onAddTask }: ModuleViewProps) {
  // App Store Connect, live once signed in (the App Store module only)
  const store = useAppStore(project.id, module.slug === 'app-store');
  // "Confier à l'agent": the request sheet, and the requests still being worked on
  const [handing, setHanding] = useState<string | null>(null);
  const live = useLiveAgents();
  const pending = live.requests.filter((r) => r.project_id === project.id && r.status !== 'faite');
  const [open, setOpen] = useState<string | null>(null);
  const entity = open ? findEntity(project, module, open) : null;
  const navigate = useNavigate();
  const isPipeline = module.view.kind === 'pipeline';
  const listTitle = store.data ? 'Avis sur l’App Store' : module.view.kind === 'table' ? module.view.title : project.pipeline.title;
  const total = isPipeline
    ? project.pipeline.columns.reduce((sum, column) => sum + column.cards.length, 0)
    : module.view.kind === 'table'
      ? module.view.rows.length
      : 0;
  const shown = isPipeline ? columns.reduce((sum, column) => sum + column.cards.length, 0) : rows.length;
  const unit = isPipeline ? 'au total' : 'lignes';
  const listMeta = store.data ? `${store.data.reviews.length} avis écrits` : query ? `${shown} sur ${total}` : `${total} ${unit}`;

  return (
    <>
      <div className="workspace-stage">
        <div className="workspace-center">
          <Hero
            eyebrow={`${project.name} · ${dayLabel()}`}
            headline={module.headline}
            sub={module.sub}
            cta={module.cta}
            onAction={(label) => (label === 'Confier à l’agent' && live.ready ? setHanding(module.headline) : project.custom && label === module.cta ? navigate(`/${project.id}/connexions`) : onAction(label))}
          />
          {module.view.kind === 'pipeline' && module.slug !== 'vue-d-ensemble' ? (
            <PipelineCity project={project} module={module} onSelect={setOpen} />
          ) : module.slug === 'ambassadeurs' ? (
            <AmbassadorsPlaza project={project} module={module} onSelect={setOpen} />
          ) : module.slug === 'revenus' ? (
            <RevenueScene project={project} module={module} onSelect={setOpen} />
          ) : module.slug === 'abonnes' ? (
            <FollowersScene project={project} module={module} onSelect={setOpen} />
          ) : module.slug === 'publications' ? (
            <StudioScene project={project} module={module} icon={logoRnds} onSelect={setOpen} />
          ) : module.slug === 'app-store' ? (
            <>
              <AppStorePanel project={project} module={module} rating={module.heroNum} icon={project.id === 'rnds' ? logoRnds : logo421} live={store.data} />
              {store.session === null && (
                <AccountGate
                  title="Voir les vrais avis"
                  text={`Connecte-toi à Marc HQ avec ton adresse : la fiche, les versions et les avis de ${project.name} viendront en direct d'App Store Connect, et tu pourras y répondre.`}
                />
              )}
              {store.error && (
                <p className="mail-message" role="status">
                  {store.error}
                </p>
              )}
            </>
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
            {pending.length > 0 && (
              <ul className="agent-requests" aria-label="Demandes confiées aux agents">
                {pending.map((request) => (
                  <li key={request.id} className="agent-request">
                    {request.text}
                    <span className="agent-request-meta">
                      {request.status === 'prise' ? `Prise par ${request.agent ?? 'un agent'}` : 'En attente d’un agent'} · {ago(request.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {project.agents.length === 0 && (
              <p className="workspace-empty">
                Pas encore d'agent pour ce projet. Ouvre Claude depuis <Link to={`/${project.id}/connexions`}>Connexions</Link>.
              </p>
            )}
          </section>

          <section className="workspace-group" aria-labelledby="figures-title">
            <h2 id="figures-title" className="workspace-h3">
              Chiffres <span className="workspace-h3-count">{module.kpis.length}</span>
            </h2>
            {module.kpis.length > 0 ? (
              <KpiStrip kpis={module.kpis} />
            ) : (
              <p className="workspace-empty">
                Pas encore de chiffres. Fixe-toi un <Link to={`/${project.id}/objectifs`}>objectif</Link>, et retrouve tes outils dans{' '}
                <Link to={`/${project.id}/connexions`}>Connexions</Link>.
              </p>
            )}
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
        {module.slug === 'app-store' && store.data ? (
          <LiveReviewCards reviews={store.data.reviews.filter((r) => !query || normalize(`${r.title} ${r.body} ${r.nickname}`).includes(query))} onReply={store.reply} />
        ) : module.slug === 'app-store' ? (
          <ReviewCards rows={rows} onOpen={setOpen} onAction={onAction} />
        ) : module.slug === 'revenus' ? (
          <RevenueCards rows={rows} onOpen={setOpen} />
        ) : module.slug === 'abonnes' ? (
          <FollowerCards rows={rows} onOpen={setOpen} />
        ) : module.slug === 'publications' ? (
          <PostCards rows={rows} onOpen={setOpen} onAction={onAction} />
        ) : module.view.kind === 'table' ? (
          <DataTable caption={listTitle} columns={module.view.columns} rows={rows} onOpen={setOpen} />
        ) : (
          <Pipeline columns={columns} hotAction={project.pipeline.hotAction} onAction={onAction} onOpen={setOpen} />
        )}
      </section>

      {entity && <EntitySheet project={project} entity={entity} onClose={() => setOpen(null)} onAction={onAction} onAddTask={onAddTask} />}
      {handing !== null && (
        <AgentDialog
          projectId={project.id}
          projectName={project.name}
          draft={handing}
          onClose={() => setHanding(null)}
          onSent={(text) => {
            setHanding(null);
            onAction(`Confié aux agents : ${text}`);
          }}
        />
      )}
    </>
  );
}

/** What the card shows for a name opened on the scene, the pipeline or the table. */
function findEntity(project: Project, module: Project['modules'][number], name: string): Entity | null {
  for (const column of project.pipeline.columns) {
    const card = column.cards.find((c) => c.name === name);
    if (!card) continue;
    const [where, size] = card.meta.split(' · ');
    const facts: [string, string][] = [['Étape', column.name]];
    if (where) facts.push([project.id === 'rnds' ? 'Lieu' : 'Type', where]);
    if (size) facts.push([project.id === 'rnds' ? 'Membres' : 'Contact', size]);
    facts.push(['Prochaine étape', card.when]);
    return { name, stage: column.name, tone: column.tone, facts, action: column.hot ? project.pipeline.hotAction : undefined };
  }
  if (module.view.kind === 'table') {
    const row = module.view.rows.find((r) => r[0] === name);
    if (!row) return null;
    const status = row[3];
    const tone = statusTone(status);
    // "À relancer" gives the action "Relancer", "À valider" gives "Valider"…
    const action = status.startsWith('À ') ? status.charAt(2).toUpperCase() + status.slice(3) : undefined;
    return {
      name,
      stage: status,
      tone: tone === 'good' ? 'accent' : tone === 'warn' ? 'alert' : 'muted',
      facts: module.view.columns.slice(1).map((label, i): [string, string] => [label, row[i + 1]]),
      action,
    };
  }
  return null;
}
