import { useCustomProjects } from '../data/customProjects';

/** Darker or lighter version of a hex colour (amount from -1 to 1). */
function mix(hex: string, amount: number) {
  const n = parseInt(hex.replace('#', ''), 16);
  const target = amount < 0 ? 0 : 255;
  const k = Math.abs(amount);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (target - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Perceived lightness, to pick black or white text on the colour. */
const light = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.6;
};

/**
 * Colour tokens of the projects Marc added, like those of RNDS and Club 421 in tokens.css:
 * the colour, a darker shade for text on white, a pale tint, and their night versions.
 */
export default function ProjectStyles() {
  const { list } = useCustomProjects();
  if (list.length === 0) return null;
  const css = list
    .map((p) => {
      const sel = `[data-project='${p.id}']`;
      return `${sel}{--accent:${p.color};--accent-soft:${mix(p.color, -0.25)};--accent-tint:${mix(p.color, 0.88)};--on-accent:${light(p.color) ? '#000000' : '#ffffff'}}
:root[data-theme='night'] ${sel}{--accent-soft:${mix(p.color, 0.35)};--accent-tint:${mix(p.color, -0.78)};--on-accent:${light(p.color) ? '#000000' : '#ffffff'}}`;
    })
    .join('\n');
  return <style>{css}</style>;
}
