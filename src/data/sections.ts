// The tools every project has, after its modules: their address, name and icon key (ModuleIcon).
export const TOOLS = [
  { slug: 'todo', label: 'To do' },
  { slug: 'notes', label: 'Notes' },
  { slug: 'idees', label: 'Idées' },
  // Mails (MailsPage, the gmail-* functions) is ready but on pause until Marc wants it back
  { slug: 'versions', label: 'Versions' },
  { slug: 'retours', label: 'Retours' },
  { slug: 'objectifs', label: 'Objectifs' },
  { slug: 'liens', label: 'Liens' },
  { slug: 'connexions', label: 'Connexions' },
] as const;

export type ToolSlug = (typeof TOOLS)[number]['slug'];

export const isTool = (slug: string | undefined): slug is ToolSlug => TOOLS.some((tool) => tool.slug === slug);

/** Short label for the narrow places (side rail, tab bar). */
export const shortLabel = (slug: string, label: string) => (slug === 'vue-d-ensemble' ? 'Aperçu' : label);
