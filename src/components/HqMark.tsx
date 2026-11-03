/**
 * The Marc HQ mark: four pieces cut at 45° around an empty diamond, in the current text colour.
 * The same drawing is the favicon (public/favicon.svg) and the home-screen icon.
 */
export default function HqMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="20 20 60 60" fill="currentColor" aria-hidden="true">
      <path d="M20 35 L35 20 L47 20 L47 39 L39 47 L20 47 Z" />
      <path d="M80 35 L65 20 L53 20 L53 39 L61 47 L80 47 Z" />
      <path d="M20 65 L35 80 L47 80 L47 61 L39 53 L20 53 Z" />
      <path d="M80 65 L65 80 L53 80 L53 61 L61 53 L80 53 Z" />
    </svg>
  );
}
