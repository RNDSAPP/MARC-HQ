// The project tools (To do, Notes, Idées), kept in this browser's local storage, one set per project.
// When Supabase is plugged in, only this file changes.
import { newId, useStored } from '../hooks/useStored';
import { dateOfWeekDay, dueDayIndex } from '../lib/dates';
import type { Idea, Note, Project, Task } from './types';

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
