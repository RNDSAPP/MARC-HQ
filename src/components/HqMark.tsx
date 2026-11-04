import { useId } from 'react';

/**
 * The Marc HQ mark: an open hexagon with a P whose tail comes out below, in the current text
 * colour. The left side of the hexagon is cut flat at the bottom (the clip). The same drawing,
 * white on black, is the favicon (public/favicon.svg) and the home-screen and Dock icons.
 */
export default function HqMark({ size = 24 }: { size?: number }) {
  const cut = useId();
  return (
    <svg width={size} height={size} viewBox="255 164 292 292" fill="none" stroke="currentColor" strokeWidth="36" strokeLinejoin="miter" strokeMiterlimit={10} aria-hidden="true">
      <clipPath id={cut}>
        <rect x="200" y="150" width="400" height="197" />
      </clipPath>
      <polyline clipPath={`url(#${cut})`} points="318,366 278,292 278,285 320,208 482,208 524,285 491,329 468,329" />
      <polyline points="335,410 315,374 352,303 438,303 405,365 330,365" />
    </svg>
  );
}
