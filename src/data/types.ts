// Shape of the data shown by Marc HQ. Both projects share these types:
// same engine, same building blocks, only the names and numbers change.

/** 'rnds' and 'club421' come with the app; projects added by Marc get an id from their name. */
export type ProjectId = string;

/** wait = waits for Marc's answer, work = working, done = finished. */
export type AgentStatus = 'wait' | 'work' | 'done';

export type Agent = {
  name: string;
  task: string;
  status: AgentStatus;
  when: string;
  action: string;
};

export type Todo = {
  id: string;
  text: string;
  due: string;
};

export type Kpi = {
  label: string;
  value: string;
  delta: string;
};

export type PipelineCard = {
  name: string;
  meta: string;
  when: string;
};

/** Colour of the column dot: new (dark grey), muted (grey), alert (amber), accent (project colour). */
export type PipelineTone = 'new' | 'muted' | 'alert' | 'accent';

export type PipelineColumn = {
  name: string;
  tone: PipelineTone;
  /** Cards in a "hot" column wait for Marc and show an action button. */
  hot?: boolean;
  cards: PipelineCard[];
};

export type Pipeline = {
  title: string;
  /** Label of the button on cards in a hot column ("Signer", "Relancer"). */
  hotAction: string;
  columns: PipelineColumn[];
};

/** A table always has four columns; the last cell of each row is a status. */
export type TableRow = [string, string, string, string];

export type TableView = {
  kind: 'table';
  title: string;
  columns: TableRow;
  rows: TableRow[];
};

export type ModuleView = { kind: 'pipeline' } | TableView;

export type Module = {
  slug: string;
  label: string;
  /** Small number shown next to the label in the sidebar (optional). */
  count?: string;
  headline: string;
  sub: string;
  cta: string;
  heroLabel: string;
  heroNum: string;
  heroDelta: string;
  /** 12 weekly values, oldest first. */
  series: number[];
  kpis: Kpi[];
  view: ModuleView;
};

/** What the home page shows about a project. */
export type HomeSummary = {
  /** Name as written on the building label and card ("CLUB 421"). */
  label: string;
  floor: string;
  summary: string;
  big: string;
  bigLabel: string;
  mini: { label: string; value: string }[];
  /** Slug of the module whose 12-week series the home card draws. */
  trendModule: string;
  todos: { text: string }[];
  /** Short tag used in the home to-do list ("RNDS", "421"). */
  shortTag: string;
};

export type Project = {
  id: ProjectId;
  name: string;
  tag: string;
  /** Letter in the coloured square of the project switcher. */
  mark: string;
  space: string;
  searchPlaceholder: string;
  agents: Agent[];
  todos: Todo[];
  pipeline: Pipeline;
  modules: Module[];
  home: HomeSummary;
  /** Added by Marc from the app (not in the sample data): its colour and optional logo. */
  custom?: { color: string; logo?: string };
};

// Project tools (To do, Notes, Idées). Kept in the browser for now (src/data/tools.ts).

export type Task = {
  id: string;
  text: string;
  /** Due date as YYYY-MM-DD, or null when there is none. */
  due: string | null;
  done: boolean;
  createdAt: number;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: number;
};

export type IdeaStage = 'creuser' | 'tester' | 'validee';

export type Idea = {
  id: string;
  title: string;
  detail: string;
  stage: IdeaStage;
  createdAt: number;
};

export type VersionStatus = 'prevue' | 'en-cours' | 'review' | 'publiee';

export type Version = {
  id: string;
  name: string;
  status: VersionStatus;
  /** Target or release date, YYYY-MM-DD. */
  date: string | null;
  items: { id: string; text: string; done: boolean }[];
};

export type FeedbackKind = 'bug' | 'demande' | 'avis';
export type FeedbackPriority = 'haute' | 'moyenne' | 'basse';
export type FeedbackStatus = 'ouvert' | 'en-cours' | 'resolu';

export type Feedback = {
  id: string;
  text: string;
  kind: FeedbackKind;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  createdAt: number;
};

export type Goal = {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  due: string | null;
};

export type ToolLink = {
  id: string;
  label: string;
  url: string;
};
