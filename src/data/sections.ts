// The tools every project has, after its modules: their address, name and icon key (ModuleIcon).
export const TOOLS = [
  { slug: 'todo', label: 'To do' },
  { slug: 'notes', label: 'Notes' },
  { slug: 'idees', label: 'Idées' },
] as const;

export type ToolSlug = (typeof TOOLS)[number]['slug'];

export const isTool = (slug: string | undefined): slug is ToolSlug => TOOLS.some((tool) => tool.slug === slug);

/** Short label for the narrow places (side rail, tab bar). */
export const shortLabel = (slug: string, label: string) => (slug === 'vue-d-ensemble' ? 'Aperçu' : label);
