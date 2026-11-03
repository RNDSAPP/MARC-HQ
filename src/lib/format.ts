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

/**
 * Big numbers written short, as on social networks: 900 stays 900, 1 000 becomes 1k, 3 412
 * becomes 3,4k, 12 400 becomes 12k, 1 250 000 becomes 1,3M. Works inside a short figure such as
 * "+1 200", "3 412 €" or "2 930" (sign and unit kept); anything else is left as it is.
 */
export function compact(text: string) {
  return text.replace(/\d{1,3}(?:[\s  ]\d{3})+(?:,\d+)?|\d{4,}(?:,\d+)?/g, (match) => {
    const value = parseFloat(match.replace(/[\s  ]/g, '').replace(',', '.'));
    if (!Number.isFinite(value) || value < 1000) return match;
    const [base, unit] = value >= 1_000_000 ? [value / 1_000_000, 'M'] : [value / 1000, 'k'];
    const short = base >= 10 ? Math.round(base).toString() : (Math.round(base * 10) / 10).toString().replace('.', ',');
    return `${short}${unit}`;
  });
}
