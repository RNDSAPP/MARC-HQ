import type { AgentStatus, Project } from '../data/types';

/** Two-letter initials for avatars: "BDE Commerce Lyon" -> "CL", "Karim B." -> "KB". */
export function initials(name: string): string {
  return name
    .replace(/^BDE /, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export type StatusTone = 'good' | 'warn' | 'neutral';

const goodStatuses = new Set(['Affilié', 'Actif', 'Partenaire', 'Prêt', 'Confirmé', 'Répondu', 'Hausse']);
const warnStatuses = new Set(['À relancer', 'À valider', 'À répondre', 'À confirmer']);

/** Colour family of a status badge, read from its text (same rule as the mockup). */
export function statusTone(label: string): StatusTone {
  if (goodStatuses.has(label)) return 'good';
  if (warnStatuses.has(label)) return 'warn';
  return 'neutral';
}

export const agentStatusLabel: Record<AgentStatus, string> = {
  wait: 'attend ta réponse',
  work: 'au travail',
  done: 'terminé',
};

/** The most urgent agent status of a project: someone waiting beats someone working. */
export function projectStatus(project: Project): AgentStatus {
  const statuses = project.agents.map((agent) => agent.status);
  if (statuses.includes('wait')) return 'wait';
  if (statuses.includes('work')) return 'work';
  return 'done';
}
