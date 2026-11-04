// The project tools (To do, Notes, Idées…), one set per project. Tasks go to Supabase once Marc
// is signed in to Marc HQ; the other tools are still kept in this browser's local storage.
import { useCallback, useEffect, useRef, useState } from 'react';
import { newId, useStored } from '../hooks/useStored';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import { dateOfWeekDay, dueDayIndex } from '../lib/dates';
import type { Feedback, Goal, Idea, Note, Project, Task, ToolLink, Version } from './types';


// The demo items the app used to start with (ideas, versions, feedback, goals). A browser that
// still holds them drops them the next time the tool opens: Marc HQ keeps only Marc's own.
const DEMO_IDS = new Set(['club421-idee-finale', 'club421-v12', 'club421-v13', 'rnds-next', 'club421-retour-equipe', 'rnds-objectif-abonnes']);

function useWithoutDemo<T extends { id: string }>(list: T[], set: (update: (prev: T[]) => T[]) => void) {
  const hasDemo = list.some((item) => DEMO_IDS.has(item.id));
  useEffect(() => {
    if (hasDemo) set((prev) => prev.filter((item) => !DEMO_IDS.has(item.id)));
  }, [hasDemo, set]);
  return hasDemo ? list.filter((item) => !DEMO_IDS.has(item.id)) : list;
}

/** First tasks of a project: the ones from the sample data, dated on this week. */
function seedTasks(project: Project): Task[] {
  return project.todos.map((todo, index) => {
    const day = dueDayIndex(todo.due);
    return { id: todo.id, text: todo.text, due: day >= 0 ? dateOfWeekDay(day) : null, done: false, createdAt: index };
  });
}


type TaskRow = { id: string; project_id: string; text: string; due: string | null; done: boolean; created_at: string };
const fromRow = (row: TaskRow): Task => ({ id: row.id, text: row.text, due: row.due, done: row.done, createdAt: new Date(row.created_at).getTime() });
const TASKS_CHANGED = 'marc-hq:tasks-changed';

/**
 * A project's tasks. Signed in to Marc HQ, they live in Supabase, so the Mac, the phone and the
 * site share one list (and one Google calendar); the first time, the tasks already typed in this
 * browser are brought over. Not signed in, they stay in this browser as before.
 */
/**
 * Tasks ticked a moment ago: they stay in place, struck through, for a short while so the tick is
 * seen, then move to "Faites". `tick` wraps the toggle.
 */
export function useSettling(toggle: (id: string) => void, tasks: Task[]) {
  const [settling, setSettling] = useState<Set<string>>(() => new Set());
  const timers = useRef(new Map<string, number>());
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  const tick = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (task && !task.done) {
      setSettling((prev) => new Set(prev).add(id));
      timers.current.set(
        id,
        window.setTimeout(() => {
          timers.current.delete(id);
          setSettling((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }, 900),
      );
    }
    toggle(id);
  };
  return { settling, tick };
}

export function useTasks(project: Project) {
  const session = useSession();
  const [local, setLocal] = useStored<Task[]>(`marc-hq:${project.id}:tasks`, () => seedTasks(project));
  const [moved, setMoved] = useStored<boolean>(`marc-hq:${project.id}:tasks-moved`, () => false);
  const [remote, setRemote] = useState<Task[] | null>(null);
  const online = Boolean(supabase && session);

  const load = useCallback(async () => {
    if (!supabase || !session) return;
    const { data, error } = await supabase.from('tasks').select('id, project_id, text, due, done, created_at').eq('project_id', project.id).order('created_at');
    if (error) return;
    // The old example tasks (ids "rnds-1", "club421-2"…) that a browser may still hold are left behind
    const own = local.filter((task) => !/^(rnds|club421)-\d+$/.test(task.id));
    if (data.length === 0 && !moved && own.length > 0) {
      // First time on this account: bring this browser's own tasks over, once
      const rows = own.map((task) => ({ id: task.id, project_id: project.id, text: task.text, due: task.due, done: task.done, created_at: new Date(task.createdAt || Date.now()).toISOString() }));
      const { error: copyError } = await supabase.from('tasks').upsert(rows);
      if (!copyError) {
        setMoved(() => true);
        setRemote(own);
      }
      return;
    }
    setRemote((data as TaskRow[]).map(fromRow));
  }, [session, project.id, moved, local, setMoved]);

  // Load, then again when another view changed them, when coming back to the app, and live when
  // the phone or the computer changes one (Supabase realtime on the tasks table)
  useEffect(() => {
    if (!online || !supabase) {
      setRemote(null);
      return;
    }
    const client = supabase;
    load();
    const onChange = (event: Event) => (event as CustomEvent<string>).detail === project.id && load();
    const onShow = () => document.visibilityState === 'visible' && load();
    window.addEventListener(TASKS_CHANGED, onChange);
    document.addEventListener('visibilitychange', onShow);
    const live = client
      .channel(`tasks-${project.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => load())
      .subscribe();
    return () => {
      window.removeEventListener(TASKS_CHANGED, onChange);
      document.removeEventListener('visibilitychange', onShow);
      client.removeChannel(live);
    };
  }, [online, load, project.id]);

  // The list as it is right now, even between two renders (a quick double tap reads the right state)
  const latest = useRef<Task[]>([]);
  latest.current = online && remote ? remote : local;
  const [failed, setFailed] = useState('');

  /** Apply a change on screen at once, then in Supabase, then tell the other views. If Supabase
   *  refuses (no network), the list goes back to what is really saved and says so. */
  const change = (next: (prev: Task[]) => Task[], write: () => PromiseLike<{ error: unknown }>) => {
    latest.current = next(latest.current);
    if (!online) {
      setLocal(next);
      return;
    }
    setRemote((prev) => next(prev ?? []));
    setFailed('');
    Promise.resolve(write())
      .then(({ error }) => {
        if (error) throw error;
        window.dispatchEvent(new CustomEvent(TASKS_CHANGED, { detail: project.id }));
      })
      .catch(() => {
        setFailed('Pas enregistré : vérifie la connexion et réessaie.');
        load();
      });
  };

  return {
    tasks: online && remote ? remote : local,
    /** Why the last change did not go through, '' when all is saved. */
    failed,
    /** Whether the list shown is the saved one (false while it loads from Supabase). */
    loaded: !online || remote !== null,
    /** Whether the list is shared through Supabase (signed in) or kept in this browser. */
    shared: online,
    add: (text: string, due: string | null) => {
      const task: Task = { id: newId('tache'), text, due, done: false, createdAt: Date.now() };
      change(
        (prev) => [...prev, task],
        () => supabase!.from('tasks').insert({ id: task.id, project_id: project.id, text, due, done: false }),
      );
    },
    toggle: (id: string) => {
      const current = latest.current.find((task) => task.id === id);
      if (!current) return;
      const done = !current.done;
      change(
        (prev) => prev.map((task) => (task.id === id ? { ...task, done } : task)),
        () => supabase!.from('tasks').update({ done }).eq('id', id),
      );
    },
    remove: (id: string) =>
      change(
        (prev) => prev.filter((task) => task.id !== id),
        () => supabase!.from('tasks').delete().eq('id', id),
      ),
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
  const [ideasStored, setIdeas] = useStored<Idea[]>(`marc-hq:${project.id}:ideas`, () => []);
  const ideas = useWithoutDemo(ideasStored, setIdeas);
  return {
    ideas,
    add: (title: string) =>
      setIdeas((prev) => [...prev, { id: newId('idee'), title, detail: '', stage: 'creuser', createdAt: Date.now() }]),
    update: (id: string, change: Partial<Pick<Idea, 'title' | 'detail' | 'stage'>>) =>
      setIdeas((prev) => prev.map((idea) => (idea.id === id ? { ...idea, ...change } : idea))),
    remove: (id: string) => setIdeas((prev) => prev.filter((idea) => idea.id !== id)),
  };
}


export function useVersions(project: Project) {
  const [versionsStored, setVersions] = useStored<Version[]>(`marc-hq:${project.id}:versions`, () => []);
  const versions = useWithoutDemo(versionsStored, setVersions);
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


export function useFeedback(project: Project) {
  const [itemsStored, setItems] = useStored<Feedback[]>(`marc-hq:${project.id}:feedback`, () => []);
  const items = useWithoutDemo(itemsStored, setItems);
  return {
    items,
    add: (text: string, kind: Feedback['kind'], priority: Feedback['priority']) =>
      setItems((prev) => [{ id: newId('retour'), text, kind, priority, status: 'ouvert', createdAt: Date.now() }, ...prev]),
    update: (id: string, change: Partial<Pick<Feedback, 'status' | 'priority' | 'kind'>>) => setItems((prev) => prev.map((f) => (f.id === id ? { ...f, ...change } : f))),
    remove: (id: string) => setItems((prev) => prev.filter((f) => f.id !== id)),
  };
}


export function useGoals(project: Project) {
  const [goalsStored, setGoals] = useStored<Goal[]>(`marc-hq:${project.id}:goals`, () => []);
  const goals = useWithoutDemo(goalsStored, setGoals);
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
