import { useEffect, useId, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Project, ProjectId } from '../data/types';
import { agentStatusLabel, projectStatus } from '../lib/format';
import MapViewport from './MapViewport';
import ModuleIcon from './ModuleIcon';
import { useStored } from '../hooks/useStored';
import { phaseLabel, usePhase } from '../lib/sun';
import type { PhaseChoice } from '../lib/sun';
import logo421 from '../assets/logo-421-violet.svg';
import './Building.css';

type Props = {
  projects: Project[];
};

/** The isometric building of the home page: one floor per project, each floor opens its workspace. */
export default function Building({ projects }: Props) {
  const [choice, setChoice] = usePhaseChoice();
  const phase = usePhase(choice);
  return (
    <div className="building" data-phase={phase}>
      <div className="building-stage">
      <MapViewport label="Le site Marc HQ. Glisse pour te déplacer, pince ou ⌘ + molette pour zoomer.">
        <BuildingArt />
        {/* Large invisible click zones over each floor. Keyboard users get the labels below instead. */}
        {projects.map((project) => (
          <Link
            key={`zone-${project.id}`}
            to={`/${project.id}/vue-d-ensemble`}
            className={`building-zone building-zone--${project.id}`}
            tabIndex={-1}
            aria-hidden="true"
            draggable={false}
          />
        ))}
      </MapViewport>
      <span className="building-hint" aria-hidden="true">
        Clique sur un étage · glisse pour te déplacer
      </span>
      <PhaseButton choice={choice} phase={phase} onChange={setChoice} />
      </div>

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

    </div>
  );
}

/** Day or night on the model: by default it follows the clock; the choice is kept in this browser. */
export function usePhaseChoice() {
  return useStored<PhaseChoice>('marc-hq:phase', () => 'auto');
}

const NEXT_CHOICE: Record<PhaseChoice, PhaseChoice> = { auto: 'day', day: 'night', night: 'auto' };

/** Small pill on the model: shows the light of the moment and cycles Auto → Jour → Nuit. */
export function PhaseButton({ choice, phase, onChange }: { choice: PhaseChoice; phase: ReturnType<typeof usePhase>; onChange: (update: (prev: PhaseChoice) => PhaseChoice) => void }) {
  const night = phase === 'night' || phase === 'dusk';
  return (
    <button
      type="button"
      className="phase-button"
      onClick={() => onChange((prev) => NEXT_CHOICE[prev])}
      aria-label={`Lumière : ${phaseLabel[phase]}${choice === 'auto' ? ', selon l’heure' : ', forcée'}. Changer`}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        {night ? (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
        ) : (
          <>
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
          </>
        )}
      </svg>
      {phaseLabel[phase]}
      <span className="phase-button-mode">{choice === 'auto' ? 'auto' : 'forcé'}</span>
    </button>
  );
}

// Project colours, same values as src/styles/tokens.css. The rest of the model is white and grey.
const RNDS = '#FF0A3C';
const RNDS_DARK = '#C8002C';
const CLUB = '#7C3AED';

export type Point = [number, number];

// Back corner of each floor. Both floors are 320 units deep along s (towards the bottom right)
// and 250 units along t (towards the bottom left), on a 30° isometric grid.
// The site: top of the base plate (SITE) and the table it stands on (GROUND), 14 lower.
// The plate is 366 units along s and 586 along t.
const SITE_GROUND: Point = [600, 110];
const RNDS_FLOOR: Point = [600, 120];
const CLUB_FLOOR: Point = [348.9, 265];

/** Floor coordinates (s, t) to drawing coordinates. */
export function iso([x, y]: Point, s: number, t: number): Point {
  return [x + 0.866 * (s - t), y + 0.5 * (s + t)];
}

export function points(origin: Point, list: Point[]) {
  return list.map(([s, t]) => iso(origin, s, t).map((n) => n.toFixed(1)).join(',')).join(' ');
}

/** Same as points(), with a height h above the floor for each point: (s, t, h). */
export function solid(origin: Point, list: [number, number, number][]) {
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
    <g stroke="#DADDED" strokeWidth="0.8" strokeLinejoin="round">
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
export function Slab({ s0, t0, s1, t1, r, h, top, side, shadow = 0.12, origin = SITE_GROUND }: {
  origin?: Point;
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
  const outline = roundedRect(s0, t0, s1, t1, r).map(([s, t]) => iso(origin, s, t));
  const raised = outline.map(([x, y]) => [x, y - h] as Point);
  return (
    <g>
      <polygon points={toPath(outline.map(([x, y]) => [x + 10, y + 12] as Point))} fill="#2E3470" fillOpacity={shadow} filter="url(#bld-blur-l)" />
      <polygon points={toPath(hull([...outline, ...raised]))} fill={side} />
      <polygon points={toPath(raised)} fill={top} />
    </g>
  );
}

// Roads around the site, in ground units: [from, to] across the road, and the road's axis.
const ROADS: { across: [number, number]; alongT: boolean }[] = [
  { across: [378, 432], alongT: true },
  { across: [596, 648], alongT: false },
  { across: [-50, -8], alongT: true },
  { across: [-50, -8], alongT: false },
  // Outer roads, between the back plots and the blocks in the corners
  { across: [-196, -156], alongT: true },
  { across: [-196, -156], alongT: false },
  { across: [556, 590], alongT: true },
];

/** Asphalt bands with edge lines, a dashed centre line and zebra crossings by the front corner. */
function Roads() {
  // Far enough that every road runs off the edges of the drawing
  const far = [-900, 1500] as const;
  const quad = (a0: number, a1: number, b0: number, b1: number, alongT: boolean) =>
    points(SITE_GROUND, alongT ? [[a0, b0], [a1, b0], [a1, b1], [a0, b1]] : [[b0, a0], [b1, a0], [b1, a1], [b0, a1]]);
  const line = (a: number, alongT: boolean) =>
    points(SITE_GROUND, alongT ? [[a, far[0]], [a, far[1]]] : [[far[0], a], [far[1], a]]);
  return (
    <g>
      {ROADS.map(({ across: [a0, a1], alongT }) => (
        <g key={`${a0}-${alongT}`}>
          <polygon points={quad(a0, a1, far[0], far[1], alongT)} fill="url(#bld-asphalt)" />
          <g fill="none" stroke="#F4F4F4" strokeLinecap="round">
            <polyline points={line(a0 + 3, alongT)} strokeWidth="1" strokeOpacity="0.8" />
            <polyline points={line(a1 - 3, alongT)} strokeWidth="1" strokeOpacity="0.8" />
            <polyline points={line((a0 + a1) / 2, alongT)} strokeWidth="1.8" strokeDasharray="14 12" />
          </g>
        </g>
      ))}
      {/* Zebra crossings, one on each front road, near the corner */}
      <g fill="#F5F6FA">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <polygon key={`a${i}`} points={quad(382, 428, 548 + i * 7, 552 + i * 7, true)} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <polygon key={`b${i}`} points={quad(600, 644, 322 + i * 7, 326 + i * 7, false)} />
        ))}
      </g>
    </g>
  );
}

/**
 * A low clay sports car driving along t (or along s): wedge body with a plunging bonnet, a small
 * cabin set back under a steep windscreen, a rear wing, big wheels with silver rims, a slim light
 * bar at the front and optional racing stripes.
 */
function Car({ s, t, alongT, color, stripes }: { s: number; t: number; alongT: boolean; color: string; stripes?: string }) {
  const o = SITE_GROUND;
  // The car's own frame: u along its length (rear 0, nose 46), v across (0 to 19), h up.
  const at = (u: number, v: number, h: number): [number, number, number] => (alongT ? [s + v, t + u, h] : [s + u, t + v, h]);
  const face = (list: [number, number, number][]) => solid(o, list.map(([u, v, h]) => at(u, v, h)));
  const side = shade(color, 0.16);
  const nose = shade(color, 0.08);
  const W = 19;
  const wheel = (u: number) => {
    const [ws, wt, wh] = at(u, W, 3.6);
    const [x, y] = iso(o, ws, wt);
    return (
      <g key={u}>
        <circle cx={x} cy={y - wh} r="4" fill="#1E1E1E" />
        <circle cx={x} cy={y - wh} r="2.3" fill="#C9CDD2" />
        <circle cx={x} cy={y - wh} r="0.8" fill="#6B7178" />
      </g>
    );
  };
  return (
    <g>
      <polygon points={face([[0, 0, 0], [46, 0, 0], [46, W, 0], [0, W, 0]])} fill="#2E3470" fillOpacity="0.24" filter="url(#bld-blur-m)" transform="translate(3 4)" />
      {/* Wedge body: side, nose, rear deck and plunging bonnet */}
      <polygon points={face([[1, W, 2.4], [46, W, 2.4], [46, W, 5], [31, W, 8], [1, W, 8.6]])} fill={side} />
      <polygon points={face([[46, 0, 2.4], [46, W, 2.4], [46, W, 5], [46, 0, 5]])} fill={nose} />
      {vinyl((f) => <polygon points={face([[0, 0, 8.6], [31, 0, 8], [31, W, 8], [0, W, 8.6]])} fill={f} />, color)}
      {vinyl((f) => <polygon points={face([[31, 0, 8], [46, 0, 5], [46, W, 5], [31, W, 8]])} fill={f} />, color)}
      {stripes && (
        <>
          <polygon points={face([[0, 7, 8.6], [46, 7, 5], [46, 8.6, 5], [0, 8.6, 8.6]])} fill={stripes} />
          <polygon points={face([[0, 10.4, 8.6], [46, 10.4, 5], [46, 12, 5], [0, 12, 8.6]])} fill={stripes} />
        </>
      )}
      {/* Low cabin, set back, steep windscreen */}
      <polygon points={face([[13, W - 2, 8.4], [30, W - 2, 8], [24, W - 3.4, 12.6], [16, W - 3.4, 12.6]])} fill="url(#bld-glass)" />
      <polygon points={face([[30, 2, 8], [30, W - 2, 8], [24, W - 3.4, 12.6], [24, 3.4, 12.6]])} fill="url(#bld-glass)" />
      {vinyl((f) => <polygon points={face([[16, 3.4, 12.6], [24, 3.4, 12.6], [24, W - 3.4, 12.6], [16, W - 3.4, 12.6]])} fill={f} />, color)}
      {/* Rear wing on two posts */}
      <line {...lineAt(face([[2, 3, 8.6], [2, 3, 11.4]]))} stroke="#1E1E1E" strokeWidth="1.2" />
      <line {...lineAt(face([[2, W - 3, 8.6], [2, W - 3, 11.4]]))} stroke="#1E1E1E" strokeWidth="1.2" />
      <polygon points={face([[0, 0.5, 11.4], [4.5, 0.5, 11.4], [4.5, W - 0.5, 11.4], [0, W - 0.5, 11.4]])} fill="#1E1E1E" />
      {/* Slim light bar at the nose, light at the back */}
      <polygon points={face([[46, 2.5, 3.8], [46, W - 2.5, 3.8], [46, W - 2.5, 4.6], [46, 2.5, 4.6]])} fill="#FFF7D6" />
      <polygon points={face([[1, W, 6.6], [5, W, 6.6], [5, W, 7.6], [1, W, 7.6]])} fill={RNDS} />
      {wheel(9)}
      {wheel(36)}
    </g>
  );
}

/** x1/y1/x2/y2 of a two-point "x,y x,y" string, for a <line>. */
function lineAt(pair: string) {
  const [[x1, y1], [x2, y2]] = pair.split(' ').map((p) => p.split(',').map(Number));
  return { x1, y1, x2, y2 };
}

/** A white clay tree: a trunk and three round crowns. */
export function Tree({ s, t, size = 1, base = 6, origin = SITE_GROUND }: { s: number; t: number; size?: number; base?: number; origin?: Point }) {
  const [x, y0] = iso(origin, s, t);
  const y = y0 - base;
  const k = size;
  return (
    <g>
      <ellipse cx={x + 8 * k} cy={y + 2} rx={16 * k} ry={6 * k} fill="#2E3470" fillOpacity="0.16" filter="url(#bld-blur-m)" />
      <rect x={x - 1.6 * k} y={y - 18 * k} width={3.2 * k} height={18 * k} rx={1.6 * k} fill="#CDD1E5" />
      {vinyl((f) => <circle cx={x - 6 * k} cy={y - 22 * k} r={8 * k} fill={f} />, '#F1F2F8')}
      {vinyl((f) => <circle cx={x + 6 * k} cy={y - 24 * k} r={9 * k} fill={f} />, '#F4F5FA')}
      {vinyl((f) => <circle cx={x} cy={y - 32 * k} r={9.5 * k} fill={f} />, '#F6F7FB')}
    </g>
  );
}

/** A street lamp on the pavement. */
export function Lamp({ s, t, origin = SITE_GROUND }: { s: number; t: number; origin?: Point }) {
  const [x, y0] = iso(origin, s, t);
  const y = y0 - 6;
  return (
    <g>
      <ellipse cx={x + 3} cy={y + 1} rx="5" ry="2" fill="#2E3470" fillOpacity="0.15" filter="url(#bld-blur-s)" />
      <rect x={x - 1} y={y - 44} width="2" height="44" rx="1" fill="#BBC0D6" />
      <path d={`M${x},${y - 43} q -7,-3 -12,2`} fill="none" stroke="#BBC0D6" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx={x - 12} cy={y - 40} rx="4.5" ry="1.8" fill="#E7E9F3" stroke="#C6CADF" strokeWidth="0.6" />
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
export function FloorText({ origin, s, t, alongT = false, size = 20, children }: {
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
    <text transform={matrix} fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif" fontWeight="800" fontStyle="italic" fontSize={size} letterSpacing="1" fill="#C7CBE0">
      {children}
    </text>
  );
}

// Designer-toy figures: big round head with ears, small eyes under thick brows, round hands,
// clothes and sneakers in colour. Drawn facing us, feet at (0, 0), about 45 units tall.
type Headwear = 'cap' | 'bucket' | 'hair' | 'buzz' | 'long';
export type Look = {
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
  /** Short-sleeved tee: bare forearms. */
  tee?: boolean;
  /** High boxing boots in the shoes' colour, laced up the shin. */
  boots?: boolean;
};
/**
 * A figure at floor point (s, t). `walk`: it strolls there and back by (ds, dt).
 * `fight`: one of the two sparring boxers, 'a' on the left, 'b' on the right, or 'bag' for the one on the punching bag.
 * `rope`: skipping rope. `cheer`: hops for joy (the podium).
 */
export type Figure = {
  /** Running in a group (the runners' loop on the home map moves them). */
  run?: boolean;
  s: number;
  t: number;
  look: Look;
  walk?: [number, number];
  fight?: 'a' | 'b' | 'bag';
  rope?: boolean;
  cheer?: boolean;
  /**
   * selfie: phone held up to film; nap: asleep on a stool; chat: talking, with a speech bubble;
   * sit: seated on a stool, awake; camera: a photographer, camera up to the eye;
   * curl: working the arms with dumbbells; shake: a bartender shaking a cocktail; shot: knocking back a shot;
   * tray: a tray of drinks carried up on one hand.
   */
  pose?: 'selfie' | 'nap' | 'chat' | 'sit' | 'camera' | 'curl' | 'shake' | 'shot' | 'tray';
  /** Laughing: eyes closed in two arcs, mouth open. Everyone else smiles. */
  laugh?: boolean;
};

export const SKIN = { light: '#F3C9AE', rose: '#EDB89A', tan: '#C98B62', deep: '#8A5636' };
const INK = '#1E1E1E';

/** Darker shade of a hex colour, for ears, sleeves and soles. */
export function shade(hex: string, amount = 0.14) {
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
export function vinyl(shape: (fill: string) => ReactNode, color: string) {
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
export function Person({ origin, s, t, look, walk, fight, rope, cheer, pose, run, laugh }: Figure & { origin: Point }) {
  const [x, y] = iso(origin, s, t);
  // Small idle motions (Building.css): boxers hop and jab, walkers stroll, the others breathe.
  // Each figure starts at a different point of its loop so they never move in step.
  const motion = {
    '--delay': fight ? '0s' : `${-((s * 7 + t * 13) % 2400) / 1000}s`,
    '--dx': walk ? `${(0.866 * (walk[0] - walk[1])).toFixed(1)}px` : '0px',
    '--dy': walk ? `${(0.5 * (walk[0] + walk[1])).toFixed(1)}px` : '0px',
  } as CSSProperties;
  const kind = fight ? ` fig--boxer fig--fight-${fight}` : look.gloves ? ' fig--boxer' : rope ? ' fig--rope' : cheer ? ' fig--cheer' : run ? ' fig--run' : walk ? ' fig--walk' : '';
  const action = pose === 'curl' || pose === 'shake' || pose === 'shot' ? ` fig--${pose}` : '';
  const sleeve = shade(look.top, 0.08);
  const legBottom = look.shorts ? -6.6 : -2.4;
  const crease = shade(look.top, 0.28);
  const selfie = pose === 'selfie';
  const camera = pose === 'camera';
  const shake = pose === 'shake';
  const shot = pose === 'shot';
  const curl = pose === 'curl';
  const tray = pose === 'tray';
  const arms = look.gloves
    ? [limb(-6, -21, -6.6, -24.6, 4), limb(6, -21, 6.8, -25.2, 4)]
    : camera
      ? [limb(-6.2, -22.4, -5, -27, 4), limb(6.2, -22.4, 5, -27, 4)]
      : shake
        ? [limb(-6.2, -22.4, -1.6, -27.6, 4), limb(6.2, -22.4, 2.8, -29, 4)]
        : [tray ? limb(-6.2, -22.4, -10.4, -30, 4) : limb(-6.2, -22.4, -8, -14, 4), selfie ? limb(6.2, -22.4, 9.6, -30, 4) : shot ? limb(6.2, -22.4, 8.8, -29.6, 4) : limb(6.2, -22.4, 8, -14, 4)];
  const leftHand: Point = camera ? [-5.4, -28] : shake ? [-1.4, -28.6] : tray ? [-10.6, -31] : [-8.2, -12.6];
  const rightHand: Point = selfie ? [9.8, -31.4] : camera ? [5.4, -28] : shake ? [2.8, -30] : shot ? [9, -31] : [8.2, -12.6];
  // A dumbbell held in the fist: a short bar and a weight at each end
  const dumbbell = ([hx, hy]: Point) => (
    <g>
      <rect x={hx - 4.4} y={hy - 0.6} width="8.8" height="1.2" rx="0.6" fill="#8C919A" />
      {vinyl((f) => <rect x={hx - 5.6} y={hy - 2.4} width="2" height="4.8" rx="0.8" fill={f} />, '#2B2B2B')}
      {vinyl((f) => <rect x={hx + 3.6} y={hy - 2.4} width="2" height="4.8" rx="0.8" fill={f} />, '#2B2B2B')}
    </g>
  );
  // Seated on a stool: asleep (nap) or awake (sit)
  const nap = pose === 'nap' || pose === 'sit';
  return (
    <g className={`fig${kind}${action}${nap ? ' fig--nap' : ''}`} style={motion}>
    {nap && (
      <g>
        <ellipse cx={x + 2} cy={y + 1} rx="11" ry="3.4" fill="#2E3470" fillOpacity="0.18" filter="url(#bld-blur-s)" />
        <rect x={x - 9} y={y - 9} width="18" height="9" rx="2" fill="#D8DBEC" />
        <rect x={x - 9} y={y - 11} width="18" height="3" rx="1.5" fill="#F4F4F4" />
      </g>
    )}
    <g className="fig-body">
    <g transform={`translate(${x.toFixed(1)} ${(y - (nap ? 6 : 0)).toFixed(1)}) scale(0.92${nap ? ' 0.86' : ''}) rotate(${nap ? -6 : 0})`}>
      <ellipse cx="2.5" cy="0" rx="10" ry="3.2" fill="#2E3470" fillOpacity="0.2" filter="url(#bld-blur-s)" />
      <g>

      {look.head === 'long' && vinyl((f) => <rect x="-9.6" y="-40" width="19.2" height="25" rx="8" fill={f} />, look.headColor)}

      {/* Legs and sneakers, one group per leg so a walker can lift them in turn */}
      {[
        { side: 'l', x: -5.7, skinX: -4.4, shoe: -3.2, drop: 0 },
        { side: 'r', x: 0.6, skinX: 1.4, shoe: 3.4, drop: 0.2 },
      ].map((leg) => (
        <g key={leg.side} className={`fig-leg fig-leg--${leg.side}`}>
          {look.shorts && vinyl((f) => <rect x={leg.skinX} y="-7.4" width="3" height="6" rx="1.5" fill={f} />, look.skin)}
          {vinyl((f) => <rect x={leg.x} y="-12.4" width="5.1" height={12.4 + legBottom} rx="2.3" fill={f} />, look.bottom)}
          <line x1={leg.x + 2.6} y1="-10" x2={leg.x + 2.6} y2={legBottom - 0.6} stroke={shade(look.bottom, 0.22)} strokeWidth="0.5" strokeLinecap="round" />
          <ellipse cx={leg.shoe} cy={-0.7 + leg.drop} rx="3.8" ry="1.2" fill="#F9FAFD" />
          {vinyl((f) => <ellipse cx={leg.shoe} cy={-1.8 + leg.drop} rx="3.6" ry="2.1" fill={f} />, look.shoes)}
          {look.boots && (
            <>
              {vinyl((f) => <rect x={leg.x + 0.2} y={-6.6 + leg.drop} width="4.7" height="5.4" rx="1.6" fill={f} />, look.shoes)}
              <line x1={leg.x + 1.2} y1={-5.4 + leg.drop} x2={leg.x + 3.9} y2={-5.4 + leg.drop} stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="0.5" />
              <line x1={leg.x + 1.2} y1={-3.8 + leg.drop} x2={leg.x + 3.9} y2={-3.8 + leg.drop} stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="0.5" />
            </>
          )}
        </g>
      ))}

      {/* Body, with a zip or placket and a hem */}
      {vinyl((f) => <rect x="-7" y="-25.4" width="14" height="15.4" rx="5.6" fill={f} />, look.top)}
      <path d="M0,-23.6 L0,-11.2" stroke={crease} strokeWidth="0.55" strokeLinecap="round" />
      <path d="M-6.4,-12.4 Q0,-11 6.4,-12.4" fill="none" stroke={crease} strokeWidth="0.6" strokeLinecap="round" />
      <path d="M-4.6,-20 Q-3.2,-17.6 -4.2,-15" fill="none" stroke={crease} strokeWidth="0.45" strokeLinecap="round" />

      {/* Arms, hands, what they hold */}
      {look.gloves ? (
        arms.map((arm, index) => <g key={index}>{vinyl(arm, sleeve)}</g>)
      ) : (
        <g className={shake ? 'fig-shake' : undefined}>
          <g className="fig-arm fig-arm--l">
            {/* Curls: the forearm folds up (Building.css), the fist and its dumbbell rise with it */}
            <g className={curl ? 'fig-curl-arm' : undefined}>{vinyl(arms[0], look.tee ? look.skin : sleeve)}</g>
            {look.tee && vinyl((f) => <rect x="-8.2" y="-24" width="4.4" height="5" rx="2" fill={f} />, look.top)}
            {look.holds === 'cup' && vinyl((f) => <path d="M-11.2,-17.8 L-5.4,-17.8 L-6.3,-10.8 L-10.3,-10.8 Z" fill={f} />, '#5B8DEF')}
            <g className={curl ? 'fig-curl-hand' : undefined}>
              {vinyl((f) => <circle cx={leftHand[0]} cy={leftHand[1]} r="2.8" fill={f} />, look.skin)}
              {curl && dumbbell(leftHand)}
            </g>
            {/* A round tray with two cocktails on it */}
            {tray && (
              <g>
                {vinyl((f) => <ellipse cx="-11" cy="-33.6" rx="7.4" ry="2.2" fill={f} />, '#C9CDD2')}
                {([[-14, '#F27BA0'], [-8.4, '#F2B33D']] as [number, string][]).map(([gx, drink]) => (
                  <g key={gx}>
                    <line x1={gx} y1="-34" x2={gx} y2="-37.4" stroke="#CDD1E5" strokeWidth="0.6" />
                    <path d={`M${gx - 2.6},${-40.8} L${gx + 2.6},${-40.8} L${gx},${-37.2} Z`} fill="#FFFFFF" fillOpacity="0.9" stroke="#CDD1E5" strokeWidth="0.35" />
                    <path d={`M${gx - 2},${-40} L${gx + 2},${-40} L${gx},${-37.7} Z`} fill={drink} />
                  </g>
                ))}
              </g>
            )}
          </g>
          <g className="fig-arm fig-arm--r">
            <g className={curl ? 'fig-curl-arm' : undefined}>{vinyl(arms[1], look.tee ? look.skin : sleeve)}</g>
            {look.tee && vinyl((f) => <rect x="3.8" y="-24" width="4.4" height="5" rx="2" fill={f} />, look.top)}
            {/* A shot glass, golden, held up */}
            {shot && (
              <g>
                <path d="M6.9,-37.4 L11.1,-37.4 L10.6,-32 L7.4,-32 Z" fill="#FFFFFF" fillOpacity="0.9" stroke="#CDD1E5" strokeWidth="0.4" />
                <path d="M7.2,-35.6 L10.8,-35.6 L10.6,-32 L7.4,-32 Z" fill="#E8A93A" />
              </g>
            )}
            <g className={curl ? 'fig-curl-hand' : undefined}>
              {vinyl((f) => <circle cx={rightHand[0]} cy={rightHand[1]} r="2.8" fill={f} />, look.skin)}
              {curl && dumbbell(rightHand)}
            </g>
            {look.holds === 'phone' && !selfie && <rect x="7.4" y="-19.6" width="3.4" height="6.2" rx="0.9" fill="#2F6B4C" />}
            {selfie && (
              <g>
                <rect x="7.6" y="-42" width="4.4" height="8" rx="1" fill="#1E1E1E" />
                <rect x="8.3" y="-41.2" width="3" height="6.4" rx="0.6" fill="#6F8FB8" />
              </g>
            )}
          </g>
          {/* The bartender's shaker, held in both hands, shaken (Building.css) */}
          {shake && (
            <g>
              {vinyl((f) => <rect x="-1.6" y="-38.6" width="4.6" height="9.6" rx="1.6" fill={f} />, '#C9CDD2')}
              {vinyl((f) => <rect x="-0.8" y="-40.4" width="3" height="2.4" rx="1" fill={f} />, '#AEB3BB')}
              {vinyl((f) => <circle cx={leftHand[0]} cy={leftHand[1]} r="2.8" fill={f} />, look.skin)}
              {vinyl((f) => <circle cx={rightHand[0]} cy={rightHand[1]} r="2.8" fill={f} />, look.skin)}
            </g>
          )}
        </g>
      )}

      {/* Shadow of the head on the shoulders */}
      <ellipse cx="0.8" cy="-24.6" rx="7" ry="2.2" fill="#2E3470" fillOpacity="0.22" filter="url(#bld-blur-s)" />

      {/* Head: ears, face, hair or hat */}
      {vinyl((f) => <circle cx="-9" cy="-32.5" r="3.5" fill={f} />, shade(look.skin, 0.04))}
      {vinyl((f) => <circle cx="9" cy="-32.5" r="3.5" fill={f} />, shade(look.skin, 0.04))}
      {vinyl((f) => <circle cx="0" cy="-33" r="9.2" fill={f} />, look.skin)}
      <ellipse cx="-2.6" cy="-37.6" rx="3.2" ry="1.6" fill="#FFFFFF" fillOpacity="0.35" />
      <Headgear look={look} />

      {pose === 'nap' ? (
        <g fill="none" stroke={INK} strokeWidth="0.9" strokeLinecap="round">
          <path d="M-4.4,-32 q1.6,1.2 3.2,0" />
          <path d="M1.2,-32 q1.6,1.2 3.2,0" />
        </g>
      ) : laugh && look.eyes !== 'sunglasses' ? (
        <g fill="none" stroke={INK} strokeWidth="1" strokeLinecap="round">
          <path d="M-4.4,-31.6 q1.6,-2 3.2,0" />
          <path d="M1.2,-31.6 q1.6,-2 3.2,0" />
          {look.eyes === 'glasses' && (
            <g strokeWidth="0.75">
              <circle cx="-2.8" cy="-32.2" r="2.5" />
              <circle cx="2.8" cy="-32.2" r="2.5" />
            </g>
          )}
        </g>
      ) : look.eyes === 'sunglasses' ? (
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
          <path d="M-4.6,-35.4 Q-3,-36.6 -1.4,-35.8" fill="none" />
          <path d="M1.4,-35.8 Q3,-36.6 4.6,-35.4" fill="none" />
        </g>
      )}
      <ellipse cx="-5.4" cy="-29.4" rx="1.5" ry="0.8" fill="#E8907A" fillOpacity="0.35" />
      <ellipse cx="5.4" cy="-29.4" rx="1.5" ry="0.8" fill="#E8907A" fillOpacity="0.35" />
      {/* Everyone is having a good time: a smile, or laughing mouth open */}
      {laugh || shot ? (
        <g>
          <path d="M-2.6,-28.9 Q0,-28.4 2.6,-28.9 Q2,-25 0,-25 Q-2,-25 -2.6,-28.9 Z" fill="#7A2B2B" />
          <path d="M-2.1,-28.7 Q0,-28.3 2.1,-28.7 L1.8,-27.9 Q0,-27.6 -1.8,-27.9 Z" fill="#FFFFFF" />
          <ellipse cx="0" cy="-25.9" rx="1.2" ry="0.6" fill="#E46A6A" />
        </g>
      ) : (
        <path d="M-2.4,-28.7 Q0,-26.2 2.4,-28.7" fill="none" stroke={shade(look.skin, 0.5)} strokeWidth="0.9" strokeLinecap="round" />
      )}

      {look.headphones && (
        <>
          <path d="M-9.6,-33 A9.8 9.8 0 0 1 9.6,-33" fill="none" stroke={INK} strokeWidth="1.8" />
          {vinyl((f) => <ellipse cx="-9.4" cy="-32" rx="2.6" ry="3.4" fill={f} />, INK)}
          {vinyl((f) => <ellipse cx="9.4" cy="-32" rx="2.6" ry="3.4" fill={f} />, INK)}
        </>
      )}

      {/* The photographer's camera, held up in front of the face */}
      {camera && (
        <g>
          {vinyl((f) => <rect x="-6" y="-33" width="12" height="7.4" rx="1.6" fill={f} />, '#2B2B2B')}
          <rect x="-4" y="-34.6" width="3.6" height="2" rx="0.6" fill="#3A3A3A" />
          <circle cx="0.6" cy="-29.3" r="2.7" fill="#4A5160" stroke="#1A1A1A" strokeWidth="0.8" />
          <circle cx="-0.2" cy="-30.1" r="0.8" fill="#FFFFFF" fillOpacity="0.7" />
        </g>
      )}

      {pose === 'nap' && (
        <text className="fig-zzz" x="8" y="-44" fontSize="7" fontWeight="700" fill="#8A93A6">
          z<tspan dx="1" dy="-4" fontSize="9">Z</tspan>
        </text>
      )}
      {pose === 'chat' && (
        <g className="fig-bubble">
          <rect x="4" y="-58" width="17" height="11" rx="5.5" fill="#FFFFFF" stroke="#D3D6E8" strokeWidth="0.6" />
          <path d="M8,-47.2 l-1.5,4 l4.5,-4 z" fill="#FFFFFF" />
          <circle cx="8.6" cy="-52.5" r="1.1" fill="#9A9A9A" />
          <circle cx="12.5" cy="-52.5" r="1.1" fill="#9A9A9A" />
          <circle cx="16.4" cy="-52.5" r="1.1" fill="#9A9A9A" />
        </g>
      )}

      {/* Skipping rope: from hand to hand, it swings over the head and under the feet (Building.css) */}
      {rope && <path className="fig-rope" d="M-8.2,-12.6 Q0,-72 8.2,-12.6" fill="none" stroke="#1F1F1F" strokeWidth="0.9" strokeLinecap="round" />}

      {look.gloves && (
        <g className="fig-gloves">
          {vinyl((f) => <circle cx="-6.4" cy="-25.6" r="3.9" fill={f} />, look.gloves)}
          {vinyl((f) => <circle cx="6.8" cy="-26.2" r="3.9" fill={f} />, look.gloves)}
        </g>
      )}
      </g>
    </g>
    </g>
    </g>
  );
}

// The ring, in RNDS floor units: canvas from (80, 50) to (220, 190), 16 high, posts 30 above it.
const RING = { s0: 80, s1: 220, t0: 50, t1: 190, h: 16, post: 30 };
const ROPES: { h: number; color: string }[] = [
  { h: 9, color: RNDS },
  { h: 17, color: '#F4F4F4' },
  { h: 25, color: RNDS },
];

/** A round post with a corner pad. */
function RingPost({ origin, s, t, pad }: { origin: Point; s: number; t: number; pad: string }) {
  const [x, y0] = iso(origin, s, t);
  const y = y0 - RING.h;
  return (
    <g>
      {vinyl((f) => <rect x={x - 2.6} y={y - RING.post - 2} width="5.2" height={RING.post + 2} rx="2.6" fill={f} />, '#D8DBEC')}
      {vinyl((f) => <rect x={x - 3.6} y={y - RING.post + 2} width="7.2" height={RING.post - 8} rx="3" fill={f} />, pad)}
      <ellipse cx={x} cy={y - RING.post - 2} rx="2.6" ry="1.2" fill="#F1F2F8" />
    </g>
  );
}

/** One side of ropes between two corners, with a soft shadow under each rope. */
function Ropes({ origin, from, to }: { origin: Point; from: Point; to: Point }) {
  return (
    <g strokeLinecap="round">
      {ROPES.map((rope) => {
        const [x1, y1] = iso(origin, from[0], from[1]);
        const [x2, y2] = iso(origin, to[0], to[1]);
        const lift = RING.h + rope.h;
        return (
          <g key={rope.h}>
            <line x1={x1} y1={y1 - lift + 1.4} x2={x2} y2={y2 - lift + 1.4} stroke="#000" strokeOpacity="0.18" strokeWidth="2.2" />
            <line x1={x1} y1={y1 - lift} x2={x2} y2={y2 - lift} stroke={rope.color} strokeWidth="2.2" />
          </g>
        );
      })}
    </g>
  );
}

/**
 * The boxing ring. Drawn in two passes around the boxers: `back` draws the platform, the canvas
 * and the far posts and ropes; without it, the near ropes and the front post, which pass in front.
 */
function Ring({ origin, back = false }: { origin: Point; back?: boolean }) {
  const { s0, s1, t0, t1, h } = RING;
  const o = origin;
  if (!back) {
    return (
      <g>
        <Ropes origin={o} from={[s1, t0]} to={[s1, t1]} />
        <Ropes origin={o} from={[s0, t1]} to={[s1, t1]} />
        <RingPost origin={o} s={s1} t={t1} pad="#1F1F1F" />
      </g>
    );
  }
  const [lx, ly] = iso(o, s0 + 16, t1);
  const [rx, ry] = iso(o, s1, t1 - 40);
  const [cx, cy] = iso(o, (s0 + s1) / 2, (t0 + t1) / 2);
  return (
    <g>
      <polygon points={solid(o, [[s0, t0, 0], [s1, t0, 0], [s1 + 8, t1 + 8, 0], [s0, t1, 0]])} fill="#2E3470" fillOpacity="0.22" filter="url(#bld-blur-m)" />
      {/* Apron, black, with the RNDS logo in white and its red dot, as on black in the brand kit */}
      <polygon points={solid(o, [[s0, t1, 0], [s1, t1, 0], [s1, t1, h], [s0, t1, h]])} fill="#1A1A1B" />
      <polygon points={solid(o, [[s1, t0, 0], [s1, t1, 0], [s1, t1, h], [s1, t0, h]])} fill="#0F0F10" />
      <g transform={`matrix(0.866 0.5 0 1 ${lx} ${ly - 4})`}>
        <text fontFamily="'Kode Mono', ui-monospace, monospace" fontWeight="700" fontSize="9" fill="#ECECEA" textLength="26" lengthAdjust="spacing">RNDS</text>
        <circle cx="28.4" cy="-6.6" r="1.1" fill={RNDS} />
      </g>
      <g transform={`matrix(0.866 -0.5 0 1 ${rx} ${ry - 4})`}>
        <text fontFamily="'Kode Mono', ui-monospace, monospace" fontWeight="700" fontSize="9" fill="#ECECEA" textLength="26" lengthAdjust="spacing" opacity="0.85">RNDS</text>
        <circle cx="28.4" cy="-6.6" r="1.1" fill={RNDS} />
      </g>
      {/* Canvas */}
      <polygon points={solid(o, [[s0, t0, h], [s1, t0, h], [s1, t1, h], [s0, t1, h]])} fill="url(#bld-canvas)" />
      <polygon points={solid(o, [[s0 + 7, t0 + 7, h], [s1 - 7, t0 + 7, h], [s1 - 7, t1 - 7, h], [s0 + 7, t1 - 7, h]])} fill="none" stroke="#3C3C3E" strokeWidth="0.8" />
      <ellipse cx={cx} cy={cy - h} rx="74" ry="40" fill="#FFE477" fillOpacity="0.16" filter="url(#bld-blur-m)" />
      {/* The RNDS "R" painted in the middle of the canvas */}
      <g transform={`matrix(0.866 0.5 -0.866 0.5 ${cx} ${cy - h})`}>
        <g transform="scale(0.042) translate(-471 -471)" opacity="0.92">
          <circle cx="471" cy="471" r="471" fill={RNDS} />
          <path fillRule="evenodd" fill="#000000" d="M312,236 L547,236 L622,346 L622,421 L563,482 L622,569 L622,686 L544,686 L544,581 L485,496 L423,496 L389,475 L389,686 L312,686 Z M389,309 L508,309 L544,360 L544,399 L519,424 L389,424 Z" />
        </g>
      </g>
      <RingPost origin={o} s={s0} t={t0} pad={RNDS} />
      <Ropes origin={o} from={[s0, t0]} to={[s1, t0]} />
      <Ropes origin={o} from={[s0, t0]} to={[s0, t1]} />
      <RingPost origin={o} s={s1} t={t0} pad="#F4F4F4" />
      <RingPost origin={o} s={s0} t={t1} pad="#F4F4F4" />
    </g>
  );
}

/** Impact star on the face of the boxer who takes the punch, in time with the fight (Building.css). */
function Pow({ at: [x, y], side }: { at: Point; side: 'a' | 'b' }) {
  const cx = x + (side === 'b' ? -5 : 5);
  const cy = y - 27;
  const star = Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 === 0 ? 7 : 3;
    const a = (i * Math.PI) / 8;
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
  return <polygon points={star} className={`pow pow--${side}`} fill="#FFD84D" stroke={RNDS} strokeWidth="1" strokeLinejoin="round" />;
}

// Pips of each die face, on a 3 × 3 grid (0 = top left, 8 = bottom right).
const PIPS: Record<number, number[]> = { 1: [4], 2: [0, 8], 4: [0, 2, 6, 8] };

/** A white die showing `face`; when `roll` is set it is thrown, tumbles and lands, in turn (Building.css). */
function Die({ x, y, face, roll }: { x: number; y: number; face: 1 | 2 | 4; roll?: number }) {
  const size = 8;
  return (
    <g className={roll === undefined ? undefined : `die die--${roll}`}>
      <rect x={x - size / 2} y={y - size / 2} width={size} height={size} rx="2" fill="#FFFFFF" stroke="#D0D3E6" strokeWidth="0.5" />
      {PIPS[face].map((pip) => (
        <circle key={pip} cx={x - 2.4 + (pip % 3) * 2.4} cy={y - 2.4 + Math.floor(pip / 3) * 2.4} r="0.85" fill={face === 1 ? RNDS : INK} />
      ))}
    </g>
  );
}

/**
 * A 421 dice track: round table on its foot, a white rim around violet felt, a dice cup,
 * and the three dice of a 421 (4, 2, 1). On the `rolling` table they are thrown again and again.
 */
function DiceTable({ cx, cy, rx, ry, rolling = false }: { cx: number; cy: number; rx: number; ry: number; rolling?: boolean }) {
  const felt = 0.74;
  return (
    <g>
      <ellipse cx={cx + 4} cy={cy + 28} rx={rx * 0.7} ry={ry * 0.45} fill="#2E3470" fillOpacity="0.16" filter="url(#bld-blur-m)" />
      <ellipse cx={cx} cy={cy + 26} rx={rx * 0.32} ry={ry * 0.22} fill="#C7CBE0" />
      <rect x={cx - 2.6} y={cy + 4} width="5.2" height="22" rx="2.6" fill="url(#bld-post)" />
      {/* Thickness of the top, then the white rim and the felt */}
      <ellipse cx={cx} cy={cy + 5} rx={rx} ry={ry} fill="#C6CADF" />
      <rect x={cx - rx} y={cy} width={rx * 2} height="5" fill="#C6CADF" />
      {vinyl((f) => <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={f} />, '#F5F6FA')}
      <ellipse cx={cx} cy={cy + 0.8} rx={rx * felt} ry={ry * felt} fill="#2E3470" fillOpacity="0.18" />
      <ellipse cx={cx} cy={cy + 1.2} rx={rx * felt} ry={ry * felt} fill={CLUB} />
      <ellipse cx={cx} cy={cy + 1.2} rx={rx * felt} ry={ry * felt} fill="url(#bld-felt)" />
      {/* Dice cup on the rim */}
      {vinyl((f) => <path d={`M${cx + rx * 0.62},${cy - ry * 0.55} l7,0 l-1,-8 l-5,0 Z`} fill={f} />, '#2B2B2B')}
      <ellipse cx={cx + rx * 0.62 + 3.5} cy={cy - ry * 0.55 - 8} rx="2.6" ry="0.9" fill="#3A3A3A" />
      <Die x={cx - 9} y={cy - 1} face={4} roll={rolling ? 0 : undefined} />
      <Die x={cx + 1} y={cy + 4} face={2} roll={rolling ? 1 : undefined} />
      <Die x={cx + 10} y={cy - 2} face={1} roll={rolling ? 2 : undefined} />
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
  { s: 122, t: 126, fight: 'a', look: { skin: SKIN.tan, top: '#1F1F1F', bottom: RNDS, shoes: '#F4F4F4', head: 'buzz', headColor: '#2A2A2A', shorts: true, gloves: RNDS } },
  { s: 172, t: 110, fight: 'b', look: { skin: SKIN.light, top: '#F4F4F4', bottom: '#2B2B2B', shoes: '#1F1F1F', head: 'hair', headColor: '#6B4A32', shorts: true, gloves: '#1F1F1F' } },
  // Coach by the bags
  { s: 240, t: 96, look: { skin: SKIN.rose, top: '#1F1F1F', bottom: '#1F1F1F', shoes: '#F4F4F4', head: 'bucket', headColor: '#1F1F1F', holds: 'phone' } },
  // Working the punching bag
  { s: 262, t: 46, fight: 'bag', look: { skin: SKIN.deep, top: RNDS, bottom: '#1F1F1F', shoes: '#F4F4F4', head: 'cap', headColor: '#1F1F1F', shorts: true, gloves: '#1F1F1F' } },
  // Skipping rope beside the ring
  { s: 60, t: 212, rope: true, look: { skin: SKIN.light, top: '#9CC8F2', bottom: '#EFEBE3', shoes: '#F4F4F4', head: 'hair', headColor: '#4A3A30', eyes: 'glasses' } },
  // Working the arms with dumbbells by the ring
  { s: 300, t: 200, pose: 'curl', laugh: true, look: { skin: SKIN.deep, top: '#B8AE7E', bottom: '#B8AE7E', shoes: '#1F1F1F', head: 'cap', headColor: '#F4F4F4', brim: '#D8DBEB', shorts: true } },
];

const CLUB_PEOPLE: Figure[] = [
  // At the bar, knocking back shots
  { s: 58, t: 96, pose: 'shot', look: { skin: SKIN.light, top: '#EFE7D2', bottom: '#2B2B2B', shoes: '#E9DFC8', head: 'hair', headColor: '#1F1F1F', eyes: 'glasses' } },
  { s: 58, t: 168, pose: 'shot', look: { skin: SKIN.rose, top: '#F0E9DE', bottom: '#2B2B2B', shoes: '#1F1F1F', head: 'long', headColor: '#8A5A3C', eyes: 'sunglasses' } },
  // Four players round the big dice table
  { s: 108, t: 150, laugh: true, look: { skin: SKIN.tan, top: CLUB, bottom: '#2B2B2B', shoes: '#F4F4F4', head: 'cap', headColor: '#1F1F1F' } },
  { s: 158, t: 172, laugh: true, look: { skin: SKIN.deep, top: '#F4F4F4', bottom: '#6FA8DC', shoes: '#F2C14E', head: 'cap', headColor: '#3E8E5E', shorts: true } },
  { s: 214, t: 140, look: { skin: SKIN.light, top: '#1F1F1F', bottom: '#1F1F1F', shoes: '#F4F4F4', head: 'hair', headColor: '#3A2A20', headphones: true, holds: 'cup' } },
  { s: 208, t: 68, laugh: true, look: { skin: SKIN.rose, top: '#E9D3B8', bottom: '#2B2B2B', shoes: '#1F1F1F', head: 'long', headColor: '#1F1F1F' } },
  // Second table
  { s: 262, t: 150, look: { skin: SKIN.rose, top: '#B8AE7E', bottom: '#EFEBE3', shoes: '#1F1F1F', head: 'buzz', headColor: '#8C8C8C' } },
  { s: 312, t: 96, laugh: true, look: { skin: SKIN.light, top: '#9CC8F2', bottom: '#2B2B2B', shoes: '#F4F4F4', head: 'bucket', headColor: '#EFEBE3' } },
  // Just in
  { s: 296, t: 214, look: { skin: SKIN.tan, top: '#2B2B2B', bottom: '#B8AE7E', shoes: '#F4F4F4', head: 'hair', headColor: '#1F1F1F', eyes: 'sunglasses' } },
];

// The bartender's round: from his station at the end of the bar he shakes a cocktail, then takes
// a tray to a player picked at random, by a path that goes round the tables, and comes back.
const BAR_STATION: Point = [30, 224];
const ROUNDS: Point[][] = [
  [[104, 180]],
  [[150, 200]],
  [[120, 228], [250, 162], [228, 166]],
  [[120, 228], [250, 162], [240, 88]],
  [[120, 228], [250, 162], [270, 178]],
  [[120, 228], [250, 162], [322, 122]],
];
const WALK_SPEED = 34; // floor units per second

function Bartender({ origin }: { origin: Point }) {
  const [at, setAt] = useState<Point>(BAR_STATION);
  const [leg, setLeg] = useState(0);
  const [mode, setMode] = useState<'shake' | 'walk' | 'serve'>('shake');
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let cancelled = false;
    let last = -1;
    const wait = (ms: number) => new Promise((done) => setTimeout(done, ms));
    const walk = async (path: Point[]) => {
      let from = path[0];
      for (const to of path.slice(1)) {
        const seconds = Math.hypot(to[0] - from[0], to[1] - from[1]) / WALK_SPEED;
        setLeg(seconds);
        setAt(to);
        await wait(seconds * 1000);
        if (cancelled) return;
        from = to;
      }
    };
    (async () => {
      while (!cancelled) {
        setMode('shake');
        await wait(3500 + Math.random() * 2500);
        if (cancelled) return;
        let pick = Math.floor(Math.random() * ROUNDS.length);
        if (pick === last) pick = (pick + 1) % ROUNDS.length;
        last = pick;
        const there = [BAR_STATION, ...ROUNDS[pick]];
        setMode('walk');
        await walk(there);
        if (cancelled) return;
        setMode('serve');
        await wait(1400);
        if (cancelled) return;
        setMode('walk');
        await walk([...there].reverse());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const [x, y] = iso([0, 0], at[0], at[1]);
  const look: Look = { skin: SKIN.tan, top: '#F4F4F4', bottom: '#1F1F1F', shoes: '#1F1F1F', head: 'hair', headColor: '#1F1F1F' };
  return (
    <g
      className={`bartender${mode === 'walk' ? ' is-walking' : ''}`}
      style={{ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`, transition: `transform ${leg.toFixed(2)}s linear` }}
    >
      <Person origin={origin} s={0} t={0} pose={mode === 'shake' ? 'shake' : 'tray'} laugh={mode === 'serve'} look={look} />
    </g>
  );
}

// Traffic on the two back roads only, driving from the top of the map down past the building:
// each car is drawn at the middle of its trip (s, t), where it stays when motion is reduced, and
// drives from `run` / 2 units before it to `run` / 2 after (Building.css, .car-drive).
const CARS: { s: number; t: number; alongT: boolean; color: string; stripes?: string; run: number; time: number; delay: number }[] = [
  { s: -27, t: 250, alongT: true, color: RNDS, run: 1140, time: 15, delay: 0 },
  { s: -48, t: 150, alongT: true, color: '#F4F4F4', stripes: CLUB, run: 1140, time: 19, delay: -9 },
  { s: 140, t: -27, alongT: false, color: '#1E1E1E', stripes: '#F4F4F4', run: 920, time: 13, delay: -4 },
  { s: 60, t: -48, alongT: false, color: '#F2C14E', run: 920, time: 17, delay: -12 },
];

/** The drive of a car along its road, shared by the car and its lights at night. */
function driveStyle({ alongT, run, time, delay }: (typeof CARS)[number]) {
  return {
    '--car-dx': `${((alongT ? -0.866 : 0.866) * run) / 2}px`,
    '--car-dy': `${(0.5 * run) / 2}px`,
    animationDuration: `${time}s`,
    animationDelay: `${delay}s`,
  } as CSSProperties;
}

function DrivingCar(car: (typeof CARS)[number]) {
  const { run: _run, time: _time, delay: _delay, ...drawn } = car;
  return (
    <g className="car-drive" style={driveStyle(car)}>
      <Car {...drawn} />
    </g>
  );
}

const LAMP_POSTS: Point[] = [
  [448, 110],
  [448, 300],
  [70, 664],
];

/**
 * Colour of the sky over the model: nothing by day, warm at dawn and dusk, deep blue at night
 * (Building.css, from the scene's data-phase). Laid over everything with a multiply blend.
 */
export function SkyTint({ box: [x, y, w, h], lit = [] }: { box: [number, number, number, number]; lit?: string[] }) {
  const id = useId().replace(/:/g, '');
  return (
    <>
      {lit.length > 0 && (
        <defs>
          {/* The lit spaces are cut out of the night, with a clean edge */}
          <mask id={`${id}-lit`} maskUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}>
            <rect x={x} y={y} width={w} height={h} fill="#FFFFFF" />
            {lit.map((area) => (
              <polygon key={area} points={area} fill="#000000" />
            ))}
          </mask>
        </defs>
      )}
      <rect className="sky-tint" x={x} y={y} width={w} height={h} mask={lit.length > 0 ? `url(#${id}-lit)` : undefined} />
    </>
  );
}

/** Outline (convex hull) of points given as floor coordinates and height: (s, t, h). */
function litArea(origin: Point, list: [number, number, number][]) {
  return toPath(hull(list.map(([s, t, h]) => { const [x, y] = iso(origin, s, t); return [x, y - h] as Point; })));
}

const WALL_TOPS: Record<string, [number, number, number][]> = {
  rnds: [[0, 250, 95], [0, 0, 95], [320, 0, 95]],
  club421: [[0, 250, 95], [0, 0, 95], [0, 0, 24], [320, 0, 24]],
};
const FLOOR_EDGES = (h: number): [number, number, number][] => [[0, 250, h], [320, 250, h], [320, 0, h], [0, 0, h]];

/**
 * What stays lit (white) at night: each space with its walls and the edges of its floor, so the
 * volume still reads. In the workspace scene, the plate under the floor too.
 */
const LIT_SPACES: Record<string, string> = {
  rnds: litArea(RNDS_FLOOR, [...WALL_TOPS.rnds, ...FLOOR_EDGES(-18)]),
  club421: litArea(CLUB_FLOOR, [...WALL_TOPS.club421, ...FLOOR_EDGES(-18)]),
};
const LIT_SCENES: Record<string, string> = Object.fromEntries(
  Object.entries(WALL_TOPS).map(([id, tops]) => {
    const origin = id === 'rnds' ? RNDS_FLOOR : CLUB_FLOOR;
    const plate: [number, number, number][] = [[-22, -22, -30], [342, -22, -30], [342, 272, -30], [-22, 272, -30]];
    return [id, litArea(origin, [...tops, ...FLOOR_EDGES(-18), ...plate])];
  }),
);

/** Neon line along the two front edges of a floor: one crisp line, no blur. */
function Neon({ origin, color }: { origin: Point; color: string }) {
  const edge = points(origin, [[320, 0], [320, 250], [0, 250]]);
  return (
    <g fill="none" strokeLinejoin="round">
      <polyline points={edge} stroke={color} strokeWidth="2" />
    </g>
  );
}

/**
 * What lights up when it gets dark, laid over the sky tint with a screen blend: the lamps over the
 * ring and the dice table, the street lamps and the cars' headlights. `only` keeps one floor.
 */
function NightLights({ only }: { only?: ProjectId }) {
  const R = RNDS_FLOOR;
  const C = CLUB_FLOOR;
  const [ringX, ringY] = iso(R, 150, 120);
  return (
    <g className="night-lights">
      {only !== 'club421' && (
        <>
          <Neon origin={R} color={RNDS} />
          <polygon points="612,98 640,98 742,255 626,322 510,255" fill="url(#bld-lamp-night)" />
          <ellipse cx={ringX} cy={ringY - 16} rx="74" ry="40" fill="#FFCF5C" fillOpacity="0.28" filter="url(#bld-blur-m)" />
          <ellipse cx="626" cy="98" rx="12" ry="4" fill="#FFF3B0" filter="url(#bld-blur-s)" />
        </>
      )}
      {only !== 'rnds' && (
        <>
          <Neon origin={C} color={CLUB} />
          <polygon points="378,362 406,362 456,400 392,438 328,400" fill="url(#bld-lamp-night)" />
          <ellipse cx="392" cy="400" rx="70" ry="38" fill="#FFCF5C" fillOpacity="0.25" filter="url(#bld-blur-m)" />
          <ellipse cx="392" cy="362" rx="10" ry="3.5" fill="#FFF3B0" filter="url(#bld-blur-s)" />
          {/* The bottles on the bar shelf catch the light */}
          <polygon points={solid(C, [[10, 48, 50], [14, 48, 50], [14, 160, 50], [10, 160, 50]])} fill="#FFE7A0" fillOpacity="0.5" filter="url(#bld-blur-s)" />
        </>
      )}
      {!only && (
        <>
          {HOME_BLOCKS.map((b, i) => (
            <BlockWindows key={`${b.s0}-${b.t0}`} g={SITE_GROUND} b={b} seed={i} />
          ))}
          {LAMP_POSTS.map(([ls, lt]) => {
            const [x, y] = iso(SITE_GROUND, ls, lt);
            // A soft round pool on the ground right under the lamp's head, and the bulb
            return (
              <g key={`${ls}-${lt}`}>
                <ellipse cx={x - 12} cy={y - 4} rx="26" ry="13" fill="url(#bld-pool)" />
                <circle cx={x - 12} cy={y - 46} r="2.6" fill="#FFF6CC" />
                <circle cx={x - 12} cy={y - 46} r="6" fill="#FFF6CC" fillOpacity="0.35" filter="url(#bld-blur-s)" />
              </g>
            );
          })}
          {CARS.map((car, i) => {
            // A beam on the road ahead of the nose, fading out, and the rear lights
            const at = (u: number, v: number): Point => (car.alongT ? [car.s + v, car.t + u] : [car.s + u, car.t + v]);
            const [nx, ny] = iso(SITE_GROUND, ...at(46, 9.5));
            const [rx, ry] = iso(SITE_GROUND, ...at(1, 19));
            const beam = [at(46, 3), at(46, 16), at(100, 30), at(100, -11)];
            return (
              <g key={`${car.s}-${car.t}`} className="car-drive" style={driveStyle(car)}>
                <defs>
                  <radialGradient id={`bld-beam-${i}`} gradientUnits="userSpaceOnUse" cx={nx} cy={ny} r="64">
                    <stop offset="0" stopColor="#FFF4CC" stopOpacity="0.75" />
                    <stop offset="1" stopColor="#FFF4CC" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <polygon points={points(SITE_GROUND, beam)} fill={`url(#bld-beam-${i})`} />
                <circle cx={rx} cy={ry - 7} r="4" fill="#FF3B3B" fillOpacity="0.55" filter="url(#bld-blur-s)" />
              </g>
            );
          })}
        </>
      )}
    </g>
  );
}

// The runners: the one with the blue cap left the gym to run with three friends. They run as a
// pack, side by side, all round the map on the outer ring of roads (Building.css, .runner-pack).
// Black tees, shorts and high boxing boots.
const RUNNERS: Look[] = [
  { skin: SKIN.rose, top: '#1F1F1F', bottom: '#2C4FB8', shoes: '#F4F4F4', head: 'cap', headColor: '#2C4FB8', shorts: true, tee: true, boots: true },
  { skin: SKIN.deep, top: '#1F1F1F', bottom: RNDS, shoes: '#1F1F1F', head: 'buzz', headColor: '#1F1F1F', shorts: true, tee: true, boots: true },
  { skin: SKIN.light, top: '#1F1F1F', bottom: '#F4F4F4', shoes: RNDS, head: 'long', headColor: '#8A5A3C', shorts: true, tee: true, boots: true },
  { skin: SKIN.tan, top: '#1F1F1F', bottom: '#3A3A3A', shoes: '#F4F4F4', head: 'hair', headColor: '#1F1F1F', shorts: true, tee: true, boots: true },
];
// Places in the pack, in drawing units around its centre (back row first), and each one's step
const PACK: { at: Point; stride: string }[] = [
  { at: [-9, -6], stride: '-0.05s' },
  { at: [9, -7], stride: '-0.21s' },
  { at: [-3, 4], stride: '-0.29s' },
  { at: [14, 3], stride: '-0.12s' },
];

function Runners() {
  // The outer ring: right road, front road, outer left road, outer back road, and round again
  const ring = ([[405, -176], [405, 622], [-176, 622], [-176, -176]] as Point[])
    .map(([s, t]) => iso(SITE_GROUND, s, t))
    .map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' L ');
  return (
    <g className="runner-pack" style={{ offsetPath: `path('M ${ring} Z')` } as CSSProperties}>
      {RUNNERS.map((look, i) => (
        <g key={i} style={{ '--stride': PACK[i].stride } as CSSProperties}>
          <Person origin={PACK[i].at} s={0} t={0} look={look} run laugh={i % 2 === 1} />
        </g>
      ))}
    </g>
  );
}

/** Gradients, filters and clips shared by the scenes. */
export function SceneDefs() {
  const R = RNDS_FLOOR;
  const C = CLUB_FLOOR;
  return (
    <defs>
        <linearGradient id="bld-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F1F2F8" />
        </linearGradient>
        <linearGradient id="bld-side-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D2D5E7" />
          <stop offset="1" stopColor="#C3C8E0" />
        </linearGradient>
        <linearGradient id="bld-side-right" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E5E7F2" />
          <stop offset="1" stopColor="#D8DBEC" />
        </linearGradient>
        <linearGradient id="bld-wall-left" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EEF0F7" />
          <stop offset="1" stopColor="#DFE1EE" />
        </linearGradient>
        <linearGradient id="bld-wall-right" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F9FAFD" />
          <stop offset="1" stopColor="#EBEDF5" />
        </linearGradient>
        <linearGradient id="bld-post" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#E3E5F1" />
          <stop offset="1" stopColor="#B6BBD2" />
        </linearGradient>
        <radialGradient id="bld-vinyl-light" cx="0.3" cy="0.22" r="0.6">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bld-vinyl-dark" cx="0.32" cy="0.25" r="0.95">
          <stop offset="0.45" stopColor="#262B5E" stopOpacity="0" />
          <stop offset="1" stopColor="#262B5E" stopOpacity="0.3" />
        </radialGradient>
        <radialGradient id="bld-sheen" cx="0.32" cy="0.28" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        {/* Warm light under the lamps, a light yellow so it reads on the white model */}
        <linearGradient id="bld-lamp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE477" stopOpacity="0.6" />
          <stop offset="1" stopColor="#FFF3B8" stopOpacity="0.12" />
        </linearGradient>
        <linearGradient id="bld-lamp-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE07A" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFD060" stopOpacity="0.04" />
        </linearGradient>
        {/* Floor materials, drawn in floor units and laid flat on each floor */}
        <pattern id="bld-floor-rnds" patternUnits="userSpaceOnUse" width="80" height="80" patternTransform={`matrix(0.866 0.5 -0.866 0.5 ${R[0]} ${R[1]})`}>
          <rect width="80" height="80" fill="#F6F7FB" />
          <rect x="40" width="40" height="40" fill="#F1F1F1" />
          <rect y="40" width="40" height="40" fill="#F1F1F1" />
          <path d="M0 0H80M0 40H80M0 0V80M40 0V80" stroke="#E1E3F0" strokeWidth="1" fill="none" />
        </pattern>
        <pattern id="bld-floor-club" patternUnits="userSpaceOnUse" width="160" height="40" patternTransform={`matrix(0.866 0.5 -0.866 0.5 ${C[0]} ${C[1]})`}>
          {/* Dark brown bar parquet */}
          <rect width="160" height="40" fill="#5A3A27" />
          <rect width="80" height="20" fill="#634130" />
          <rect x="80" width="80" height="20" fill="#56372A" />
          <rect x="-40" y="20" width="80" height="20" fill="#5D3C2A" />
          <rect x="40" y="20" width="80" height="20" fill="#6A4733" />
          <rect x="120" y="20" width="80" height="20" fill="#5D3C2A" />
          <path d="M0 0H160M0 20H160M0 0V20M80 0V20M40 20V40M120 20V40" stroke="#3B2519" strokeWidth="0.9" fill="none" />
          <path d="M8 7H60M92 13H150M50 27H104M130 33H158M4 33H30" stroke="#714D38" strokeWidth="0.6" fill="none" />
        </pattern>
        <radialGradient id="bld-floor-light" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bld-pool" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFD98A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFD98A" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bld-arch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D2D6EA" />
          <stop offset="1" stopColor="#E4E6F2" />
        </linearGradient>
        <linearGradient id="bld-canvas" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2E2E30" />
          <stop offset="1" stopColor="#111112" />
        </linearGradient>
        <radialGradient id="bld-felt" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bld-asphalt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#CFD2E2" />
          <stop offset="1" stopColor="#C3C7DA" />
        </linearGradient>
        <linearGradient id="bld-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7C8794" />
          <stop offset="1" stopColor="#3E454E" />
        </linearGradient>
        <radialGradient id="bld-ground" cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#F1F2F8" />
          <stop offset="1" stopColor="#DEE1EE" />
        </radialGradient>
        {/* Fine grain over the whole scene, like a render */}
        <filter id="bld-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 0.07" />
        </filter>
        <filter id="bld-blur-l" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="bld-blur-m" x="-60%" y="-60%" width="220%" height="220%">
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
  );
}

/**
 * An arched doorway on a wall's inner face, like the soft white architecture of a scale model.
 * `along` is the wall's direction on screen: 'left' for a wall along t (s = const), 'right' for
 * a wall along s (t = const). (s, t) is where the arch starts on the floor.
 */
function Arch({ origin, s, t, along, width = 26, height = 50 }: { origin: Point; s: number; t: number; along: 'left' | 'right'; width?: number; height?: number }) {
  const [x, y] = iso(origin, s, t);
  const matrix = along === 'left' ? `matrix(0.866 -0.5 0 1 ${x} ${y})` : `matrix(0.866 0.5 0 1 ${x} ${y})`;
  const r = width / 2;
  return (
    <g transform={matrix}>
      <path d={`M0 0 V${-height + r} A${r} ${r} 0 0 1 ${width} ${-height + r} V0 Z`} fill="url(#bld-arch)" />
      <path d={`M0 0 V${-height + r} A${r} ${r} 0 0 1 ${width} ${-height + r}`} fill="none" stroke="#FFFFFF" strokeWidth="1.4" />
    </g>
  );
}

/** RNDS floor: the boxing gym, its walls, logo, ring, bags and boxers. */
function RndsFloorArt() {
  const R = RNDS_FLOOR;
  return (
    <>
      {/* RNDS floor */}
      <polygon points="877,280 877,298 660.5,423 660.5,405" fill="url(#bld-side-right)" />
      <polygon points="660.5,405 660.5,423 383.5,263 383.5,245" fill="url(#bld-side-left)" />
      {/* Gym floor: square rubber tiles */}
      <polygon points="600,120 877,280 660.5,405 383.5,245" fill="url(#bld-floor-rnds)" stroke="#E2E4F0" />
      <polygon points="600,120 877,280 660.5,405 383.5,245" fill="url(#bld-floor-light)" />
      <g clipPath="url(#bld-clip-rnds)" filter="url(#bld-blur-m)" fill="#2E3470" fillOpacity="0.09">
        <polygon points={points(R, [[8, 8], [8, 250], [30, 250], [30, 8]])} />
        <polygon points={points(R, [[8, 8], [320, 8], [320, 30], [8, 30]])} />
      </g>
      <Walls origin={R} left={95} right={95} thick={8} />
      <Arch origin={R} s={8} t={248} along="left" />
      <Arch origin={R} s={282} t={8} along="right" />
      {/* RNDS logo as in the brand kit: Kode Mono Bold, black on light, red dot top right, no tilt or effect */}
      <g transform={`matrix(0.866 -0.5 0 1 ${iso(R, 8, 196).join(' ')}) translate(0 -40)`}>
        <text fontFamily="'Kode Mono', ui-monospace, monospace" fontWeight="700" fontSize="34" fill="#000000" textLength="88" lengthAdjust="spacing">RNDS</text>
        <circle cx="95" cy="-24" r="3.6" fill={RNDS} />
        <text y="15" fontFamily="'Kode Mono', ui-monospace, monospace" fontSize="9" fill="#8E8E8B" letterSpacing="2.2">BOXING CLUB</text>
      </g>
      <line x1="626" y1="40" x2="626" y2="92" stroke="#CDD1E5" />
      <ellipse cx="626" cy="96" rx="16" ry="6" fill="#D2D5E7" />
      <ellipse cx="626" cy="98" rx="10" ry="2.6" fill="#FFF3B0" />
      <polygon points="612,98 640,98 742,255 626,322 510,255" fill="url(#bld-lamp)" />


      {/* Punching bags */}
      <ellipse cx="812" cy="276" rx="9" ry="3.5" fill="#2E3470" fillOpacity="0.12" filter="url(#bld-blur-s)" />
      <ellipse cx="846" cy="296" rx="9" ry="3.5" fill="#2E3470" fillOpacity="0.12" filter="url(#bld-blur-s)" />
      {/* This one swings each time the boxer beside it lands a punch */}
      <g className="bag-swing">
        <line x1="808" y1="192" x2="808" y2="228" stroke="#B3B8CF" strokeWidth="2" />
        <rect x="801" y="228" width="14" height="38" rx="6" fill={RNDS} />
        <rect x="801" y="236" width="14" height="4" fill={RNDS_DARK} />
        <rect x="801" y="228" width="14" height="38" rx="6" fill="url(#bld-sheen)" />
      </g>
      <line x1="842" y1="212" x2="842" y2="248" stroke="#B3B8CF" strokeWidth="2" />
      <rect x="835" y="248" width="14" height="38" rx="6" fill={RNDS} />
      <rect x="835" y="256" width="14" height="4" fill={RNDS_DARK} />
      <rect x="835" y="248" width="14" height="38" rx="6" fill="url(#bld-sheen)" />

      <Ring origin={R} back />
      <People origin={R} figures={RNDS_PEOPLE} prefix="r" />
      <Pow at={iso(R, 172, 110)} side="b" />
      <Pow at={iso(R, 122, 126)} side="a" />
      <Ring origin={R} />
    </>
  );
}

/** Club 421 floor: the bar with its bottles, the dice tables and the students. */
function ClubFloorArt() {
  const C = CLUB_FLOOR;
  return (
    <>
      {/* Club 421 floor */}
      <polygon points="626,425 626,443 409.5,568 409.5,550" fill="url(#bld-side-right)" />
      <polygon points="409.5,550 409.5,568 132.4,408 132.4,390" fill="url(#bld-side-left)" />
      {/* Bar floor: light oak planks, staggered */}
      <polygon points="348.9,265 626,425 409.5,550 132.4,390" fill="url(#bld-floor-club)" stroke="#3B2519" />
      <polygon points="348.9,265 626,425 409.5,550 132.4,390" fill="url(#bld-floor-light)" />
      <g clipPath="url(#bld-clip-club)" filter="url(#bld-blur-m)" fill="#2E3470" fillOpacity="0.09">
        <polygon points={points(C, [[8, 8], [8, 250], [30, 250], [30, 8]])} />
        <polygon points={points(C, [[8, 8], [320, 8], [320, 22], [8, 22]])} />
      </g>
      <Walls origin={C} left={95} thick={8} />
      <Arch origin={C} s={8} t={36} along="left" width={24} height={46} />
      <Walls origin={C} right={24} thick={8} />
      {/* Club 421 logo on the back wall, beside the bar shelf */}
      <image
        href={logo421}
        width="60"
        height="60"
        transform={`matrix(0.866 -0.5 0 1 ${iso(C, 8, 232).join(' ')}) translate(0 -88)`}
      />
      {/* Shelf of bottles on the wall behind the bar */}
      <polygon points={solid(C, [[8, 48, 50], [14, 48, 50], [14, 160, 50], [8, 160, 50]])} fill="#FFFFFF" stroke="#D6D9EB" strokeWidth="0.6" />
      <polygon points={solid(C, [[14, 48, 48], [14, 160, 48], [14, 160, 50], [14, 48, 50]])} fill="#D3D6E8" />
      {[56, 68, 80, 92, 104, 116, 128, 140, 152].map((t, index) => {
        const [x, y] = iso(C, 11, t);
        const colors = ['#3E7D5A', '#8A5A2B', CLUB, '#E9E4D8', '#3E7D5A', '#B23A48', '#8A5A2B', '#E9E4D8', CLUB];
        return <Bottle key={t} x={x} y={y - 50} color={colors[index]} tall={index % 3 === 1 ? 1.2 : 1} />;
      })}

      {/* Bar counter */}
      <polygon points={points(C, [[16, 44], [46, 44], [46, 208], [16, 208]])} fill="#2E3470" fillOpacity="0.12" filter="url(#bld-blur-m)" />
      <g stroke="#DADDED" strokeWidth="0.8" strokeLinejoin="round">
        <polygon points={solid(C, [[40, 40, 0], [40, 200, 0], [40, 200, 24], [40, 40, 24]])} fill="url(#bld-side-left)" />
        <polygon points={solid(C, [[16, 200, 0], [40, 200, 0], [40, 200, 24], [16, 200, 24]])} fill="url(#bld-side-right)" />
        <polygon points={solid(C, [[16, 40, 24], [40, 40, 24], [40, 200, 24], [16, 200, 24]])} fill="url(#bld-top)" />
      </g>
      {/* On the bar: bottles, glasses and a dice cup */}
      {([[24, 60, '#3E7D5A'], [26, 74, '#8A5A2B'], [23, 170, CLUB], [27, 184, '#E9E4D8']] as [number, number, string][]).map(([bs, bt, color]) => {
        const [x, y] = iso(C, bs, bt);
        return <Bottle key={`${bs}-${bt}`} x={x} y={y - 24} color={color} />;
      })}
      {/* Cocktails he has just served, and a row of golden shots */}
      {([[100, '#F27BA0'], [136, '#F2B33D']] as [number, string][]).map(([gt, drink]) => {
        const [x, y] = iso(C, 30, gt);
        return (
          <g key={gt}>
            <line x1={x} y1={y - 24} x2={x} y2={y - 29} stroke="#CDD1E5" strokeWidth="0.8" />
            <ellipse cx={x} cy={y - 24.2} rx="2" ry="0.7" fill="#E4E6F1" />
            <path d={`M${x - 3.6},${y - 33.4} L${x + 3.6},${y - 33.4} L${x},${y - 28.8} Z`} fill="#FFFFFF" fillOpacity="0.9" stroke="#CDD1E5" strokeWidth="0.4" />
            <path d={`M${x - 2.8},${y - 32.4} L${x + 2.8},${y - 32.4} L${x},${y - 29.4} Z`} fill={drink} />
            <circle cx={x + 2.6} cy={y - 33.6} r="1.2" fill="#F4E04D" stroke="#E0C62E" strokeWidth="0.3" />
          </g>
        );
      })}
      {[112, 117, 122].map((gt) => {
        const [x, y] = iso(C, 32, gt);
        return (
          <g key={gt}>
            <path d={`M${x - 1.6},${y - 28.4} L${x + 1.6},${y - 28.4} L${x + 1.3},${y - 24.2} L${x - 1.3},${y - 24.2} Z`} fill="#FFFFFF" fillOpacity="0.9" stroke="#CDD1E5" strokeWidth="0.35" />
            <path d={`M${x - 1.45},${y - 27} L${x + 1.45},${y - 27} L${x + 1.3},${y - 24.2} L${x - 1.3},${y - 24.2} Z`} fill="#E8A93A" />
          </g>
        );
      })}
      {(() => {
        const [x, y] = iso(C, 30, 150);
        return vinyl((f) => <rect x={x - 2.4} y={y - 30} width="4.8" height="6" rx="1.4" fill={f} />, '#2B2B2B');
      })()}
      <line x1="392" y1="318" x2="392" y2="356" stroke="#CDD1E5" />
      <ellipse cx="392" cy="360" rx="13" ry="5" fill="#D2D5E7" />
      <ellipse cx="392" cy="362" rx="8" ry="2.2" fill="#FFF3B0" />
      <polygon points="378,362 406,362 456,400 392,438 328,400" fill="url(#bld-lamp)" />

      {/* Dice tables */}
      <DiceTable cx={392} cy={398} rx={56} ry={31} rolling />
      <DiceTable cx={500} cy={468} rx={34} ry={19} />
      <People origin={C} figures={CLUB_PEOPLE} prefix="c" />
      <Bartender origin={C} />
    </>
  );
}

/**
 * The whole site, as a white clay scale model: both floors on their plate, the roads,
 * plots, trees and cars around. The project colours stay on a few details only.
 */
function BuildingArt() {
  return (
    <svg viewBox="-80 -40 1170 730" className="building-art" aria-hidden="true">
      <SceneDefs />
      {/* The table: grey ground, and the roads that run between the plots */}
      <rect x="-80" y="-40" width="1170" height="730" fill="url(#bld-ground)" />
      <Roads />

      {/* Plots behind the building */}
      <Slab s0={-140} t0={40} s1={-56} t1={540} r={22} h={6} top="#EEF0F7" side="#CED2E6" />
      <Slab s0={30} t0={-140} s1={380} t1={-56} r={22} h={6} top="#EEF0F7" side="#CED2E6" />
      <Tree s={-100} t={110} />
      <Tree s={-92} t={270} size={0.9} />
      <Tree s={-102} t={430} />
      {HOME_BLOCKS.filter((b) => b.s1 < 0 || b.t1 < 0).map((b) => (
        <BlockArt key={`${b.s0}-${b.t0}`} g={SITE_GROUND} b={b} />
      ))}
      <Tree s={90} t={-100} size={0.9} />
      <Tree s={220} t={-96} />
      <Tree s={340} t={-102} size={0.85} />
      {/* The traffic on the back roads, behind the building */}
      {CARS.map((car) => (
        <DrivingCar key={`${car.s}-${car.t}`} {...car} />
      ))}

      {/* Base plate */}
      <Slab s0={0} t0={0} s1={366} t1={586} r={26} h={14} top="#F6F7FB" side="#CDD1E5" shadow={0.16} />

      <RndsFloorArt />
      <ClubFloorArt />

      {/* In front: the plots across the road */}
      <Slab s0={440} t0={70} s1={540} t1={480} r={22} h={6} top="#EEF0F7" side="#CED2E6" />
      <Slab s0={40} t0={656} s1={400} t1={750} r={22} h={6} top="#EEF0F7" side="#CED2E6" />
      {HOME_BLOCKS.filter((b) => b.s1 >= 0 && b.t1 >= 0).map((b) => (
        <BlockArt key={`${b.s0}-${b.t0}`} g={SITE_GROUND} b={b} />
      ))}
      {LAMP_POSTS.map(([ls, lt]) => (
        <Lamp key={`${ls}-${lt}`} s={ls} t={lt} />
      ))}
      <Runners />
      <Tree s={482} t={130} />
      <Tree s={500} t={230} size={1.1} />
      <Tree s={480} t={340} size={0.9} />
      <Tree s={505} t={440} />
      <Tree s={130} t={705} size={0.95} />
      <Tree s={250} t={700} size={1.1} />
      <Tree s={360} t={708} size={0.9} />

      <SkyTint box={[-80, -40, 1170, 730]} lit={[LIT_SPACES.rnds, LIT_SPACES.club421]} />
      {/* At night the cars are drawn again over the dark, dimmed but readable, at their exact shape,
          except where the building stands in front of them */}
      <mask id="bld-night-cars">
        <rect x="-80" y="-40" width="1170" height="730" fill="#FFFFFF" />
        <polygon points={LIT_SPACES.rnds} fill="#000000" />
        <polygon points={LIT_SPACES.club421} fill="#000000" />
      </mask>
      <g className="night-cars" mask="url(#bld-night-cars)">
        {CARS.map((car) => (
          <DrivingCar key={`${car.s}-${car.t}`} {...car} />
        ))}
        <Runners />
      </g>
      <NightLights />
      <rect x="-80" y="-40" width="1170" height="730" filter="url(#bld-grain)" />
    </svg>
  );
}

type Block = { s0: number; s1: number; t0: number; t1: number; h: number };

/** A neighbouring block in white clay, with two rows of windows on the face turned to us. */
function BlockArt({ g, b }: { g: Point; b: Block }) {
  return (
    <g>
      <polygon points={points(g, [[b.s0, b.t0], [b.s1 + 12, b.t0], [b.s1 + 12, b.t1 + 12], [b.s0, b.t1]])} fill="#2E3470" fillOpacity="0.12" filter="url(#bld-blur-m)" />
      <polygon points={solid(g, [[b.s1, b.t0, 0], [b.s1, b.t1, 0], [b.s1, b.t1, b.h], [b.s1, b.t0, b.h]])} fill="#D3D6E8" />
      <polygon points={solid(g, [[b.s0, b.t1, 0], [b.s1, b.t1, 0], [b.s1, b.t1, b.h], [b.s0, b.t1, b.h]])} fill="#EBEDF5" />
      <polygon points={solid(g, [[b.s0, b.t0, b.h], [b.s1, b.t0, b.h], [b.s1, b.t1, b.h], [b.s0, b.t1, b.h]])} fill="#F9FAFD" />
      {[0.35, 0.62].map((level) => (
        <polygon key={level} points={solid(g, [[b.s0 + 8, b.t1, b.h * level], [b.s1 - 8, b.t1, b.h * level], [b.s1 - 8, b.t1, b.h * level + 5], [b.s0 + 8, b.t1, b.h * level + 5]])} fill="#E1E3F0" />
      ))}
    </g>
  );
}

/** Its lit windows at night: a few small warm panes, not every one. */
function BlockWindows({ g, b, seed }: { g: Point; b: Block; seed: number }) {
  return (
    <>
      {/* One lit window in three, on one floor, square and soft: a building where people live */}
      {Array.from({ length: Math.max(0, Math.floor((b.s1 - b.s0 - 16) / 22)) }, (_, i) => i)
        .filter((i) => (i + seed) % 3 === 0)
        .map((i) => {
          const s0 = b.s0 + 12 + i * 22;
          const h = b.h * 0.5;
          return (
            <polygon
              key={i}
              points={solid(g, [[s0, b.t1, h], [s0 + 10, b.t1, h], [s0 + 10, b.t1, h + 10], [s0, b.t1, h + 10]])}
              fill="#FFD98A"
              fillOpacity="0.4"
            />
          );
        })}
    </>
  );
}

// Blocks that fill the corners of the home map, past the back roads and on the right
const HOME_BLOCKS: Block[] = [
  { s0: -330, s1: -210, t0: 40, t1: 170, h: 84 },
  { s0: -340, s1: -220, t0: 210, t1: 330, h: 56 },
  { s0: -320, s1: -220, t0: 380, t1: 480, h: 40 },
  { s0: 50, s1: 190, t0: -330, t1: -210, h: 96 },
  { s0: 230, s1: 370, t0: -320, t1: -210, h: 62 },
  { s0: 600, s1: 700, t0: -60, t1: 90, h: 70 },
];

// Around a plate (a project's floor, or a module's plate): two roads in front, a few
// neighbouring blocks behind, trees and street lamps. By night the windows and lamps light up.
// `size` is the plate's extent in floor units (s, t), measured from the ground origin.
function hoodPlan([S, T]: Point) {
  return {
    blocks: [
      { s0: -150, s1: -60, t0: T * 0.08, t1: T * 0.5, h: 70 },
      { s0: -160, s1: -70, t0: T * 0.62, t1: T * 0.95, h: 46 },
      { s0: S * 0.1, s1: S * 0.44, t0: -160, t1: -70, h: 86 },
      { s0: S * 0.53, s1: S * 0.88, t0: -150, t1: -70, h: 54 },
    ],
    trees: [
      [S + 94, T * 0.25],
      [S + 98, T * 0.75],
      [S * 0.3, T + 100],
      [S * 0.72, T + 106],
      [-40, -40],
    ] as Point[],
    lamps: [
      [S + 20, T * 0.48],
      [S * 0.45, T + 20],
    ] as Point[],
    roadS: S + 50,
    roadT: T + 48,
  };
}

export function Neighbourhood({ ground: g, part, size = [342, 272] }: { ground: Point; part: 'back' | 'front' | 'lights'; size?: Point }) {
  const { blocks, trees, lamps, roadS, roadT } = hoodPlan(size);
  const [S, T] = size;
  const inFront = ([ts, tt]: Point) => ts > S || tt > T;
  if (part === 'lights') {
    return (
      <>
        {blocks.map((b, bi) => (
          <BlockWindows key={`${b.s0}-${b.t0}`} g={g} b={b} seed={bi} />
        ))}
        {lamps.map(([ls, lt]) => {
          const [x, y] = iso(g, ls, lt);
          return (
            <g key={`${ls}-${lt}`}>
              <ellipse cx={x - 12} cy={y - 4} rx="26" ry="13" fill="url(#bld-pool)" />
              <circle cx={x - 12} cy={y - 46} r="2.6" fill="#FFF6CC" />
            </g>
          );
        })}
      </>
    );
  }
  if (part === 'front') {
    return (
      <>
        {lamps.map(([ls, lt]) => (
          <Lamp key={`${ls}-${lt}`} s={ls} t={lt} origin={[g[0], g[1] + 6]} />
        ))}
        {trees.filter(inFront).map(([ts, tt]) => (
          <Tree key={`${ts}-${tt}`} origin={g} s={ts} t={tt} size={0.85} base={0} />
        ))}
      </>
    );
  }
  return (
    <>
      {/* Roads in front of the plate */}
      <polygon points={points(g, [[roadS - 20, -400], [roadS + 20, -400], [roadS + 20, 900], [roadS - 20, 900]])} fill="url(#bld-asphalt)" />
      <polygon points={points(g, [[-400, roadT - 20], [900, roadT - 20], [900, roadT + 20], [-400, roadT + 20]])} fill="url(#bld-asphalt)" />
      <g fill="none" stroke="#F4F4F4" strokeWidth="1.6" strokeDasharray="12 10">
        <polyline points={points(g, [[roadS, -400], [roadS, 900]])} />
        <polyline points={points(g, [[-400, roadT], [900, roadT]])} />
      </g>
      {/* Neighbouring blocks behind, white clay with rows of windows */}
      {blocks.map((b) => (
        <BlockArt key={`${b.s0}-${b.t0}`} g={g} b={b} />
      ))}
      {trees.filter((p) => !inFront(p)).map(([ts, tt]) => (
        <Tree key={`${ts}-${tt}`} origin={g} s={ts} t={tt} size={0.85} base={0} />
      ))}
    </>
  );
}

// One floor on its own, for the workspace: which part of the drawing to show, and the spots
// that open each module, as floor points (s, t) and a height h above the floor.
const SCENES: Record<ProjectId, {
  origin: Point;
  viewBox: [number, number, number, number];
  spots: Record<string, [number, number, number]>;
}> = {
  rnds: {
    origin: RNDS_FLOOR,
    viewBox: [330, -20, 600, 480],
    spots: {
      clubs: [150, 120, 52],
      ambassadeurs: [268, 58, 46],
      publications: [8, 150, 74],
      abonnes: [300, 210, 34],
    },
  },
  club421: {
    origin: CLUB_FLOOR,
    viewBox: [80, 125, 600, 480],
    spots: {
      bde: [158, 108, 44],
      soirees: [28, 110, 44],
      'app-store': [8, 216, 70],
      revenus: [290, 116, 40],
    },
  },
};

/**
 * The project's floor alone on its plate, as in the home scene, with round buttons placed on
 * the drawing that open the matching modules.
 */
export function ProjectScene({ project, current }: { project: Project; current: string }) {
  if (!SCENES[project.id]) return <EmptyLot project={project} />;
  return <FloorScene project={project} current={current} />;
}

/**
 * A new project's scene: an empty plot waiting to be built, with the outline of the future
 * building, a sign with its name and a few trees.
 */
function EmptyLot({ project }: { project: Project }) {
  const [choice, setChoice] = usePhaseChoice();
  const phase = usePhase(choice);
  const o: Point = [500, 110];
  const box: [number, number, number, number] = [180, 0, 640, 470];
  const color = project.custom?.color ?? '#8E8E93';
  const [sx, sy] = iso(o, 70, 230);
  const plate = litArea([o[0], o[1] + 12], [[-20, -20, 0], [340, -20, 0], [340, 270, 0], [-20, 270, 0], [-20, 270, -12], [340, 270, -12], [340, -20, -12]]);
  return (
    <div className="scene" data-project={project.id} data-phase={phase}>
      <MapViewport label={`Terrain de ${project.name}, encore à bâtir`}>
        <svg viewBox={box.join(' ')} className="scene-art" aria-hidden="true">
          <SceneDefs />
          <rect x={box[0]} y={box[1]} width={box[2]} height={box[3]} fill="url(#bld-ground)" />
          <Slab origin={[o[0], o[1] + 12]} s0={-20} t0={-20} s1={340} t1={270} r={26} h={12} top="#F6F7FB" side="#CDD1E5" shadow={0.18} />
          {/* Outline of the building to come */}
          <polygon points={points(o, [[40, 30], [280, 30], [280, 200], [40, 200]])} fill="none" stroke={color} strokeWidth="2" strokeDasharray="10 8" />
          <FloorText origin={o} s={60} t={190} size={20}>
            À BÂTIR
          </FloorText>
          {/* Sign with the project's name */}
          <line x1={sx - 14} y1={sy} x2={sx - 14} y2={sy - 40} stroke="#BBC0D6" strokeWidth="2" />
          <line x1={sx + 30} y1={sy - 26} x2={sx + 30} y2={sy - 66} stroke="#BBC0D6" strokeWidth="2" />
          <polygon points={`${sx - 22},${sy - 36} ${sx + 38},${sy - 70} ${sx + 38},${sy - 50} ${sx - 22},${sy - 16}`} fill="#FFFFFF" stroke="#D8DBEB" />
          <text transform={`matrix(0.866 -0.5 0 1 ${sx - 16} ${sy - 23})`} fontSize="10" fontWeight="700" fill={color}>
            {project.name.slice(0, 12)}
          </text>
          <Tree origin={o} s={300} t={230} size={0.9} base={0} />
          <Tree origin={o} s={-4} t={20} size={0.8} base={0} />
          <Tree origin={o} s={310} t={-6} size={0.7} base={0} />
          <SkyTint box={box} lit={[plate]} />
          <rect x={box[0]} y={box[1]} width={box[2]} height={box[3]} filter="url(#bld-grain)" />
        </svg>
      </MapViewport>
      <PhaseButton choice={choice} phase={phase} onChange={setChoice} />
    </div>
  );
}

function FloorScene({ project, current }: { project: Project; current: string }) {
  const scene = SCENES[project.id];
  const [choice, setChoice] = usePhaseChoice();
  const phase = usePhase(choice);
  const [vx, vy, vw, vh] = scene.viewBox;
  const [ox, oy] = scene.origin;
  const plate: Point = [ox, oy + 30];
  return (
    <div className="scene" data-project={project.id} data-phase={phase}>
      <svg viewBox={scene.viewBox.join(' ')} className="scene-art" aria-hidden="true">
        <SceneDefs />
        <rect x={vx} y={vy} width={vw} height={vh} fill="url(#bld-ground)" />
        <Neighbourhood ground={[ox, oy + 30]} part="back" />
        <Slab origin={plate} s0={-22} t0={-22} s1={342} t1={272} r={26} h={12} top="#F6F7FB" side="#CDD1E5" shadow={0.18} />
        {project.id === 'rnds' ? <RndsFloorArt /> : <ClubFloorArt />}
        <Neighbourhood ground={[ox, oy + 30]} part="front" />
        <SkyTint box={scene.viewBox} lit={LIT_SCENES[project.id] ? [LIT_SCENES[project.id]] : []} />
        <NightLights only={project.id} />
        <g className="night-lights">
          <Neighbourhood ground={[ox, oy + 30]} part="lights" />
        </g>
        <rect x={vx} y={vy} width={vw} height={vh} filter="url(#bld-grain)" />
      </svg>
      <PhaseButton choice={choice} phase={phase} onChange={setChoice} />
      <ul className="scene-spots" aria-label={`Rubriques de ${project.name} sur la maquette`}>
        {project.modules
          .filter((module) => scene.spots[module.slug])
          .map((module) => {
            const [s, t, h] = scene.spots[module.slug];
            const [x, y] = iso(scene.origin, s, t);
            const left = ((x - vx) / vw) * 100;
            const top = ((y - h - vy) / vh) * 100;
            const active = module.slug === current;
            return (
              <li key={module.slug} className="scene-spot-item" style={{ left: `${left}%`, top: `${top}%` }}>
                <Link
                  to={`/${project.id}/${module.slug}`}
                  className={`scene-spot${active ? ' scene-spot--active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <ModuleIcon slug={module.slug} size={18} />
                  <span className="scene-spot-label">{module.label}</span>
                </Link>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
