// The project tools (To do, Notes, Idées), kept in this browser's local storage, one set per project.
// When Supabase is plugged in, only this file changes.
import { newId, useStored } from '../hooks/useStored';
import { dateOfWeekDay, dueDayIndex } from '../lib/dates';
import type { Feedback, Goal, Idea, Note, Project, Task, ToolLink, Version } from './types';

/** First tasks of a project: the ones from the sample data, dated on this week. */
function seedTasks(project: Project): Task[] {
  return project.todos.map((todo, index) => {
    const day = dueDayIndex(todo.due);
    return { id: todo.id, text: todo.text, due: day >= 0 ? dateOfWeekDay(day) : null, done: false, createdAt: index };
  });
}

/** First ideas: the one the sample data already calls an idea. */
function seedIdeas(project: Project): Idea[] {
  if (project.id !== 'club421') return [];
  return [
    {
      id: 'club421-idee-finale',
      title: 'Finale inter BDE en décembre',
      detail: '120 joueurs en moyenne par soirée : de quoi réunir tous les BDE partenaires.',
      stage: 'creuser',
      createdAt: 0,
    },
  ];
}

export function useTasks(project: Project) {
  const [tasks, setTasks] = useStored<Task[]>(`marc-hq:${project.id}:tasks`, () => seedTasks(project));
  return {
    tasks,
    add: (text: string, due: string | null) =>
      setTasks((prev) => [...prev, { id: newId('tache'), text, due, done: false, createdAt: Date.now() }]),
    toggle: (id: string) => setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task))),
    remove: (id: string) => setTasks((prev) => prev.filter((task) => task.id !== id)),
  };
}

export function useNotes(project: Project) {
  const [notes, setNotes] = useStored<Note[]>(`marc-hq:${project.id}:notes`, () => []);
  return {
    notes,
    add: () => {
      const note: Note = { id: newId('note'), title: '', body: '', pinned: false, updatedAt: Date.now() };
      setNotes((prev) => [note, ...prev]);
      return note.id;
    },
    update: (id: string, change: Partial<Pick<Note, 'title' | 'body' | 'pinned'>>) =>
      setNotes((prev) => prev.map((note) => (note.id === id ? { ...note, ...change, updatedAt: Date.now() } : note))),
    remove: (id: string) => setNotes((prev) => prev.filter((note) => note.id !== id)),
  };
}

export function useIdeas(project: Project) {
  const [ideas, setIdeas] = useStored<Idea[]>(`marc-hq:${project.id}:ideas`, () => seedIdeas(project));
  return {
    ideas,
    add: (title: string) =>
      setIdeas((prev) => [...prev, { id: newId('idee'), title, detail: '', stage: 'creuser', createdAt: Date.now() }]),
    update: (id: string, change: Partial<Pick<Idea, 'title' | 'detail' | 'stage'>>) =>
      setIdeas((prev) => prev.map((idea) => (idea.id === id ? { ...idea, ...change } : idea))),
    remove: (id: string) => setIdeas((prev) => prev.filter((idea) => idea.id !== id)),
  };
}

/** First versions: what the sample data already says (the live version, the one in review, the screen waiting for validation). */
function seedVersions(project: Project): Version[] {
  if (project.id === 'club421') {
    return [
      { id: 'club421-v12', name: '1.2', status: 'publiee', date: null, items: [] },
      { id: 'club421-v13', name: '1.3', status: 'review', date: null, items: [{ id: 'club421-v13-equipe', text: 'Mode équipe', done: true }] },
    ];
  }
  return [{ id: 'rnds-next', name: 'Prochaine version', status: 'en-cours', date: null, items: [{ id: 'rnds-next-coups', text: 'Écran de détection des coups', done: false }] }];
}

export function useVersions(project: Project) {
  const [versions, setVersions] = useStored<Version[]>(`marc-hq:${project.id}:versions`, () => seedVersions(project));
  const patch = (id: string, change: (v: Version) => Version) => setVersions((prev) => prev.map((v) => (v.id === id ? change(v) : v)));
  return {
    versions,
    add: (name: string) => setVersions((prev) => [...prev, { id: newId('version'), name, status: 'prevue', date: null, items: [] }]),
    update: (id: string, change: Partial<Pick<Version, 'name' | 'status' | 'date'>>) => patch(id, (v) => ({ ...v, ...change })),
    remove: (id: string) => setVersions((prev) => prev.filter((v) => v.id !== id)),
    addItem: (id: string, text: string) => patch(id, (v) => ({ ...v, items: [...v.items, { id: newId('item'), text, done: false }] })),
    toggleItem: (id: string, itemId: string) => patch(id, (v) => ({ ...v, items: v.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) })),
    removeItem: (id: string, itemId: string) => patch(id, (v) => ({ ...v, items: v.items.filter((i) => i.id !== itemId) })),
  };
}

/** First feedback: the App Store review that asks for something. */
function seedFeedback(project: Project): Feedback[] {
  if (project.id !== 'club421') return [];
  return [{ id: 'club421-retour-equipe', text: 'Il manque un mode équipe (avis App Store, 4 étoiles)', kind: 'demande', priority: 'haute', status: 'en-cours', createdAt: 0 }];
}

export function useFeedback(project: Project) {
  const [items, setItems] = useStored<Feedback[]>(`marc-hq:${project.id}:feedback`, () => seedFeedback(project));
  return {
    items,
    add: (text: string, kind: Feedback['kind'], priority: Feedback['priority']) =>
      setItems((prev) => [{ id: newId('retour'), text, kind, priority, status: 'ouvert', createdAt: Date.now() }, ...prev]),
    update: (id: string, change: Partial<Pick<Feedback, 'status' | 'priority' | 'kind'>>) => setItems((prev) => prev.map((f) => (f.id === id ? { ...f, ...change } : f))),
    remove: (id: string) => setItems((prev) => prev.filter((f) => f.id !== id)),
  };
}

/** First goal: the one the sample data already tracks (RNDS: 5 000 followers). */
function seedGoals(project: Project): Goal[] {
  if (project.id !== 'rnds') return [];
  return [{ id: 'rnds-objectif-abonnes', title: 'Abonnés', current: 3412, target: 5000, unit: 'abonnés', due: null }];
}

export function useGoals(project: Project) {
  const [goals, setGoals] = useStored<Goal[]>(`marc-hq:${project.id}:goals`, () => seedGoals(project));
  return {
    goals,
    add: (goal: Omit<Goal, 'id'>) => setGoals((prev) => [...prev, { ...goal, id: newId('objectif') }]),
    update: (id: string, change: Partial<Omit<Goal, 'id'>>) => setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...change } : g))),
    remove: (id: string) => setGoals((prev) => prev.filter((g) => g.id !== id)),
  };
}

export function useLinks(project: Project) {
  const [links, setLinks] = useStored<ToolLink[]>(`marc-hq:${project.id}:links`, () => []);
  return {
    links,
    add: (label: string, url: string) => setLinks((prev) => [...prev, { id: newId('lien'), label, url }]),
    remove: (id: string) => setLinks((prev) => prev.filter((l) => l.id !== id)),
  };
}
