/**
 * The Marc HQ mark: an X of four bevelled arms around a thin cross-shaped gap, in the current text
 * colour. The same drawing is the favicon (public/favicon.svg) and the home-screen icon.
 */
export default function HqMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-218 -218 436 436" fill="currentColor" aria-hidden="true">
      <path d="M-218 -208 L-161 -208 L-15 -70 L-15 -16 L-71 -16 L-218 -157 Z" />
      <path d="M218 -208 L161 -208 L15 -70 L15 -16 L71 -16 L218 -157 Z" />
      <path d="M-218 208 L-161 208 L-15 70 L-15 16 L-71 16 L-218 157 Z" />
      <path d="M218 208 L161 208 L15 70 L15 16 L71 16 L218 157 Z" />
    </svg>
  );
}
