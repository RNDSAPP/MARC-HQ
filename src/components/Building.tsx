import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Project } from '../data/types';
import { agentStatusLabel, projectStatus } from '../lib/format';
import logo421 from '../assets/logo-421-violet.svg';
import './Building.css';

type Props = {
  projects: Project[];
};

/** The isometric building of the home page: one floor per project, each floor opens its workspace. */
export default function Building({ projects }: Props) {
  return (
    <div className="building">
      <BuildingArt />

      {/* Large invisible click zones over each floor. Keyboard users get the labels below instead. */}
      {projects.map((project) => (
      <Link
          key={`zone-${project.id}`}
          to={`/${project.id}/vue-d-ensemble`}
          className={`building-zone building-zone--${project.id}`}
          tabIndex={-1}
          aria-hidden="true"
        />
      ))}

      <ul className="building-labels">
        {projects.map((project) => {
          const status = projectStatus(project);
          return (
            <li key={project.id} className={`building-label-item building-label-item--${project.id}`}>
              <Link to={`/${project.id}/vue-d-ensemble`} className="building-label" data-project={project.id}>
                <span className="building-label-head">
                  <span className="building-label-name">{project.home.label}</span>
                  <span className="building-label-floor">{project.home.floor}</span>
                </span>
                <span className="building-label-summary">{project.home.summary}</span>
                <span className="building-label-foot">
                  <span className={`building-label-status building-label-status--${status}`}>
                    <span className="building-label-dot" aria-hidden="true" />
                    Agent : {agentStatusLabel[status]}
                  </span>
                  <span className="building-label-enter" aria-hidden="true">
                    Entrer →
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <span className="building-hint" aria-hidden="true">
        Clique sur un étage
      </span>
    </div>
  );
}

// Project colours, same values as src/styles/tokens.css. The rest of the model is white and grey.
const RNDS = '#FF0A3C';
const RNDS_DARK = '#C8002C';
const CLUB = '#7C3AED';

type Point = [number, number];

// Back corner of each floor. Both floors are 320 units deep along s (towards the bottom right)
// and 250 units along t (towards the bottom left), on a 30° isometric grid.
// The site: top of the base plate (SITE) and the table it stands on (GROUND), 14 lower.
// The plate is 366 units along s and 586 along t.
const SITE_GROUND: Point = [600, 110];
const RNDS_FLOOR: Point = [600, 120];
const CLUB_FLOOR: Point = [348.9, 265];

/** Floor coordinates (s, t) to drawing coordinates. */
function iso([x, y]: Point, s: number, t: number): Point {
  return [x + 0.866 * (s - t), y + 0.5 * (s + t)];
}

function points(origin: Point, list: Point[]) {
  return list.map(([s, t]) => iso(origin, s, t).map((n) => n.toFixed(1)).join(',')).join(' ');
}

/** Same as points(), with a height h above the floor for each point: (s, t, h). */
function solid(origin: Point, list: [number, number, number][]) {
  return list
    .map(([s, t, h]) => {
      const [x, y] = iso(origin, s, t);
      return `${x.toFixed(1)},${(y - h).toFixed(1)}`;
    })
    .join(' ');
}

/**
 * The two back walls of a floor, with a real thickness: inner faces, the top seen from above
 * and the cut ends. `left` runs along t at s = 0, `right` along s at t = 0, both `thick` deep.
 */
function Walls({ origin, left, right, thick }: {
  origin: Point;
  left?: number;
  right?: number;
  thick: number;
}) {
  const o = origin;
  const k = thick;
  return (
    <g stroke="#DCDCDC" strokeWidth="0.8" strokeLinejoin="round">
      {left !== undefined && (
        <>
          <polygon points={solid(o, [[k, k, 0], [k, 250, 0], [k, 250, left], [k, k, left]])} fill="url(#bld-wall-left)" />
          <polygon points={solid(o, [[0, 250, 0], [k, 250, 0], [k, 250, left], [0, 250, left]])} fill="url(#bld-wall-right)" />
          <polygon points={solid(o, [[0, 0, left], [k, k, left], [k, 250, left], [0, 250, left]])} fill="#FFFFFF" />
        </>
      )}
      {right !== undefined && (
        <>
          <polygon points={solid(o, [[k, k, 0], [320, k, 0], [320, k, right], [k, k, right]])} fill="url(#bld-wall-right)" />
          <polygon points={solid(o, [[320, 0, 0], [320, k, 0], [320, k, right], [320, 0, right]])} fill="url(#bld-wall-left)" />
          <polygon points={solid(o, [[0, 0, right], [320, 0, right], [320, k, right], [k, k, right]])} fill="#FFFFFF" />
        </>
      )}
    </g>
  );
}

/** Convex hull of a set of points (monotone chain), used for the sides of rounded slabs. */
function hull(list: Point[]): Point[] {
  const sorted = [...list].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Point, a: Point, b: Point) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const half = (input: Point[]) => {
    const out: Point[] = [];
    for (const p of input) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}

/** Outline of a floor rectangle with rounded corners, in floor coordinates. */
function roundedRect(s0: number, t0: number, s1: number, t1: number, r: number): Point[] {
  const corners: [number, number, number][] = [
    [s1 - r, t0 + r, -90],
    [s1 - r, t1 - r, 0],
    [s0 + r, t1 - r, 90],
    [s0 + r, t0 + r, 180],
  ];
  const out: Point[] = [];
  for (const [cs, ct, start] of corners) {
    for (let i = 0; i <= 6; i++) {
      const a = ((start + i * 15) * Math.PI) / 180;
      out.push([cs + r * Math.cos(a), ct + r * Math.sin(a)]);
    }
  }
  return out;
}

const toPath = (list: Point[]) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** A slab with rounded corners standing on the table, `h` high, with its soft shadow. */
function Slab({ s0, t0, s1, t1, r, h, top, side, shadow = 0.12 }: {
  s0: number;
  t0: number;
  s1: number;
  t1: number;
  r: number;
  h: number;
  top: string;
  side: string;
  shadow?: number;
}) {
  const outline = roundedRect(s0, t0, s1, t1, r).map(([s, t]) => iso(SITE_GROUND, s, t));
  const raised = outline.map(([x, y]) => [x, y - h] as Point);
  return (
    <g>
      <polygon points={toPath(outline.map(([x, y]) => [x + 10, y + 12] as Point))} fill="#000" fillOpacity={shadow} filter="url(#bld-blur-l)" />
      <polygon points={toPath(hull([...outline, ...raised]))} fill={side} />
      <polygon points={toPath(raised)} fill={top} />
    </g>
  );
}

/** A box on the table: top and the two faces turned to us. */
function Box({ s0, s1, t0, t1, h0, h1, color, origin = SITE_GROUND }: {
  s0: number;
  s1: number;
  t0: number;
  t1: number;
  h0: number;
  h1: number;
  color: string;
  origin?: Point;
}) {
  return (
    <g>
      <polygon points={solid(origin, [[s1, t0, h0], [s1, t1, h0], [s1, t1, h1], [s1, t0, h1]])} fill={shade(color, 0.16)} />
      <polygon points={solid(origin, [[s0, t1, h0], [s1, t1, h0], [s1, t1, h1], [s0, t1, h1]])} fill={shade(color, 0.07)} />
      <polygon points={solid(origin, [[s0, t0, h1], [s1, t0, h1], [s1, t1, h1], [s0, t1, h1]])} fill={color} />
    </g>
  );
}

/** A small clay car on the road, driving along t (or along s). */
function Car({ s, t, alongT, color }: { s: number; t: number; alongT: boolean; color: string }) {
  const [ls, lt] = alongT ? [18, 40] : [40, 18];
  const glass = '#59616B';
  const cab = alongT ? { s0: s + 2, s1: s + 16, t0: t + 10, t1: t + 28 } : { s0: s + 10, s1: s + 28, t0: t + 2, t1: t + 16 };
  const wheels: Point[] = alongT
    ? [[s + ls, t + 8], [s + ls, t + 32], [s + 4, t + lt], [s + 14, t + lt]]
    : [[s + 8, t + lt], [s + 32, t + lt], [s + ls, t + 4], [s + ls, t + 14]];
  return (
    <g>
      <polygon points={points(SITE_GROUND, [[s, t], [s + ls, t], [s + ls, t + lt], [s, t + lt]])} fill="#000" fillOpacity="0.2" filter="url(#bld-blur-m)" transform="translate(4 4)" />
      <Box s0={s} s1={s + ls} t0={t} t1={t + lt} h0={3} h1={11} color={color} />
      <Box {...cab} h0={11} h1={18} color={glass} />
      <polygon points={solid(SITE_GROUND, [[cab.s0, cab.t0, 18], [cab.s1, cab.t0, 18], [cab.s1, cab.t1, 18], [cab.s0, cab.t1, 18]])} fill={color} />
      {wheels.map(([ws, wt]) => {
        const [x, y] = iso(SITE_GROUND, ws, wt);
        return <circle key={`${ws}-${wt}`} cx={x} cy={y - 3} r="3.2" fill="#2B2B2B" />;
      })}
    </g>
  );
}

/** A white clay tree: a trunk and three round crowns. */
function Tree({ s, t, size = 1, base = 6 }: { s: number; t: number; size?: number; base?: number }) {
  const [x, y0] = iso(SITE_GROUND, s, t);
  const y = y0 - base;
  const k = size;
  return (
    <g>
      <ellipse cx={x + 8 * k} cy={y + 2} rx={16 * k} ry={6 * k} fill="#000" fillOpacity="0.16" filter="url(#bld-blur-m)" />
      <rect x={x - 1.6 * k} y={y - 18 * k} width={3.2 * k} height={18 * k} rx={1.6 * k} fill="#CFCFCF" />
      {vinyl((f) => <circle cx={x - 6 * k} cy={y - 22 * k} r={8 * k} fill={f} />, '#F2F2F2')}
      {vinyl((f) => <circle cx={x + 6 * k} cy={y - 24 * k} r={9 * k} fill={f} />, '#F5F5F5')}
      {vinyl((f) => <circle cx={x} cy={y - 32 * k} r={9.5 * k} fill={f} />, '#F7F7F7')}
    </g>
  );
}

/** A street lamp on the pavement. */
function Lamp({ s, t }: { s: number; t: number }) {
  const [x, y0] = iso(SITE_GROUND, s, t);
  const y = y0 - 6;
  return (
    <g>
      <ellipse cx={x + 3} cy={y + 1} rx="5" ry="2" fill="#000" fillOpacity="0.15" filter="url(#bld-blur-s)" />
      <rect x={x - 1} y={y - 44} width="2" height="44" rx="1" fill="#BDBDBD" />
      <path d={`M${x},${y - 43} q -7,-3 -12,2`} fill="none" stroke="#BDBDBD" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx={x - 12} cy={y - 40} rx="4.5" ry="1.8" fill="#E8E8E8" stroke="#C8C8C8" strokeWidth="0.6" />
    </g>
  );
}

/** A bottle standing at (x, y): body, shoulder, neck and a glint. */
function Bottle({ x, y, color, tall = 1 }: { x: number; y: number; color: string; tall?: number }) {
  const h = 9 * tall;
  return (
    <g>
      {vinyl((f) => <rect x={x - 1.7} y={y - h} width="3.4" height={h} rx="1.3" fill={f} />, color)}
      <rect x={x - 0.65} y={y - h - 4} width="1.3" height="4.6" rx="0.6" fill={shade(color, 0.15)} />
      <rect x={x - 0.9} y={y - h + 2} width="0.7" height={h - 4} rx="0.35" fill="#FFFFFF" fillOpacity="0.45" />
    </g>
  );
}

/** A word painted on the floor, read along s (or along t with `alongT`). */
function FloorText({ origin, s, t, alongT = false, size = 20, children }: {
  origin: Point;
  s: number;
  t: number;
  alongT?: boolean;
  size?: number;
  children: string;
}) {
  const [x, y] = iso(origin, s, t);
  const matrix = alongT ? `matrix(0.866 -0.5 0.866 0.5 ${x} ${y})` : `matrix(0.866 0.5 -0.866 0.5 ${x} ${y})`;
  return (
    <text transform={matrix} fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif" fontWeight="800" fontStyle="italic" fontSize={size} letterSpacing="1" fill="#C9C9C9">
      {children}
    </text>
  );
}

/** A route on the floor: a solid line and a dashed one beside it, in the project's colour. */
function Route({ origin, solid, dashed, color }: { origin: Point; solid: Point[]; dashed: Point[]; color: string }) {
  return (
    <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
      <polyline points={points(origin, solid)} strokeWidth="2.4" />
      <polyline points={points(origin, dashed)} strokeWidth="2.4" strokeDasharray="7 6" />
    </g>
  );
}

// Designer-toy figures: big round head with ears, small eyes under thick brows, round hands,
// clothes and sneakers in colour. Drawn facing us, feet at (0, 0), about 45 units tall.
type Headwear = 'cap' | 'bucket' | 'hair' | 'buzz' | 'long';
type Look = {
  skin: string;
  top: string;
  bottom: string;
  shoes: string;
  head: Headwear;
  headColor: string;
  /** Cap brim, when it differs from the cap. */
  brim?: string;
  shorts?: boolean;
  eyes?: 'glasses' | 'sunglasses';
  headphones?: boolean;
  holds?: 'phone' | 'cup';
  /** Boxing gloves up in guard, in this colour. */
  gloves?: string;
};
type Figure = { s: number; t: number; look: Look };

const SKIN = { light: '#F3C9AE', rose: '#EDB89A', tan: '#C98B62', deep: '#8A5636' };
const INK = '#1E1E1E';

/** Darker shade of a hex colour, for ears, sleeves and soles. */
function shade(hex: string, amount = 0.14) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * (1 - amount)));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

function Headgear({ look }: { look: Look }) {
  const c = look.headColor;
  switch (look.head) {
    case 'cap':
      return (
        <>
          {vinyl((f) => <path d="M-9.4,-35 A9.4 9.4 0 0 1 9.4,-35 Z" fill={f} />, c)}
          {vinyl((f) => <ellipse cx="5" cy="-35.4" rx="7.4" ry="2.4" fill={f} />, look.brim ?? shade(c, 0.2))}
          <path d="M-8,-35.6 Q0,-37 8,-35.6" fill="none" stroke={shade(c, 0.3)} strokeWidth="0.5" />
        </>
      );
    case 'bucket':
      return (
        <>
          <ellipse cx="0" cy="-36" rx="13" ry="3.6" fill={shade(c, 0.25)} />
          {vinyl((f) => <path d="M-8.6,-36 C-8.6,-46 8.6,-46 8.6,-36 Z" fill={f} />, c)}
          {vinyl((f) => <ellipse cx="0" cy="-36.4" rx="12.4" ry="3" fill={f} />, c)}
        </>
      );
    case 'long':
    case 'hair':
      return vinyl((f) => <path d="M-9.3,-33.5 A9.3 9.3 0 0 1 9.3,-33.5 C6,-38.5 -2,-39 -9.3,-33.5 Z" fill={f} />, c);
    case 'buzz':
      return vinyl((f) => <path d="M-8.9,-35.5 A9 9 0 0 1 8.9,-35.5 C5,-38 -4,-38.4 -8.9,-35.5 Z" fill={f} />, c);
  }
}

/**
 * Vinyl material: the shape in its colour, then a shadow towards the bottom right and a soft
 * highlight at the top left, like a toy lit from above.
 */
function vinyl(shape: (fill: string) => ReactNode, color: string) {
  return (
    <>
      {shape(color)}
      {shape('url(#bld-vinyl-dark)')}
      {shape('url(#bld-vinyl-light)')}
    </>
  );
}

/** A rounded limb from (x1, y1) to (x2, y2), drawn as a rect so the vinyl gradients apply. */
function limb(x1: number, y1: number, x2: number, y2: number, width: number) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI - 90;
  return (fill: string) => (
    <rect
      x={-width / 2}
      y={0}
      width={width}
      height={length}
      rx={width / 2}
      fill={fill}
      transform={`translate(${x1} ${y1}) rotate(${angle.toFixed(1)})`}
    />
  );
}

/** A designer-toy figure standing at floor point (s, t). */
function Person({ origin, s, t, look }: Figure & { origin: Point }) {
  const [x, y] = iso(origin, s, t);
  const sleeve = shade(look.top, 0.08);
  const legBottom = look.shorts ? -6.6 : -2.4;
  const crease = shade(look.top, 0.28);
  const arms = look.gloves
    ? [limb(-6, -21, -6.6, -24.6, 4), limb(6, -21, 6.8, -25.2, 4)]
    : [limb(-6.2, -22.4, -8, -14, 4), limb(6.2, -22.4, 8, -14, 4)];
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(0.92)`}>
      <ellipse cx="2.5" cy="0" rx="10" ry="3.2" fill="#000" fillOpacity="0.2" filter="url(#bld-blur-s)" />

      {look.head === 'long' && vinyl((f) => <rect x="-9.6" y="-40" width="19.2" height="25" rx="8" fill={f} />, look.headColor)}

      {/* Legs and sneakers */}
      {look.shorts && (
        <>
          {vinyl((f) => <rect x="-4.4" y="-7.4" width="3" height="6" rx="1.5" fill={f} />, look.skin)}
          {vinyl((f) => <rect x="1.4" y="-7.4" width="3" height="6" rx="1.5" fill={f} />, look.skin)}
        </>
      )}
      {vinyl((f) => <rect x="-5.7" y="-12.4" width="5.1" height={12.4 + legBottom} rx="2.3" fill={f} />, look.bottom)}
      {vinyl((f) => <rect x="0.6" y="-12.4" width="5.1" height={12.4 + legBottom} rx="2.3" fill={f} />, look.bottom)}
      <line x1="-3.1" y1="-10" x2="-3.1" y2={legBottom - 0.6} stroke={shade(look.bottom, 0.22)} strokeWidth="0.5" strokeLinecap="round" />
      <line x1="3.1" y1="-10" x2="3.1" y2={legBottom - 0.6} stroke={shade(look.bottom, 0.22)} strokeWidth="0.5" strokeLinecap="round" />
      <ellipse cx="-3.2" cy="-0.7" rx="3.8" ry="1.2" fill="#FAFAFA" />
      <ellipse cx="3.4" cy="-0.5" rx="3.8" ry="1.2" fill="#FAFAFA" />
      {vinyl((f) => <ellipse cx="-3.2" cy="-1.8" rx="3.6" ry="2.1" fill={f} />, look.shoes)}
      {vinyl((f) => <ellipse cx="3.4" cy="-1.6" rx="3.6" ry="2.1" fill={f} />, look.shoes)}

      {/* Body, with a zip or placket and a hem */}
      {vinyl((f) => <rect x="-7" y="-25.4" width="14" height="15.4" rx="5.6" fill={f} />, look.top)}
      <path d="M0,-23.6 L0,-11.2" stroke={crease} strokeWidth="0.55" strokeLinecap="round" />
      <path d="M-6.4,-12.4 Q0,-11 6.4,-12.4" fill="none" stroke={crease} strokeWidth="0.6" strokeLinecap="round" />
      <path d="M-4.6,-20 Q-3.2,-17.6 -4.2,-15" fill="none" stroke={crease} strokeWidth="0.45" strokeLinecap="round" />

      {/* Arms, hands, what they hold */}
      {arms.map((arm, index) => (
        <g key={index}>{vinyl(arm, sleeve)}</g>
      ))}
      {!look.gloves && (
        <>
          {look.holds === 'cup' && vinyl((f) => <path d="M-11.2,-17.8 L-5.4,-17.8 L-6.3,-10.8 L-10.3,-10.8 Z" fill={f} />, '#5B8DEF')}
          {vinyl((f) => <circle cx="-8.2" cy="-12.6" r="2.8" fill={f} />, look.skin)}
          {vinyl((f) => <circle cx="8.2" cy="-12.6" r="2.8" fill={f} />, look.skin)}
          {look.holds === 'phone' && <rect x="7.4" y="-19.6" width="3.4" height="6.2" rx="0.9" fill="#2F6B4C" />}
        </>
      )}

      {/* Shadow of the head on the shoulders */}
      <ellipse cx="0.8" cy="-24.6" rx="7" ry="2.2" fill="#000" fillOpacity="0.22" filter="url(#bld-blur-s)" />

      {/* Head: ears, face, hair or hat */}
      {vinyl((f) => <circle cx="-9" cy="-32.5" r="3.5" fill={f} />, shade(look.skin, 0.04))}
      {vinyl((f) => <circle cx="9" cy="-32.5" r="3.5" fill={f} />, shade(look.skin, 0.04))}
      {vinyl((f) => <circle cx="0" cy="-33" r="9.2" fill={f} />, look.skin)}
      <ellipse cx="-2.6" cy="-37.6" rx="3.2" ry="1.6" fill="#FFFFFF" fillOpacity="0.35" />
      <Headgear look={look} />

      {look.eyes === 'sunglasses' ? (
        <g>
          <ellipse cx="-3" cy="-32.4" rx="2.6" ry="1.8" fill={INK} />
          <ellipse cx="3" cy="-32.4" rx="2.6" ry="1.8" fill={INK} />
          <rect x="-0.8" y="-33" width="1.6" height="0.7" fill={INK} />
          <ellipse cx="-3.9" cy="-33.2" rx="0.8" ry="0.45" fill="#FFFFFF" fillOpacity="0.7" />
          <ellipse cx="2.1" cy="-33.2" rx="0.8" ry="0.45" fill="#FFFFFF" fillOpacity="0.7" />
        </g>
      ) : (
        <>
          <ellipse cx="-2.8" cy="-32.2" rx="1.7" ry="2" fill="#FFFFFF" />
          <ellipse cx="2.8" cy="-32.2" rx="1.7" ry="2" fill="#FFFFFF" />
          <circle cx="-2.4" cy="-31.9" r="1.05" fill={INK} />
          <circle cx="3.2" cy="-31.9" r="1.05" fill={INK} />
          <circle cx="-2.75" cy="-32.3" r="0.35" fill="#FFFFFF" />
          <circle cx="2.85" cy="-32.3" r="0.35" fill="#FFFFFF" />
          {look.eyes === 'glasses' && (
            <g fill="none" stroke={INK} strokeWidth="0.75">
              <circle cx="-2.8" cy="-32.2" r="2.5" />
              <circle cx="2.8" cy="-32.2" r="2.5" />
              <line x1="-0.3" y1="-32.4" x2="0.3" y2="-32.4" />
            </g>
          )}
        </>
      )}
      {look.head !== 'cap' && look.head !== 'bucket' && (
        <g stroke={INK} strokeWidth="1" strokeLinecap="round">
          <line x1="-4.6" y1="-35.8" x2="-1.4" y2="-35" />
          <line x1="1.4" y1="-35" x2="4.6" y2="-35.8" />
        </g>
      )}
      <ellipse cx="-5.4" cy="-29.4" rx="1.5" ry="0.8" fill="#E8907A" fillOpacity="0.35" />
      <ellipse cx="5.4" cy="-29.4" rx="1.5" ry="0.8" fill="#E8907A" fillOpacity="0.35" />
      <line x1="-0.9" y1="-27.8" x2="0.9" y2="-27.8" stroke={shade(look.skin, 0.4)} strokeWidth="0.8" strokeLinecap="round" />

      {look.headphones && (
        <>
          <path d="M-9.6,-33 A9.8 9.8 0 0 1 9.6,-33" fill="none" stroke={INK} strokeWidth="1.8" />
          {vinyl((f) => <ellipse cx="-9.4" cy="-32" rx="2.6" ry="3.4" fill={f} />, INK)}
          {vinyl((f) => <ellipse cx="9.4" cy="-32" rx="2.6" ry="3.4" fill={f} />, INK)}
        </>
      )}

      {look.gloves && (
        <>
          {vinyl((f) => <circle cx="-6.4" cy="-25.6" r="3.9" fill={f} />, look.gloves)}
          {vinyl((f) => <circle cx="6.8" cy="-26.2" r="3.9" fill={f} />, look.gloves)}
        </>
      )}
    </g>
  );
}

/** Draws a floor's figures back to front, so the nearer ones overlap the farther ones. */
function People({ origin, figures, prefix }: { origin: Point; figures: Figure[]; prefix: string }) {
  return (
    <>
      {[...figures]
        .sort((a, b) => a.s + a.t - (b.s + b.t))
        .map((figure) => (
          <Person key={`${prefix}-${figure.s}-${figure.t}`} origin={origin} {...figure} />
        ))}
    </>
  );
}

const RNDS_PEOPLE: Figure[] = [
  // The two boxers sparring in the ring
  { s: 122, t: 126, look: { skin: SKIN.tan, top: '#1F1F1F', bottom: RNDS, shoes: '#F4F4F4', head: 'buzz', headColor: '#2A2A2A', shorts: true, gloves: RNDS } },
  { s: 172, t: 110, look: { skin: SKIN.light, top: '#F4F4F4', bottom: '#2B2B2B', shoes: '#1F1F1F', head: 'hair', headColor: '#6B4A32', shorts: true, gloves: '#1F1F1F' } },
  // Coach by the bags
  { s: 268, t: 58, look: { skin: SKIN.rose, top: '#1F1F1F', bottom: '#1F1F1F', shoes: '#F4F4F4', head: 'bucket', headColor: '#1F1F1F', holds: 'phone' } },
  { s: 60, t: 212, look: { skin: SKIN.light, top: '#9CC8F2', bottom: '#EFEBE3', shoes: '#F4F4F4', head: 'hair', headColor: '#4A3A30', eyes: 'glasses', holds: 'cup' } },
  { s: 300, t: 200, look: { skin: SKIN.deep, top: '#B8AE7E', bottom: '#B8AE7E', shoes: '#1F1F1F', head: 'cap', headColor: '#F4F4F4', brim: '#DADADA', shorts: true } },
  { s: 300, t: 110, look: { skin: SKIN.rose, top: '#F2F2F2', bottom: '#F2F2F2', shoes: '#F4F4F4', head: 'cap', headColor: '#2C4FB8' } },
];

const CLUB_PEOPLE: Figure[] = [
  // At the bar
  { s: 58, t: 96, look: { skin: SKIN.light, top: '#EFE7D2', bottom: '#2B2B2B', shoes: '#E9DFC8', head: 'hair', headColor: '#1F1F1F', eyes: 'glasses' } },
  { s: 58, t: 168, look: { skin: SKIN.rose, top: '#F0E9DE', bottom: '#2B2B2B', shoes: '#1F1F1F', head: 'long', headColor: '#8A5A3C', eyes: 'sunglasses' } },
  // Around the first dice table
  { s: 160, t: 150, look: { skin: SKIN.tan, top: CLUB, bottom: '#2B2B2B', shoes: '#F4F4F4', head: 'cap', headColor: '#1F1F1F' } },
  { s: 203, t: 111, look: { skin: SKIN.light, top: '#1F1F1F', bottom: '#1F1F1F', shoes: '#F4F4F4', head: 'hair', headColor: '#3A2A20', headphones: true, holds: 'phone' } },
  { s: 206, t: 156, look: { skin: SKIN.deep, top: '#F4F4F4', bottom: '#6FA8DC', shoes: '#F2C14E', head: 'cap', headColor: '#3E8E5E', shorts: true } },
  // Second table
  { s: 262, t: 150, look: { skin: SKIN.rose, top: '#B8AE7E', bottom: '#EFEBE3', shoes: '#1F1F1F', head: 'buzz', headColor: '#8C8C8C' } },
  { s: 312, t: 96, look: { skin: SKIN.light, top: '#9CC8F2', bottom: '#2B2B2B', shoes: '#F4F4F4', head: 'bucket', headColor: '#EFEBE3' } },
  // Walking in
  { s: 120, t: 214, look: { skin: SKIN.tan, top: '#2B2B2B', bottom: '#B8AE7E', shoes: '#F4F4F4', head: 'hair', headColor: '#1F1F1F', eyes: 'sunglasses' } },
];

/**
 * Drawing based on reference/maquette.dc.html, redrawn as a white clay scale model:
 * soft shading on every face, contact shadows, words painted on the floor and one route per
 * project in its colour. The project colours stay on a few details only.
 */
function BuildingArt() {
  const R = RNDS_FLOOR;
  const C = CLUB_FLOOR;
  return (
    <svg viewBox="-80 -40 1170 730" className="building-art" aria-hidden="true">
      <defs>
        <linearGradient id="bld-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F2F2F2" />
        </linearGradient>
        <linearGradient id="bld-side-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D4D4D4" />
          <stop offset="1" stopColor="#C6C6C6" />
        </linearGradient>
        <linearGradient id="bld-side-right" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E6E6E6" />
          <stop offset="1" stopColor="#D9D9D9" />
        </linearGradient>
        <linearGradient id="bld-wall-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EFEFEF" />
          <stop offset="1" stopColor="#E0E0E0" />
        </linearGradient>
        <linearGradient id="bld-wall-right" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FAFAFA" />
          <stop offset="1" stopColor="#ECECEC" />
        </linearGradient>
        <linearGradient id="bld-post" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E4E4E4" />
          <stop offset="1" stopColor="#B8B8B8" />
        </linearGradient>
        <radialGradient id="bld-vinyl-light" cx="0.3" cy="0.22" r="0.6">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bld-vinyl-dark" cx="0.32" cy="0.25" r="0.95">
          <stop offset="0.45" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.32" />
        </radialGradient>
        <radialGradient id="bld-sheen" cx="0.32" cy="0.28" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bld-ground" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#E9E9E9" />
          <stop offset="1" stopColor="#D6D6D6" />
        </radialGradient>
        {/* Fine grain over the whole scene, like a render */}
        <filter id="bld-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 0.07" />
        </filter>
        <filter id="bld-blur-l" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="bld-blur-m" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="bld-blur-s" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
        <clipPath id="bld-clip-rnds">
          <polygon points={points(R, [[0, 0], [320, 0], [320, 250], [0, 250]])} />
        </clipPath>
        <clipPath id="bld-clip-club">
          <polygon points={points(C, [[0, 0], [320, 0], [320, 250], [0, 250]])} />
        </clipPath>
      </defs>

      {/* The table: grey ground, and the roads that run between the plots */}
      <rect x="-80" y="-40" width="1170" height="730" fill="url(#bld-ground)" />
      <g fill="none" stroke="#F7F7F7" strokeWidth="2.2" strokeDasharray="12 10" strokeLinecap="round">
        <polyline points={points(SITE_GROUND, [[403, -120], [403, 760]])} />
        <polyline points={points(SITE_GROUND, [[-120, 621], [620, 621]])} />
        <polyline points={points(SITE_GROUND, [[-28, -120], [-28, 760]])} />
        <polyline points={points(SITE_GROUND, [[-120, -28], [620, -28]])} />
      </g>
      {/* Zebra crossing at the front corner */}
      <g fill="#F7F7F7">
        {[0, 1, 2, 3, 4].map((i) => (
          <polygon key={i} points={points(SITE_GROUND, [[372 + i * 13, 596], [379 + i * 13, 596], [379 + i * 13, 646], [372 + i * 13, 646]])} />
        ))}
      </g>

      {/* Plots behind the building */}
      <Slab s0={-140} t0={40} s1={-56} t1={540} r={22} h={6} top="#EFEFEF" side="#D0D0D0" />
      <Slab s0={30} t0={-140} s1={380} t1={-56} r={22} h={6} top="#EFEFEF" side="#D0D0D0" />
      <Tree s={-100} t={110} />
      <Tree s={-92} t={270} size={0.9} />
      <Tree s={-102} t={430} />
      <Tree s={90} t={-100} size={0.9} />
      <Tree s={220} t={-96} />
      <Tree s={340} t={-102} size={0.85} />

      {/* Base plate */}
      <Slab s0={0} t0={0} s1={366} t1={586} r={26} h={14} top="#F7F7F7" side="#CFCFCF" shadow={0.16} />

      {/* RNDS floor */}
      <polygon points="877,280 877,298 660.5,423 660.5,405" fill="url(#bld-side-right)" />
      <polygon points="660.5,405 660.5,423 383.5,263 383.5,245" fill="url(#bld-side-left)" />
      <polygon points="600,120 877,280 660.5,405 383.5,245" fill="url(#bld-top)" stroke="#E3E3E3" />
      <g stroke="#F0F0F0" strokeWidth="1"><line x1="655" y1="152" x2="438" y2="277" /><line x1="710" y1="184" x2="493" y2="309" /><line x1="765" y1="216" x2="548" y2="341" /><line x1="820" y1="248" x2="603" y2="373" /></g>
      <g clipPath="url(#bld-clip-rnds)" filter="url(#bld-blur-m)" fill="#000" fillOpacity="0.09">
        <polygon points={points(R, [[8, 8], [8, 250], [30, 250], [30, 8]])} />
        <polygon points={points(R, [[8, 8], [320, 8], [320, 30], [8, 30]])} />
      </g>
      <Walls origin={R} left={95} right={95} thick={8} />
      {/* RNDS logo as in the brand kit: Kode Mono Bold, black on light, red dot top right, no tilt or effect */}
      <g transform={`matrix(0.866 -0.5 0 1 ${iso(R, 8, 196).join(' ')}) translate(0 -40)`}>
        <text fontFamily="'Kode Mono', ui-monospace, monospace" fontWeight="700" fontSize="34" fill="#000000" textLength="88" lengthAdjust="spacing">RNDS</text>
        <circle cx="95" cy="-24" r="3.6" fill={RNDS} />
        <text y="15" fontFamily="'Kode Mono', ui-monospace, monospace" fontSize="9" fill="#8E8E8B" letterSpacing="2.2">BOXING CLUB</text>
      </g>
      <line x1="626" y1="40" x2="626" y2="92" stroke="#CFCFCF" />
      <ellipse cx="626" cy="96" rx="16" ry="6" fill="#D4D4D4" />
      <polygon points="612,98 640,98 742,255 626,322 510,255" fill="#FFFFFF" fillOpacity="0.5" />

      <FloorText origin={R} s={262} t={204} alongT>RING</FloorText>
      <Route origin={R} color={RNDS} solid={[[282, 70], [282, 120], [236, 120]]} dashed={[[294, 70], [294, 132], [236, 132]]} />

      {/* Punching bags */}
      <ellipse cx="812" cy="276" rx="9" ry="3.5" fill="#000" fillOpacity="0.12" filter="url(#bld-blur-s)" />
      <ellipse cx="846" cy="296" rx="9" ry="3.5" fill="#000" fillOpacity="0.12" filter="url(#bld-blur-s)" />
      <line x1="808" y1="192" x2="808" y2="228" stroke="#B4B4B4" strokeWidth="2" />
      <rect x="801" y="228" width="14" height="38" rx="6" fill={RNDS} />
      <rect x="801" y="236" width="14" height="4" fill={RNDS_DARK} />
      <rect x="801" y="228" width="14" height="38" rx="6" fill="url(#bld-sheen)" />
      <line x1="842" y1="212" x2="842" y2="248" stroke="#B4B4B4" strokeWidth="2" />
      <rect x="835" y="248" width="14" height="38" rx="6" fill={RNDS} />
      <rect x="835" y="256" width="14" height="4" fill={RNDS_DARK} />
      <rect x="835" y="248" width="14" height="38" rx="6" fill="url(#bld-sheen)" />

      {/* Ring */}
      <polygon points="504.7,263 626,193 747.2,263 626,333" fill="#000" fillOpacity="0.14" filter="url(#bld-blur-m)" />
      <polygon points="504.7,255 626,325 626,339 504.7,269" fill="url(#bld-side-left)" />
      <polygon points="626,325 747.2,255 747.2,269 626,339" fill="url(#bld-side-right)" />
      <polygon points="626,185 747.2,255 626,325 504.7,255" fill="url(#bld-top)" stroke="#DADADA" />
      <polygon points="626,203 716,255 626,307 536,255" fill="none" stroke={RNDS} strokeOpacity="0.35" />
      <circle cx="626" cy="255" r="14" fill="none" stroke={RNDS} strokeOpacity="0.3" />
      <rect x="624" y="153" width="4" height="32" rx="2" fill="url(#bld-post)" />
      <rect x="745.2" y="223" width="4" height="32" rx="2" fill="url(#bld-post)" />
      <rect x="502.7" y="223" width="4" height="32" rx="2" fill="url(#bld-post)" />
      <polygon points="626,155 747.2,225 626,295 504.7,225" fill="none" stroke={RNDS} strokeWidth="1.6" />
      <polygon points="626,167 747.2,237 626,307 504.7,237" fill="none" stroke={RNDS} strokeWidth="1.6" />
      <polygon points="626,179 747.2,249 626,319 504.7,249" fill="none" stroke={RNDS} strokeWidth="1.2" strokeOpacity="0.6" />
      <People origin={R} figures={RNDS_PEOPLE} prefix="r" />
      <rect x="624" y="293" width="4" height="32" rx="2" fill="url(#bld-post)" />

      {/* Club 421 floor */}
      <polygon points="626,425 626,443 409.5,568 409.5,550" fill="url(#bld-side-right)" />
      <polygon points="409.5,550 409.5,568 132.4,408 132.4,390" fill="url(#bld-side-left)" />
      <polygon points="348.9,265 626,425 409.5,550 132.4,390" fill="url(#bld-top)" stroke="#E3E3E3" />
      <g stroke="#F0F0F0" strokeWidth="1"><line x1="404" y1="297" x2="187" y2="422" /><line x1="459" y1="329" x2="242" y2="454" /><line x1="514" y1="361" x2="297" y2="486" /><line x1="569" y1="393" x2="352" y2="518" /></g>
      <g clipPath="url(#bld-clip-club)" filter="url(#bld-blur-m)" fill="#000" fillOpacity="0.09">
        <polygon points={points(C, [[8, 8], [8, 250], [30, 250], [30, 8]])} />
        <polygon points={points(C, [[8, 8], [320, 8], [320, 22], [8, 22]])} />
      </g>
      <Walls origin={C} left={95} thick={8} />
      <Walls origin={C} right={24} thick={8} />
      {/* Club 421 logo on the back wall, beside the bar shelf */}
      <image
        href={logo421}
        width="60"
        height="60"
        transform={`matrix(0.866 -0.5 0 1 ${iso(C, 8, 232).join(' ')}) translate(0 -88)`}
      />
      {/* Shelf of bottles on the wall behind the bar */}
      <polygon points={solid(C, [[8, 48, 50], [14, 48, 50], [14, 160, 50], [8, 160, 50]])} fill="#FFFFFF" stroke="#D8D8D8" strokeWidth="0.6" />
      <polygon points={solid(C, [[14, 48, 48], [14, 160, 48], [14, 160, 50], [14, 48, 50]])} fill="#D6D6D6" />
      {[56, 68, 80, 92, 104, 116, 128, 140, 152].map((t, index) => {
        const [x, y] = iso(C, 11, t);
        const colors = ['#3E7D5A', '#8A5A2B', CLUB, '#E9E4D8', '#3E7D5A', '#B23A48', '#8A5A2B', '#E9E4D8', CLUB];
        return <Bottle key={t} x={x} y={y - 50} color={colors[index]} tall={index % 3 === 1 ? 1.2 : 1} />;
      })}

      <FloorText origin={C} s={74} t={146} alongT size={18}>BAR</FloorText>
      <FloorText origin={C} s={150} t={236} size={18}>TABLES</FloorText>
      <Route origin={C} color={CLUB} solid={[[52, 184], [290, 184], [290, 142]]} dashed={[[52, 196], [302, 196], [302, 142]]} />

      {/* Bar counter */}
      <polygon points={points(C, [[16, 44], [46, 44], [46, 208], [16, 208]])} fill="#000" fillOpacity="0.12" filter="url(#bld-blur-m)" />
      <g stroke="#DCDCDC" strokeWidth="0.8" strokeLinejoin="round">
        <polygon points={solid(C, [[40, 40, 0], [40, 200, 0], [40, 200, 24], [40, 40, 24]])} fill="url(#bld-side-left)" />
        <polygon points={solid(C, [[16, 200, 0], [40, 200, 0], [40, 200, 24], [16, 200, 24]])} fill="url(#bld-side-right)" />
        <polygon points={solid(C, [[16, 40, 24], [40, 40, 24], [40, 200, 24], [16, 200, 24]])} fill="url(#bld-top)" />
      </g>
      {/* On the bar: bottles, glasses and a dice cup */}
      {([[24, 60, '#3E7D5A'], [26, 74, '#8A5A2B'], [23, 170, CLUB], [27, 184, '#E9E4D8']] as [number, number, string][]).map(([bs, bt, color]) => {
        const [x, y] = iso(C, bs, bt);
        return <Bottle key={`${bs}-${bt}`} x={x} y={y - 24} color={color} />;
      })}
      {[100, 112, 136].map((gt) => {
        const [x, y] = iso(C, 30, gt);
        return <rect key={gt} x={x - 1.5} y={y - 28.5} width="3" height="4.5" rx="0.8" fill="#FFFFFF" fillOpacity="0.85" stroke="#CFCFCF" strokeWidth="0.5" />;
      })}
      {(() => {
        const [x, y] = iso(C, 30, 150);
        return vinyl((f) => <rect x={x - 2.4} y={y - 30} width="4.8" height="6" rx="1.4" fill={f} />, '#2B2B2B');
      })()}
      <line x1="392" y1="318" x2="392" y2="356" stroke="#CFCFCF" />
      <ellipse cx="392" cy="360" rx="13" ry="5" fill="#D4D4D4" />
      <polygon points="380,362 404,362 440,405 392,430 344,405" fill="#FFFFFF" fillOpacity="0.5" />

      {/* Dice tables */}
      <ellipse cx="396" cy="424" rx="26" ry="9" fill="#000" fillOpacity="0.14" filter="url(#bld-blur-m)" />
      <ellipse cx="504" cy="492" rx="22" ry="8" fill="#000" fillOpacity="0.14" filter="url(#bld-blur-m)" />
      <rect x="389.5" y="398" width="5" height="24" rx="2.5" fill="url(#bld-post)" />
      <ellipse cx="392" cy="402" rx="38" ry="21" fill="#D6D6D6" />
      <ellipse cx="392" cy="398" rx="38" ry="21" fill="url(#bld-top)" stroke={CLUB} strokeOpacity="0.5" />
      <rect x="380" y="389" width="9" height="9" rx="2" fill="#A8A8A8" transform="rotate(20 384.5 393.5)" />
      <rect x="394" y="394" width="9" height="9" rx="2" fill="#A8A8A8" transform="rotate(-15 398.5 398.5)" />
      <rect x="405" y="385" width="9" height="9" rx="2" fill={CLUB} transform="rotate(35 409.5 389.5)" />
      <rect x="497.5" y="468" width="5" height="22" rx="2.5" fill="url(#bld-post)" />
      <ellipse cx="500" cy="471" rx="32" ry="18" fill="#D6D6D6" />
      <ellipse cx="500" cy="468" rx="32" ry="18" fill="url(#bld-top)" />
      <rect x="494" y="462" width="8" height="8" rx="2" fill="#A8A8A8" transform="rotate(10 498 466)" />
      <People origin={C} figures={CLUB_PEOPLE} prefix="c" />

      {/* In front: the road traffic, then the plots across the road */}
      <Car s={408} t={210} alongT color="#F4F4F4" />
      <Car s={160} t={628} alongT={false} color="#DADADA" />
      <Slab s0={440} t0={70} s1={540} t1={480} r={22} h={6} top="#EFEFEF" side="#D0D0D0" />
      <Slab s0={40} t0={656} s1={400} t1={750} r={22} h={6} top="#EFEFEF" side="#D0D0D0" />
      <Lamp s={448} t={110} />
      <Lamp s={448} t={300} />
      <Lamp s={70} t={664} />
      <Tree s={482} t={130} />
      <Tree s={500} t={230} size={1.1} />
      <Tree s={480} t={340} size={0.9} />
      <Tree s={505} t={440} />
      <Tree s={130} t={705} size={0.95} />
      <Tree s={250} t={700} size={1.1} />
      <Tree s={360} t={708} size={0.9} />

      <rect x="-80" y="-40" width="1170" height="730" filter="url(#bld-grain)" />

    </svg>
  );
}
