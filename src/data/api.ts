// The only door between the screens and the data.
// Today the data comes from local TypeScript files. To plug Supabase in later,
// rewrite these functions (same names, same return types): the screens stay as they are.
import { club421 } from './club421';
import { rnds } from './rnds';
import type { Project, ProjectId } from './types';

const projects: Record<ProjectId, Project> = { rnds, club421 };

/** Order of the projects in the switcher and on the home page. */
export const projectIds: ProjectId[] = ['rnds', 'club421'];

export async function getProjects(): Promise<Project[]> {
  return projectIds.map((id) => projects[id]);
}
