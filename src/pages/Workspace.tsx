import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import RecordDialog from '../components/RecordDialog';
import { kindOf, nameOf, recordsReady, saveRecord, useRecords } from '../lib/records';
import type { RecordKind, RecordRow } from '../lib/records';
import { ago, handToAgent, useLiveAgents } from '../lib/agents';
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
import TemplatesPage, { TemplatesWidget, useTemplates } from './tools/TemplatesPage';
import VeillePage from './tools/VeillePage';
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
  const templates = useTemplates(project.id);
  // The project's Google calendar, kept in step with its dated tasks, soirées and meetings
  const calendar = useCalendarSync(project, tasks.tasks, tasks.loaded && recordsReady());
  const { remove: removeProject } = useCustomProjects();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  // A new page starts with an empty search and no message (not on the first one, which may come
  // with its own message, from a notification)
  const firstPage = useRef(true);
  useEffect(() => {
    if (firstPage.current) {
      firstPage.current = false;
      return;
    }
    setSearch('');
    setNotice('');
  }, [slug]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // From the "à relancer" notification (/rnds/todo?relancer=Club A|Club B): a "Relancer …" task
  // for today for each, unless one is already open; then the address is cleaned
  const [params, setParams] = useSearchParams();
  const chase = params.get('relancer');
  const chased = useRef('');
  useEffect(() => {
    if (!chase || !tasks.loaded || chased.current === chase) return;
    chased.current = chase;
    const names = chase.split('|').map((name) => name.trim()).filter(Boolean);
    const added = names.filter((name) => !tasks.tasks.some((task) => !task.done && task.text === `Relancer ${name}`));
    added.forEach((name) => tasks.add(`Relancer ${name}`, isoDate()));
    setNotice(added.length ? `${added.length} tâche${added.length > 1 ? 's' : ''} « Relancer » ajoutée${added.length > 1 ? 's' : ''} pour aujourd’hui.` : 'Les relances sont déjà dans tes tâches.');
    setParams({}, { replace: true });
  }, [chase, tasks, setParams]);

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
        : label.startsWith('Fiche : ')
          ? label.slice(8)
          : label.startsWith('Signé : ')
            ? `${label.slice(8)} passe dans les affiliés.`
            : label.startsWith('Validé : ')
              ? `${label.slice(9)} est prêt.`
              : label.startsWith('Exporté : ')
                ? `${label.slice(10)} téléchargé.`
                : `« ${label} » n'est pas encore branché.`,
    );

  const placeholder = tool ? `Rechercher dans ${tool.label === 'To do' ? 'les tâches' : tool.label === 'Veille' ? 'ta veille' : `les ${tool.label.toLowerCase()}`}` : project.searchPlaceholder;

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
          {tool?.slug === 'todo' && <TodoPage tasks={tasks.tasks} failed={tasks.failed} query={matches} onAdd={tasks.add} onToggle={tasks.toggle} onRemove={tasks.remove} />}
          {tool?.slug === 'todo' && calendar.session === null && (
            <AccountGate
              title="Retrouve tes tâches partout"
              text="Pour l'instant, tes tâches restent sur cet appareil. Connecte-toi à Marc HQ : elles seront les mêmes sur ton Mac, ton téléphone et le site, et iront dans ton Google Agenda."
            />
          )}
          {tool?.slug === 'notes' && <NotesPage notes={notes.notes} query={matches} onAdd={notes.add} onUpdate={notes.update} onRemove={notes.remove} />}
          {tool?.slug === 'idees' && <IdeasPage ideas={ideas.ideas} query={matches} onAdd={ideas.add} onUpdate={ideas.update} onRemove={ideas.remove} />}
          {tool?.slug === 'versions' && <VersionsPage api={versions} query={matches} projectId={project.id} />}
          {tool?.slug === 'retours' && <FeedbackPage api={feedback} query={matches} />}
          {tool?.slug === 'objectifs' && <GoalsPage api={goals} query={matches} />}
          {tool?.slug === 'veille' && <VeillePage project={project} query={matches} />}
          {tool?.slug === 'modeles' && <TemplatesPage project={project} query={matches} />}
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
                modeles: `${templates.length}`,
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
  const [opened, setOpen] = useState<string | null>(null);
  const navigate = useNavigate();
  // What Marc added (clubs, ambassadors, BDE, soirées, posts): a tap opens its sheet to change it
  const records = useRecords().filter((r) => r.project_id === project.id);
  const [editing, setEditing] = useState<{ kind: RecordKind; record?: RecordRow } | null>(null);
  const recordNamed = (name: string) => records.find((r) => nameOf(r) === name);
  const open = (name: string) => {
    const record = recordNamed(name);
    if (record) setEditing({ kind: record.kind, record });
    else setOpen(name);
  };
  const entity = opened ? findEntity(project, module, opened) : null;

  /** Every button of the page: add, sign, chase up, validate, export… */
  const act = (label: string) => {
    if (label === module.cta) {
      const kind = kindOf(project, module.slug);
      if (kind) return setEditing({ kind });
      if (module.slug === 'abonnes') return navigate(`/${project.id}/objectifs`);
      if (module.slug === 'revenus') return exportTable(project, module, onAction);
      if (module.slug === 'app-store') return document.querySelector('.workspace-list')?.scrollIntoView({ behavior: 'smooth' });
    }
    const [verb, ...rest] = label.split(' : ');
    const name = rest.join(' : ');
    const record = name ? recordNamed(name) : undefined;
    if (record && verb === 'Signer') {
      saveRecord(project.id, record.kind, { ...record.data, stage: project.id === 'club421' ? 'Partenaires' : 'Affiliés' }, record.id).then((failed) => onAction(failed || `Signé : ${name}`));
      return;
    }
    if (record && verb === 'Valider') {
      saveRecord(project.id, record.kind, { ...record.data, status: 'Prêt' }, record.id).then((failed) => onAction(failed || `Validé : ${name}`));
      return;
    }
    if (name && verb === 'Relancer') return onAddTask(`Relancer ${name}`);
    if (project.agents.some((agent) => agent.name === name)) return setHanding(`Pour ${name} : `);
    onAction(label);
  };
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
            onAction={(label) => (label === 'Confier à l’agent' && live.ready ? setHanding(module.headline) : project.custom && label === module.cta ? navigate(`/${project.id}/connexions`) : act(label))}
          />
          {module.view.kind === 'pipeline' && module.slug !== 'vue-d-ensemble' ? (
            <PipelineCity project={project} module={module} onSelect={open} />
          ) : module.slug === 'ambassadeurs' ? (
            <AmbassadorsPlaza project={project} module={module} onSelect={open} />
          ) : module.slug === 'revenus' ? (
            <RevenueScene project={project} module={module} onSelect={open} />
          ) : module.slug === 'abonnes' ? (
            <FollowersScene project={project} module={module} onSelect={open} />
          ) : module.slug === 'publications' ? (
            <>
              <StudioScene project={project} module={module} icon={logoRnds} onSelect={open} />
              <TemplatesWidget project={project} />
            </>
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
              <AgentCard key={agent.name} agent={agent} onAction={act} />
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
                Pas encore d'agent actif. Dans Claude Code, tes agents se signalent ici tout seuls quand ils travaillent sur {project.name}.
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
          <LiveReviewCards
            reviews={store.data.reviews.filter((r) => !query || normalize(`${r.title} ${r.body} ${r.nickname}`).includes(query))}
            onReply={store.reply}
            drafts={Object.fromEntries(live.requests.filter((r) => r.review_id && r.project_id === project.id).map((r) => [r.review_id as string, { status: r.status, answer: r.answer }]))}
            onAskDraft={(review) =>
              handToAgent(
                project.id,
                `Brouillon de réponse à un avis App Store ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)} de ${review.nickname || 'un utilisateur'} : « ${[review.title, review.body].filter(Boolean).join(' — ')} ». Réponds dans la langue de l'avis, court et chaleureux, signé de l'équipe ${project.name}. Mets seulement le texte de la réponse dans « fini » : Marc l'envoie tel quel en un appui.`,
                review.id,
              )
            }
          />
        ) : module.slug === 'app-store' ? (
          <ReviewCards rows={rows} onOpen={open} onAction={act} />
        ) : module.slug === 'revenus' ? (
          <RevenueCards rows={rows} onOpen={open} />
        ) : module.slug === 'abonnes' ? (
          <FollowerCards rows={rows} onOpen={open} />
        ) : module.slug === 'publications' ? (
          <PostCards rows={rows} onOpen={open} onAction={act} />
        ) : module.view.kind === 'table' ? (
          <DataTable caption={listTitle} columns={module.view.columns} rows={rows} onOpen={open} />
        ) : (
          <Pipeline columns={columns} hotAction={project.pipeline.hotAction} onAction={act} onOpen={open} />
        )}
      </section>

      {entity && <EntitySheet project={project} entity={entity} onClose={() => setOpen(null)} onAction={act} onAddTask={onAddTask} />}
      {editing && (
        <RecordDialog
          projectId={project.id}
          kind={editing.kind}
          record={editing.record}
          onClose={() => setEditing(null)}
          onDone={(message) => {
            setEditing(null);
            onAction(`Fiche : ${message}`);
          }}
        />
      )}
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

/** "Exporter le mois": the module's table as a CSV file (opens in Numbers or Excel). */
function exportTable(project: Project, module: Project['modules'][number], onAction: (label: string) => void) {
  if (module.view.kind !== 'table') return;
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [module.view.columns, ...module.view.rows].map((row) => row.map(cell).join(';'));
  const file = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  const name = `${project.name} ${module.label} ${isoDate().slice(0, 7)}.csv`;
  link.href = URL.createObjectURL(file);
  link.download = name;
  // Safari only downloads from a link that is in the page, and needs the file a moment longer
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(link.href);
    link.remove();
  }, 1000);
  onAction(`Exporté : ${name}`);
}
