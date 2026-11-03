// Projects Marc adds from the app, kept in this browser's local storage next to the two that
// come with it. Each one gets a full workspace (tools, connections) that starts empty.
import { getProjects } from './api';
import { useData } from './useData';
import { useStored } from '../hooks/useStored';
import type { Project } from './types';

export type CustomProject = {
  id: string;
  name: string;
  tag: string;
  color: string;
  /** Small logo as a data URL (resized to 128 px when added). */
  logo?: string;
  createdAt: number;
};

const RESERVED = ['rnds', 'club421', 'outils'];

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'projet';

/** The workspace of a new project: one overview, an empty pipeline, nothing measured yet. */
export function buildProject(c: CustomProject): Project {
  const zeros = Array.from({ length: 12 }, () => 0);
  return {
    id: c.id,
    name: c.name,
    tag: c.tag || 'Nouveau projet',
    mark: c.name.charAt(0).toUpperCase(),
    space: `Espace ${c.name}`,
    searchPlaceholder: `Rechercher dans ${c.name}`,
    agents: [],
    todos: [],
    pipeline: {
      title: 'Pipeline',
      hotAction: 'Relancer',
      columns: [
        { name: 'À contacter', tone: 'new', cards: [] },
        { name: 'En discussion', tone: 'muted', cards: [] },
        { name: 'À signer', tone: 'alert', hot: true, cards: [] },
        { name: 'Partenaires', tone: 'accent', cards: [] },
      ],
    },
    modules: [
      {
        slug: 'vue-d-ensemble',
        label: 'Vue d’ensemble',
        headline: `${c.name} démarre`,
        sub: 'Le terrain est prêt. Connecte tes outils pour voir tes chiffres ici, puis ajoute tes premières tâches et idées.',
        cta: 'Connecter un outil',
        heroLabel: 'Pas encore de données',
        heroNum: '—',
        heroDelta: 'à brancher',
        series: zeros,
        kpis: [],
        view: { kind: 'pipeline' },
      },
    ],
    home: {
      label: c.name,
      floor: 'Nouveau',
      summary: 'Rien de branché pour l’instant',
      big: '—',
      bigLabel: 'pas encore de données',
      mini: [
        { label: 'Outils connectés', value: '0' },
        { label: 'Créé le', value: new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(c.createdAt) },
      ],
      trendModule: 'vue-d-ensemble',
      shortTag: c.name.slice(0, 4).toUpperCase(),
      todos: [],
    },
    custom: { color: c.color, logo: c.logo },
  };
}

export function useCustomProjects() {
  const [list, setList] = useStored<CustomProject[]>('marc-hq:projects', () => []);
  return {
    list,
    add: (draft: Omit<CustomProject, 'id' | 'createdAt'>) => {
      const base = slug(draft.name);
      let id = RESERVED.includes(base) ? `${base}-2` : base;
      for (let i = 2; list.some((p) => p.id === id); i++) id = `${base}-${i}`;
      setList((prev) => [...prev, { ...draft, id, createdAt: Date.now() }]);
      return id;
    },
    update: (id: string, change: Partial<Omit<CustomProject, 'id' | 'createdAt'>>) =>
      setList((prev) => prev.map((p) => (p.id === id ? { ...p, ...change } : p))),
    remove: (id: string) => setList((prev) => prev.filter((p) => p.id !== id)),
  };
}

/** Every project: the two that come with the app, then those Marc added. */
export function useProjects(): Project[] | undefined {
  const builtIn = useData('projects', getProjects);
  const { list } = useCustomProjects();
  if (!builtIn) return undefined;
  return [...builtIn, ...list.map(buildProject)];
}

