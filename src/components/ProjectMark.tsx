import type { Project } from '../data/types';
import Club421Logo from './Club421Logo';
import './ProjectMark.css';

/**
 * Each project's own logo, as supplied by Marc: the RNDS "R" on Rouge Gong, the Club 421 king of
 * clubs with its dice in white on the club's violet. A project added from the app shows the logo
 * uploaded with it, or its initial on its colour.
 */
export default function ProjectMark({ project }: { project: Project }) {
  const id = project.id;
  if (project.custom) {
    return project.custom.logo ? (
      <img className="project-mark project-mark--image" src={project.custom.logo} alt="" />
    ) : (
      <svg viewBox="0 0 40 40" className="project-mark" aria-hidden="true">
        <rect width="40" height="40" fill={project.custom.color} />
        <text x="20" y="27.5" textAnchor="middle" fontSize="21" fontWeight="700" fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif" fill="#FFFFFF">
          {project.mark}
        </text>
      </svg>
    );
  }
  if (id === 'rnds') {
    return (
      <svg viewBox="80 80 782 782" className="project-mark project-mark--rnds" aria-hidden="true">
        <rect width="942" height="942" fill="#FF0A3C" />
        <path
          fillRule="evenodd"
          fill="#000000"
          d="M312,236 L547,236 L622,346 L622,421 L563,482 L622,569 L622,686 L544,686 L544,581 L485,496 L423,496 L389,475 L389,686 L312,686 Z M389,309 L508,309 L544,360 L544,399 L519,424 L389,424 Z"
        />
      </svg>
    );
  }
  return (
    <span className="project-mark project-mark--club421" aria-hidden="true">
      <Club421Logo />
    </span>
  );
}
