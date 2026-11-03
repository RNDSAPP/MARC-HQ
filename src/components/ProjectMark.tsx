import type { ProjectId } from '../data/types';
import logo421White from '../assets/logo-421-blanc.svg';

/**
 * Each project's own logo, as supplied by Marc: the RNDS "R" on Rouge Gong,
 * and the Club 421 king of clubs with its dice, in white on the club's violet.
 */
export default function ProjectMark({ id }: { id: ProjectId }) {
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
      <img src={logo421White} alt="" />
    </span>
  );
}
