// Logos of the services Marc uses (src/assets/brands.ts, from simple-icons, CC0).
import { BRAND_ICONS } from '../assets/brands';

export type Brand = keyof typeof BRAND_ICONS;

// Near-black logos take the text colour, so they stay visible on the night theme.
const DARK = new Set(['000000', '181717', '191919']);

/** A service's logo in its own colour, `size` px. */
export default function BrandIcon({ brand, size = 20 }: { brand: Brand; size?: number }) {
  const icon = BRAND_ICONS[brand];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={icon.title} fill={DARK.has(icon.hex) ? 'currentColor' : `#${icon.hex}`}>
      <path d={icon.path} />
    </svg>
  );
}
