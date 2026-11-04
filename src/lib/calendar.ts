import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import type { Project, Task } from '../data/types';
import { useStored } from '../hooks/useStored';
import { isoDate } from './dates';
import { useSession } from './session';
import { supabase } from './supabase';

/** One all-day event of a project's Google calendar, keyed so it is updated, never duplicated. */
export type CalendarEvent = { key: string; title: string; date: string; description: string };

const MONTHS: Record<string, number> = { janv: 0, févr: 1, fevr: 1, mars: 2, avr: 3, mai: 4, juin: 5, juil: 6, août: 7, aout: 7, sept: 8, oct: 9, nov: 10, déc: 11, dec: 11 };
const DAYS: Record<string, number> = { dim: 0, lun: 1, mar: 2, mer: 3, jeu: 4, ven: 5, sam: 6 };

/** "14 nov." → that day this year, "14 nov. 2027" → that year; anything vaguer → null. */
function dayMonth(text: string, today: Date) {
  const match = text.trim().toLowerCase().match(/^(\d{1,2})\s+([a-zéû]+)\.?(?:\s+(\d{4}))?$/);
  if (!match || MONTHS[match[2]] === undefined) return null;
  return isoDate(new Date(match[3] ? Number(match[3]) : today.getFullYear(), MONTHS[match[2]], Number(match[1])));
}

/** "Auj." → today, "Appel jeu." / "Ven." → the next such day (today included); else null. */
function relativeDay(text: string, today: Date) {
  const word = text.trim().toLowerCase().replace(/^appel\s+/, '').replace(/\.$/, '');
  if (word === 'auj') return isoDate(today);
  if (DAYS[word] === undefined) return null;
  const date = new Date(today);
  date.setDate(date.getDate() + ((DAYS[word] - today.getDay() + 7) % 7));
  return isoDate(date);
}

/**
 * What a project puts in its calendar: its dated tasks still to do, the dated rows of its tables
 * (the Club 421 soirées) and the meetings of its pipeline (calls, signatures planned on a day).
 */
export function calendarEvents(project: Project, tasks: Task[], today = new Date()): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const task of tasks) {
    if (task.due && !task.done) events.push({ key: `task:${task.id}`, title: task.text, date: task.due, description: `Tâche ${project.name} · Marc HQ` });
  }
  for (const module of project.modules) {
    if (module.view.kind !== 'table') continue;
    const at = module.view.columns.findIndex((column) => column.toLowerCase() === 'date');
    if (at < 0) continue;
    for (const row of module.view.rows) {
      const date = dayMonth(row[at], today);
      if (date) events.push({ key: `row:${module.slug}:${row[0]}`, title: `${row[0]} · ${row[1]}`, date, description: `${module.label} ${project.name} · ${row[row.length - 1]} · Marc HQ` });
    }
  }
  for (const column of project.pipeline.columns) {
    for (const card of column.cards) {
      const date = relativeDay(card.when, today);
      if (!date) continue;
      const title = /^appel/i.test(card.when) ? `Appel · ${card.name}` : `${column.name} · ${card.name}`;
      events.push({ key: `card:${card.name}`, title, date, description: `${card.meta} · ${project.pipeline.title} ${project.name} · Marc HQ` });
    }
  }
  return events;
}

export type SyncStatus = { at: number; created: number; changed: number; removed: number; total: number; error?: string };

/**
 * The project's Google calendar: whether Google Calendar is linked for the person signed in, the
 * last sync, and an automatic sync a moment after anything dated changes.
 */
export function useCalendarSync(project: Project, tasks: Task[], ready = true) {
  const session = useSession();
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [status, setStatus] = useStored<SyncStatus | null>(`marc-hq:${project.id}:agenda`, () => null);
  const [busy, setBusy] = useState(false);
  const events = useMemo(() => calendarEvents(project, tasks), [project, tasks]);
  const signature = JSON.stringify(events);
  const lastSent = useRef('');

  const reload = useCallback(() => {
    if (!supabase || !session) {
      setEmail(session === null ? null : undefined);
      return;
    }
    supabase
      .from('calendar_connections')
      .select('email')
      .maybeSingle()
      .then(({ data }) => setEmail(data?.email ?? null));
  }, [session]);
  useEffect(reload, [reload]);

  const sync = useCallback(async () => {
    if (!supabase) return;
    setBusy(true);
    lastSent.current = signature;
    const { data, error } = await supabase.functions.invoke('calendar-sync', {
      body: { project_id: project.id, project_name: project.name, events: JSON.parse(signature) },
    });
    setBusy(false);
    if (error) {
      const body = error instanceof FunctionsHttpError ? await error.context.json().catch(() => ({})) : {};
      setStatus(() => ({ at: Date.now(), created: 0, changed: 0, removed: 0, total: 0, error: (body.error as string) ?? 'Pas de réponse du serveur.' }));
      return;
    }
    setStatus(() => ({ at: Date.now(), ...(data as Omit<SyncStatus, 'at'>) }));
  }, [project.id, project.name, signature, setStatus]);

  // Automatic: once linked, a moment after the dated things change, and only once the tasks and
  // records are really loaded (a half-loaded list would remove events from Google). A project
  // added from the app gets its calendar on demand only.
  useEffect(() => {
    if (!email || !ready || project.custom || signature === lastSent.current) return;
    const timer = window.setTimeout(sync, 1500);
    return () => window.clearTimeout(timer);
  }, [email, ready, project.custom, signature, sync]);

  return { session, email, status, busy, events, sync, reload };
}
