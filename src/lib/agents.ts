import { useEffect, useState } from 'react';
import type { Agent, AgentStatus } from '../data/types';
import { useSession } from './session';
import { supabase } from './supabase';

/** A request to the agents; review_id set when it asks for a draft reply to an App Store review. */
export type AgentRequest = { id: string; project_id: string; text: string; status: 'ouverte' | 'prise' | 'faite'; agent: string | null; answer: string | null; created_at: string; review_id: string | null };
type AgentRow = { project_id: string; name: string; status: AgentStatus; task: string; action: string; updated_at: string };

/** "il y a 5 min", "il y a 2 h", "hier"… from a date. */
export function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'hier' : `il y a ${days} j`;
}

// One shared copy for the whole app (home, every project), kept live by Supabase Realtime
type State = { agents: Record<string, Agent[]>; requests: AgentRequest[]; ready: boolean };
let state: State = { agents: {}, requests: [], ready: false };
const listeners = new Set<() => void>();
let started: string | null = null;

async function load() {
  if (!supabase) return;
  const [agents, requests] = await Promise.all([
    supabase.from('agents').select('project_id, name, status, task, action, updated_at').order('updated_at', { ascending: false }),
    supabase.from('agent_requests').select('id, project_id, text, status, agent, answer, created_at, review_id').order('created_at', { ascending: false }).limit(50),
  ]);
  // A failed reload (no network) keeps what is on screen
  if (agents.error || requests.error) return;
  const grouped: Record<string, Agent[]> = {};
  for (const row of (agents.data ?? []) as AgentRow[]) {
    (grouped[row.project_id] ??= []).push({ name: row.name, task: row.task, status: row.status, when: ago(row.updated_at), action: row.action });
  }
  state = { agents: grouped, requests: (requests.data ?? []) as AgentRequest[], ready: true };
  listeners.forEach((listener) => listener());
}

function start(userId: string) {
  if (!supabase || started === userId) return;
  started = userId;
  load();
  supabase
    .channel('agents-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agents' }, load)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'agent_requests' }, load)
    .subscribe();
  // The phone drops the live link in the background: catch up on coming back
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && load());
}

/**
 * Marc's real Claude agents and the requests he handed them, once signed in. Agents report from
 * Claude Code (the marc-hq skill); until one has reported for a project, its sample agents stay.
 */
export function useLiveAgents() {
  const session = useSession();
  const [, refresh] = useState(0);
  useEffect(() => {
    const listener = () => refresh((n) => n + 1);
    listeners.add(listener);
    if (session) start(session.user.id);
    return () => {
      listeners.delete(listener);
    };
  }, [session]);
  return state;
}

/** Hand a request to the project's agents ("Confier à l'agent"). */
export async function handToAgent(projectId: string, text: string, reviewId?: string) {
  if (!supabase) return 'Supabase n’est pas réglé.';
  const { error } = await supabase.from('agent_requests').insert({ project_id: projectId, text, review_id: reviewId ?? null });
  if (error) return 'La demande n’a pas pu partir.';
  await load();
  return '';
}
