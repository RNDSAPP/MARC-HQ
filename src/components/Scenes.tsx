// Scenes of particular modules, drawn with the same clay model pieces as the building:
// a city of clubs (or student unions) for a pipeline, a square with a podium for the ambassadors.
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Module, PipelineColumn, PipelineTone, Project } from '../data/types';
import { phaseLabel, usePhase } from '../lib/sun';
import {
  FloorText,
  Neighbourhood,
  Person,
  PhaseButton,
  SKIN,
  SceneDefs,
  SkyTint,
  Slab,
  Tree,
  iso,
  points,
  solid,
  usePhaseChoice,
} from './Building';
import type { Look, Point } from './Building';
import MapViewport from './MapViewport';
import './Scenes.css';

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Something you can open on a scene: a club, a student union, an ambassador. */
export type SceneItem = {
  id: string;
  /** Anchor of its marker, in drawing units. */
  x: number;
  y: number;
  label: string;
  sub: string;
  tone: PipelineTone;
  value?: string;
};

/**
 * Wrapper shared by the module scenes: day/night, a map you can walk around, a numbered marker
 * on each item, and the names in a list under the map (legible, unlike labels on the drawing).
 */
function SceneFrame({ project, box: plateBox, art, lights, lit, items, title, onSelect, hood, zoom = 1 }: {
  project: Project;
  /** Opening zoom, for scenes whose figures would look too small from afar. */
  zoom?: number;
  box: [number, number, number, number];
  /** Roads, blocks and trees around the plate: its ground origin and extent. */
  hood?: { ground: Point; size: Point };
  art: ReactNode;
  lights?: ReactNode;
  /** Areas that stay lit at night (outlines in drawing units). */
  lit?: string[];
  items: SceneItem[];
  title: string;
  onSelect: (id: string) => void;
}) {
  const [choice, setChoice] = usePhaseChoice();
  const phase = usePhase(choice);
  const [hover, setHover] = useState<string | null>(null);
  // With a neighbourhood, the frame opens a little wider so it shows around the plate
  const box: [number, number, number, number] = hood
    ? [plateBox[0] - 90, plateBox[1] - 70, plateBox[2] + 180, plateBox[3] + 130]
    : plateBox;
  const [x, y, w, h] = box;
  return (
    <div className="scene-block" data-project={project.id}>
      <div className="scene" data-phase={phase}>
        <MapViewport
          start={zoom}
          label={`${title}, ${phaseLabel[phase].toLowerCase()}. Glisse pour te déplacer, pince ou ⌘ + molette pour zoomer.`}
          markers={(zoom) => (
            <ul className="scene-pins" aria-label={title}>
              {items.map((item, index) => (
                <li key={item.id} className="scene-pin-item" style={{ ...place(box, item.x, item.y), transform: `translate(-50%, -100%) scale(${1 / zoom})` }}>
                  <button
                    type="button"
                    className={`scene-pin scene-pin--${item.tone}${hover === item.id ? ' scene-pin--hover' : ''}`}
                    onClick={() => onSelect(item.id)}
                    onPointerEnter={() => setHover(item.id)}
                    onPointerLeave={() => setHover(null)}
                    aria-label={`${index + 1}. ${item.label}, ${item.sub}`}
                  >
                    {index + 1}
                  </button>
                  {hover === item.id && <span className="scene-pin-name">{item.label}</span>}
                </li>
              ))}
            </ul>
          )}
        >
          <svg viewBox={box.join(' ')} className="scene-art" aria-hidden="true">
            <SceneDefs />
            <rect x={x} y={y} width={w} height={h} fill="url(#bld-ground)" />
            {hood && <Neighbourhood ground={hood.ground} size={hood.size} part="back" />}
            {art}
            {hood && <Neighbourhood ground={hood.ground} size={hood.size} part="front" />}
            <SkyTint box={box} lit={lit} />
            <g className="night-lights">
              {lights}
              {hood && <Neighbourhood ground={hood.ground} size={hood.size} part="lights" />}
            </g>
            <rect x={x} y={y} width={w} height={h} filter="url(#bld-grain)" />
          </svg>
        </MapViewport>
        <PhaseButton choice={choice} phase={phase} onChange={setChoice} />
      </div>

      <ol className="scene-legend" aria-label={`Liste : ${title}`}>
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              className={`scene-legend-item${hover === item.id ? ' scene-legend-item--hover' : ''}`}
              onClick={() => onSelect(item.id)}
              onPointerEnter={() => setHover(item.id)}
              onPointerLeave={() => setHover(null)}
            >
              <span className={`scene-legend-num scene-pin--${item.tone}`}>{index + 1}</span>
              <span className="scene-legend-text">
                <span className="scene-legend-name">{item.label}</span>
                <span className="scene-legend-sub">{item.sub}</span>
              </span>
              {item.value && <span className="scene-legend-value">{item.value}</span>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Position in % of the drawing, for an HTML marker over the point (x, y). */
const place = ([bx, by, bw, bh]: [number, number, number, number], x: number, y: number) => ({
  left: `${((x - bx) / bw) * 100}%`,
  top: `${((y - by) / bh) * 100}%`,
});

// ---------------------------------------------------------------------------------------------
// City of a pipeline: one district per stage, one building per club (or student union).

const STREET = 44;
const SLOT = 40;
const LOT = 30;
// Spread order for named clubs on a grid of n × n slots, so their markers do not crowd. Markers
// stand tall over the buildings, so two slots one above the other on screen clash the most:
// each next slot is the one farthest from those taken, counting side-by-side distance in full and
// up-and-down distance a little only.
const spreadOrder = (n: number) => {
  const screen = (i: number) => {
    const col = i % n;
    const row = Math.floor(i / n);
    return [(col - row) * 0.866, (col + row) * 0.5];
  };
  const centre = Math.floor(n / 2) * n + Math.floor(n / 2);
  const order = [centre];
  const left = new Set(Array.from({ length: n * n }, (_, i) => i).filter((i) => i !== centre));
  while (left.size) {
    let best = -1;
    let bestScore = -1;
    for (const i of left) {
      const [x, y] = screen(i);
      const score = Math.min(...order.map((j) => {
        const [jx, jy] = screen(j);
        return (x - jx) ** 2 + 0.15 * (y - jy) ** 2;
      }));
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    order.push(best);
    left.delete(best);
  }
  return order;
};

type Lot = { s: number; t: number; h: number; tone: PipelineTone; name?: string; meta?: string; stage: string };

/** How many clubs a stage really holds: the matching figure of the module, else its named cards. */
function stageCount(column: PipelineColumn, module: Module) {
  const name = normalize(column.name);
  const kpi = module.kpis.find((k) => {
    const label = normalize(k.label);
    return name.includes(label) || label.includes(name);
  });
  const value = kpi ? parseInt(kpi.value.replace(/\s/g, ''), 10) : NaN;
  return Number.isFinite(value) ? Math.max(value, column.cards.length) : column.cards.length;
}

/** The city's size grows with its biggest stage: districts of n × n slots, never less than 5 × 5. */
/** What the buildings are: boxing gyms (clubs), a university campus (student unions), or houses. */
type CityKind = 'gym' | 'campus' | 'town';
const cityKind = (module: Module): CityKind => (module.slug === 'clubs' ? 'gym' : module.slug === 'bde' ? 'campus' : 'town');

function cityPlan(project: Project, module: Module) {
  const kind = cityKind(module);
  const counts = project.pipeline.columns.map((column) => ({ column, count: stageCount(column, module) }));
  // A campus keeps a 2 × 2 corner of each district for its lecture theatre
  const n = Math.max(5, Math.ceil(Math.sqrt(Math.max(...counts.map((c) => c.count)) + (kind === 'campus' ? 4 : 0))));
  const district = n * SLOT;
  const span = district * 2 + STREET;
  const width = 0.866 * span * 2 + 120;
  const origin: Point = [width / 2, 74];
  const box: [number, number, number, number] = [0, 0, width, span + 140];
  // Where each stage sits: affiliated at the back, the ones to sign at the front, nearest to Marc.
  const at: Record<PipelineTone, Point> = { accent: [0, 0], muted: [district + STREET, 0], new: [0, district + STREET], alert: [district + STREET, district + STREET] };
  const amphi = kind === 'campus' ? [n - 2, n - 1, 2 * n - 2, 2 * n - 1] : [];
  const order = spreadOrder(n).filter((slot) => !amphi.includes(slot));
  const lots: Lot[] = [];
  for (const { column, count } of counts) {
    const [ds, dt] = at[column.tone];
    const named = order.slice(0, column.cards.length);
    const rest = order.slice(column.cards.length);
    const slots = [...named, ...rest];
    for (let i = 0; i < count; i++) {
      const card = column.cards[i];
      const members = card ? parseInt(card.meta.match(/(\d[\d\s]*)\s*(membres|étudiants)/)?.[1].replace(/\s/g, '') ?? '', 10) : NaN;
      // Height from the members when known (capped), else a calm varied height
      const h = Number.isFinite(members) ? Math.min(16 + Math.sqrt(members) * 2.6, 52) : 18 + ((i * 7) % 14);
      const slot = slots[i];
      lots.push({ s: ds + (slot % n) * SLOT + 5, t: dt + Math.floor(slot / n) * SLOT + 5, h, tone: column.tone, name: card?.name, meta: card?.meta, stage: column.name });
    }
  }
  return { origin, box, district, at, counts, kind, n, lots: lots.sort((a, b) => a.s + a.t - (b.s + b.t)) };
}

/**
 * An open-air lecture theatre on a campus, in a 2 × 2 corner of a district (s0, t0): stepped
 * half-circles of seats, the highest at the back, each step with its front wall, students seated
 * along the steps, a small stage in the project's colour at the bottom.
 */
function Amphitheatre({ o, s0, t0 }: { o: Point; s0: number; t0: number }) {
  const cs = s0 + SLOT + 2;
  const ct = t0 + SLOT - 2;
  const base = 8;
  // The back half of a circle (facing us), from 135° to 315° in floor axes
  const half = (r: number, h: number) =>
    Array.from({ length: 17 }, (_, i) => {
      const a = ((135 + (180 * i) / 16) * Math.PI) / 180;
      return [cs + r * Math.cos(a), ct + r * Math.sin(a), h] as [number, number, number];
    });
  const end = (r: number, sign: number): [number, number] => [cs + sign * r * Math.cos((135 * Math.PI) / 180), ct + sign * r * Math.sin((135 * Math.PI) / 180)];
  const steps = [0, 1, 2, 3, 4].map((i) => ({ r: 40 - i * 7, h: base + (5 - i) * 4 }));
  return (
    <g>
      <polygon points={points(o, [[cs - 44, ct - 44], [cs + 44, ct - 44], [cs + 44, ct + 20], [cs - 44, ct + 20]])} fill="#2E3470" fillOpacity="0.1" filter="url(#bld-blur-m)" transform={`translate(0 ${-base})`} />
      {steps.map(({ r, h }, i) => {
        const [as, at] = end(r, 1);
        const [bs, bt] = end(r, -1);
        return (
          <g key={i}>
            {/* Front wall of the step along the diameter, then its top */}
            <polygon points={solid(o, [[as, at, base], [bs, bt, base], [bs, bt, h], [as, at, h]])} fill={i % 2 ? '#D9DCEA' : '#E2E5F0'} />
            <polygon points={solid(o, half(r, h))} fill={i % 2 ? '#F7F8FC' : '#EEF0F7'} stroke="#DADDEB" strokeWidth="0.5" />
            {/* Students seated along the step */}
            {i < 4 &&
              [0.16, 0.34, 0.52, 0.7, 0.86].map((f, k) => {
                if ((i * 2 + k) % 3 === 2) return null;
                const a = ((135 + 180 * f) * Math.PI) / 180;
                const rr = r - 3.5;
                const [x, y] = iso(o, cs + rr * Math.cos(a), ct + rr * Math.sin(a));
                const look = LOOKS[(i * 5 + k * 2) % LOOKS.length];
                return (
                  <g key={k}>
                    <rect x={x - 2.2} y={y - h - 5} width="4.4" height="4.6" rx="1.8" fill={look.top} />
                    <circle cx={x} cy={y - h - 7.2} r="2.3" fill={look.skin} />
                    <path d={`M${x - 2.3},${y - h - 7.6} a2.3 2.3 0 0 1 4.6,0 Z`} fill={look.headColor} />
                  </g>
                );
              })}
          </g>
        );
      })}
      {/* The stage and its lectern */}
      <polygon points={solid(o, half(9, base + 1))} className="lot-cap" />
      <polygon points={solid(o, [[cs - 3, ct - 3, base + 1], [cs + 1, ct - 3, base + 1], [cs + 1, ct - 3, base + 9], [cs - 3, ct - 3, base + 9]])} fill="#FFFFFF" stroke="#D6D9E8" strokeWidth="0.5" />
    </g>
  );
}

/**
 * A building of the city, by kind: a boxing gym (glass front, a sign band in the colour of its
 * stage, a bag behind the glass), a campus building (a faculty with columns, pediment and a flag
 * when it has a name, else a teaching block with rows of windows), or a house. Ghosts are still
 * to contact.
 */
function CityBuilding({ lot, o, kind }: { lot: Lot; o: Point; kind: CityKind }) {
  const { s, t, h, tone } = lot;
  const base = 8;
  const size = LOT;
  const ghost = tone === 'new';
  const top = base + h;
  const front = t + size;
  const face = (s0: number, s1: number, h0: number, h1: number) => solid(o, [[s0, front, h0], [s1, front, h0], [s1, front, h1], [s0, front, h1]]);
  const faculty = kind === 'campus' && !!lot.name;
  return (
    <g className={`lot lot--${tone}`}>
      <polygon points={points(o, [[s, t], [s + size + 6, t], [s + size + 6, t + size + 6], [s, t + size]])} fill="#2E3470" fillOpacity={ghost ? 0.06 : 0.16} filter="url(#bld-blur-m)" transform={`translate(0 ${-base})`} />
      <polygon points={solid(o, [[s + size, t, base], [s + size, t + size, base], [s + size, t + size, top], [s + size, t, top]])} fill={ghost ? '#FFFFFF' : '#D3D6E8'} fillOpacity={ghost ? 0.4 : 1} />
      <polygon points={face(s, s + size, base, top)} fill={ghost ? '#FFFFFF' : faculty ? '#DFE2EE' : '#EBEBEB'} fillOpacity={ghost ? 0.5 : 1} />
      <polygon points={solid(o, [[s, t, top], [s + size, t, top], [s + size, t + size, top], [s, t + size, top]])} fill="#FFFFFF" fillOpacity={ghost ? 0.6 : 1} className={ghost ? 'lot-ghost' : undefined} />
      {!ghost && kind === 'gym' && (
        <>
          {/* Glass front with its frames, a bag hanging behind it, the sign band, a unit on the roof */}
          <polygon points={face(s + 3, s + size - 3, base + 2, top - 8)} fill="#3B4250" />
          <polygon points={face(s + 3, s + size - 3, top - 14, top - 8)} fill="#566070" />
          {[s + 11, s + 19].map((ms) => (
            <polygon key={ms} points={face(ms, ms + 0.8, base + 2, top - 8)} fill="#8C95A6" />
          ))}
          <polygon points={face(s + 6, s + 9, base + 6, top - 15)} fill="#FF0A3C" fillOpacity="0.85" />
          <polygon className="lot-cap" points={face(s, s + size, top - 7, top - 2)} />
          <polygon points={solid(o, [[s + 6, t + 6, top], [s + 16, t + 6, top], [s + 16, t + 14, top], [s + 6, t + 14, top]])} fill="#E6E8F1" />
          <polygon points={solid(o, [[s + 6, t + 14, top], [s + 16, t + 14, top], [s + 16, t + 14, top + 5], [s + 6, t + 14, top + 5]])} fill="#D7DAE8" />
          <polygon points={solid(o, [[s + 6, t + 6, top + 5], [s + 16, t + 6, top + 5], [s + 16, t + 14, top + 5], [s + 6, t + 14, top + 5]])} fill="#F7F8FC" />
        </>
      )}
      {!ghost && kind === 'campus' && faculty && (
        <>
          {/* Four columns, the entablature and the pediment, a flag on the roof */}
          {[s + 4, s + 11.5, s + 19, s + 26.5].map((cs) => (
            <polygon key={cs} points={face(cs - 1.4, cs + 1.4, base, top - 6)} fill="#FBFBFE" />
          ))}
          <polygon points={face(s, s + size, top - 6, top)} fill="#F4F5FA" />
          <polygon points={solid(o, [[s - 1, front, top], [s + size + 1, front, top], [s + size / 2, front, top + 10]])} fill="#FFFFFF" stroke="#DADDEB" strokeWidth="0.6" />
          <polygon className="lot-cap" points={solid(o, [[s + 8, front, top + 2], [s + size - 8, front, top + 2], [s + size / 2, front, top + 7]])} />
          <line {...upright(iso(o, s + size - 5, t + 5), top, top + 20)} stroke="#9AA0B8" strokeWidth="0.9" />
          <polygon className="lot-cap" points={solid(o, [[s + size - 5, t + 5, top + 20], [s + size - 5, t + 15, top + 18], [s + size - 5, t + 5, top + 15]])} />
        </>
      )}
      {!ghost && kind === 'campus' && !faculty && (
        <>
          {/* Teaching block: rows of windows, a band in the colour of its stage at the top */}
          {Array.from({ length: Math.max(1, Math.floor((h - 8) / 9)) }, (_, r) => base + 6 + r * 9).flatMap((wh) =>
            [s + 4, s + 12, s + 20].map((ws) => <polygon key={`${ws}-${wh}`} points={face(ws, ws + 6, wh, wh + 4.5)} fill="#C9D6E8" />),
          )}
          <polygon className="lot-cap" points={face(s, s + size, top - 3, top)} />
        </>
      )}
      {!ghost && kind === 'town' && (
        <>
          {/* A pitched roof in the colour of its stage: back slope, gable, front slope */}
          <polygon className="lot-cap lot-roof-back" points={solid(o, [[s, t, top], [s + size, t, top], [s + size, t + size / 2, top + 11], [s, t + size / 2, top + 11]])} />
          <polygon points={solid(o, [[s + size, t, top], [s + size, t + size, top], [s + size, t + size / 2, top + 11]])} fill="#E4E6F1" />
          <polygon className="lot-cap" points={solid(o, [[s, t + size / 2, top + 11], [s + size, t + size / 2, top + 11], [s + size, t + size, top], [s, t + size, top]])} />
          {h > 22 && (
            <>
              <polygon points={face(s + 4, s + 10, top - 9, top - 4)} fill="#C9D6E8" />
              <polygon points={face(s + 21, s + 27, top - 9, top - 4)} fill="#C9D6E8" />
            </>
          )}
        </>
      )}
      {!ghost && kind !== 'gym' && <polygon points={face(s + 12, s + 19, base, base + 10)} fill="#5B6168" />}
      {/* The named ones have someone outside: partying (partners), talking (in discussion), on the phone */}
      {lot.name && !ghost && (
        <g transform={`translate(${iso(o, s + size + 6, t + size - 2)[0].toFixed(1)} ${(iso(o, s + size + 6, t + size - 2)[1] - base).toFixed(1)}) scale(0.62)`}>
          <Person
            origin={[0, 0]}
            s={0}
            t={0}
            look={LOOKS[(Math.round(s + t) / 5) % LOOKS.length | 0]}
            cheer={tone === 'accent'}
            pose={tone === 'muted' || tone === 'alert' ? 'chat' : undefined}
            laugh={tone === 'accent'}
          />
        </g>
      )}
    </g>
  );
}

/** Lit windows of the city at night: a warm band on the face turned to us. */
function CityWindows({ lots, o }: { lots: Lot[]; o: Point }) {
  return (
    <>
      {lots
        .filter((lot) => lot.tone !== 'new')
        .map((lot) => {
          const { s, t, h } = lot;
          const top = 8 + h;
          return (
            <polygon
              key={`${s}-${t}`}
              points={solid(o, [[s + 4, t + LOT, top - 10], [s + LOT - 4, t + LOT, top - 10], [s + LOT - 4, t + LOT, top - 6], [s + 4, t + LOT, top - 6]])}
              fill="#FFE3A3"
              fillOpacity="0.9"
            />
          );
        })}
    </>
  );
}

/**
 * The pipeline as a city: four districts (affiliated, to sign, in discussion, to contact), one
 * building per club, as high as its membership. Known clubs carry a numbered marker, listed under
 * the map; a tap opens the club's card. The city grows with the pipeline.
 */
export function PipelineCity({ project, module, onSelect }: { project: Project; module: Module; onSelect: (name: string) => void }) {
  const { origin: o, box, district, at, counts, lots, kind, n } = cityPlan(project, module);
  const span = district * 2 + STREET;
  const items: SceneItem[] = lots
    .filter((lot) => lot.name)
    .sort((a, b) => ['alert', 'muted', 'new', 'accent'].indexOf(a.tone) - ['alert', 'muted', 'new', 'accent'].indexOf(b.tone))
    .map((lot) => {
      const [x, y] = iso(o, lot.s + LOT / 2, lot.t + LOT / 2);
      return { id: lot.name as string, x, y: y - 8 - lot.h - 14, label: lot.name as string, sub: `${lot.stage} · ${lot.meta ?? ''}`, tone: lot.tone };
    });
  return (
    <SceneFrame
      project={project}
      box={box}
      title={`${project.pipeline.title} en ville`}
      items={items}
      onSelect={onSelect}
      lit={counts.map(({ column }) => {
        const [ds, dt] = at[column.tone];
        return points([o[0], o[1] - 8], [[ds, dt], [ds + district, dt], [ds + district, dt + district], [ds, dt + district]]);
      })}
      art={
        <>
          <polygon points={points(o, [[district, -400], [district + STREET, -400], [district + STREET, span + 400], [district, span + 400]])} fill="url(#bld-asphalt)" />
          <polygon points={points(o, [[-400, district], [span + 400, district], [span + 400, district + STREET], [-400, district + STREET]])} fill="url(#bld-asphalt)" />
          <g fill="none" stroke="#F4F4F4" strokeWidth="1.8" strokeDasharray="14 12">
            <polyline points={points(o, [[district + STREET / 2, -400], [district + STREET / 2, span + 400]])} />
            <polyline points={points(o, [[-400, district + STREET / 2], [span + 400, district + STREET / 2]])} />
          </g>
          {counts.map(({ column }) => {
            const [ds, dt] = at[column.tone];
            return <Slab key={column.name} origin={o} s0={ds} t0={dt} s1={ds + district} t1={dt + district} r={24} h={8} top="#F5F6FA" side="#CDD1E5" />;
          })}
          {counts.map(({ column, count }) => {
            const [ds, dt] = at[column.tone];
            return (
              <FloorText key={column.name} origin={[o[0], o[1] - 8]} s={ds + 14} t={dt + district - 10} size={15}>
                {`${column.name.toUpperCase()} · ${count}`}
              </FloorText>
            );
          })}
          <Tree origin={o} s={span - 18} t={14} size={0.8} base={8} />
          <Tree origin={o} s={14} t={span - 16} size={0.8} base={8} />
          {/* On a campus, each district has its lecture theatre in its right-hand corner */}
          {kind === 'campus' &&
            counts.map(({ column }) => {
              const [ds, dt] = at[column.tone];
              return <Amphitheatre key={`amphi-${column.name}`} o={o} s0={ds + (n - 2) * SLOT} t0={dt} />;
            })}
          {lots.map((lot) => (
            <CityBuilding key={`${lot.s}-${lot.t}`} lot={lot} o={o} kind={kind} />
          ))}
        </>
      }
      lights={<CityWindows lots={lots} o={o} />}
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Ambassadors: a square with a podium for the top three, the others around, each busy.

const LOOKS: Look[] = [
  { skin: SKIN.tan, top: '#1F1F1F', bottom: '#1F1F1F', shoes: '#F4F4F4', head: 'cap', headColor: '#FF0A3C' },
  { skin: SKIN.light, top: '#F4F4F4', bottom: '#2B2B2B', shoes: '#1F1F1F', head: 'long', headColor: '#6B4A32' },
  { skin: SKIN.deep, top: '#B8AE7E', bottom: '#2B2B2B', shoes: '#F4F4F4', head: 'buzz', headColor: '#1F1F1F' },
  { skin: SKIN.rose, top: '#9CC8F2', bottom: '#EFEBE3', shoes: '#F4F4F4', head: 'hair', headColor: '#3A2A20' },
  { skin: SKIN.light, top: '#EFE7D2', bottom: '#2B2B2B', shoes: '#E9DFC8', head: 'bucket', headColor: '#1F1F1F' },
  { skin: SKIN.tan, top: '#2B2B2B', bottom: '#B8AE7E', shoes: '#F4F4F4', head: 'hair', headColor: '#1F1F1F', eyes: 'sunglasses' },
  { skin: SKIN.rose, top: '#F1F2F8', bottom: '#F1F2F8', shoes: '#F4F4F4', head: 'cap', headColor: '#2C4FB8' },
  { skin: SKIN.deep, top: '#FF0A3C', bottom: '#1F1F1F', shoes: '#F4F4F4', head: 'buzz', headColor: '#2A2A2A' },
  { skin: SKIN.light, top: '#1F1F1F', bottom: '#1F1F1F', shoes: '#F4F4F4', head: 'hair', headColor: '#4A3A30', eyes: 'glasses' },
];

// The three steps of the podium (around the square's centre): first in the middle, second on its
// left, third on its right.
const stepsAround = (c: number) => [
  { s: c - 20, t: c - 20, h: 34, rank: 1 },
  { s: c - 20, t: c + 22, h: 24, rank: 2 },
  { s: c + 22, t: c - 20, h: 15, rank: 3 },
];

function Step({ s, t, h, rank, o }: { s: number; t: number; h: number; rank: number; o: Point }) {
  const b = 8;
  const size = 40;
  const [fx, fy] = iso(o, s + size / 2, t + size);
  return (
    <g>
      <polygon points={solid(o, [[s + size, t, b], [s + size, t + size, b], [s + size, t + size, b + h], [s + size, t, b + h]])} fill="#D0D3E6" />
      <polygon points={solid(o, [[s, t + size, b], [s + size, t + size, b], [s + size, t + size, b + h], [s, t + size, b + h]])} fill="#ECEEF6" />
      <polygon points={solid(o, [[s, t, b + h], [s + size, t, b + h], [s + size, t + size, b + h], [s, t + size, b + h]])} fill="#FFFFFF" />
      <polygon className="lot-cap" points={solid(o, [[s, t + size, b + h - 3], [s + size, t + size, b + h - 3], [s + size, t + size, b + h], [s, t + size, b + h]])} />
      <text transform={`matrix(0.866 0.5 0 1 ${fx - 4} ${fy - b - h / 2 + 4})`} fontSize="11" fontWeight="800" fill="#9A9A9A">
        {rank}
      </text>
    </g>
  );
}

/**
 * Ambassadors on a square: the three who brought the most sign-ups on the podium filming
 * themselves, the others around with their phone, chatting two by two or napping (the one to
 * chase up), the one still in discussion as a ghost. The square grows with the team.
 */
export function AmbassadorsPlaza({ project, module, onSelect }: { project: Project; module: Module; onSelect: (name: string) => void }) {
  if (module.view.kind !== 'table') return null;
  const rows = module.view.rows.map(([name, club, sign, status]) => ({ name, club, sign: parseInt(sign, 10) || 0, status }));
  const ranked = [...rows].sort((a, b) => b.sign - a.sign);
  const podium = ranked.slice(0, 3);
  const others = ranked.slice(3);
  const totalKpi = parseInt(module.kpis.find((k) => normalize(k.label).includes('ambassadeur'))?.value ?? '', 10);
  const total = Number.isFinite(totalKpi) ? totalKpi : rows.length;
  const unnamed = Math.max(total - rows.length, 0);
  const crowd = others.length + unnamed;

  // The square grows with the crowd: people on rings around the podium.
  const size = Math.max(340, 260 + Math.ceil(crowd / 8) * 90);
  const c = size / 2;
  const o: Point = [0.866 * size + 60, 56];
  const box: [number, number, number, number] = [0, 0, 0.866 * size * 2 + 120, size + 110];
  const spot = (i: number): Point => {
    const ring = Math.floor(i / 8);
    const radius = 100 + ring * 54;
    const angle = (i % 8) * (Math.PI / 4) + ring * 0.4 + 0.35;
    return [c + radius * Math.cos(angle), c + radius * Math.sin(angle)];
  };
  const steps = stepsAround(c);

  const people = [
    ...podium.map((row, i) => ({ key: row.name, s: steps[i].s + 20, t: steps[i].t + 20, lift: 8 + steps[i].h, look: LOOKS[i], cheer: i === 0, pose: 'selfie' as const, ghost: false, row, rank: i + 1 })),
    ...others.map((row, i) => {
      const late = normalize(row.status).includes('relancer');
      const [s, t] = spot(i);
      return { key: row.name, s, t, lift: 8, look: LOOKS[3 + (i % 6)], cheer: false, pose: late ? ('nap' as const) : undefined, ghost: row.sign === 0, row, rank: 0 };
    }),
    ...Array.from({ length: unnamed }, (_, i) => {
      const [s, t] = spot(others.length + i);
      // Two by two they chat; the others are on their phone
      const pose = i < 2 ? ('chat' as const) : ('selfie' as const);
      return { key: `anon-${i}`, s, t, lift: 8, look: LOOKS[(5 + i) % LOOKS.length], cheer: false, pose, ghost: false, row: undefined, rank: 0 };
    }),
  ].sort((a, b) => a.s + a.t - (b.s + b.t));

  const items: SceneItem[] = ranked.map((row) => {
    const person = people.find((p) => p.key === row.name)!;
    const [x, y] = iso(o, person.s, person.t);
    const late = normalize(row.status).includes('relancer');
    const tone: PipelineTone = person.rank > 0 ? 'accent' : late ? 'alert' : row.sign === 0 ? 'new' : 'muted';
    return { id: row.name, x, y: y - person.lift - 40, label: row.name, sub: `${row.club} · ${row.status}`, tone, value: `${row.sign}` };
  });

  return (
    <SceneFrame
      project={project}
      box={box}
      title="Les ambassadeurs sur la place"
      zoom={1.45}
      items={items}
      onSelect={onSelect}
      hood={{ ground: o, size: [size, size] }}
      lit={[points([o[0], o[1] - 8], [[0, 0], [size, 0], [size, size], [0, size]])]}
      art={
        <>
          <Slab origin={o} s0={0} t0={0} s1={size} t1={size} r={30} h={8} top="#F5F6FA" side="#CDD1E5" shadow={0.16} />
          {/* The paved round in the middle, a lighter ring of stone round the podium */}
          {(() => {
            const [cx, cy] = iso(o, c, c);
            const round = (r: number) => ({ cx, cy: cy - 8, rx: r * 1.2247, ry: r * 0.7071 });
            return (
              <g>
                <ellipse {...round(size * 0.42)} fill="#ECEEF6" stroke="#DFE2EF" strokeWidth="1.2" />
                <ellipse {...round(size * 0.42 - 8)} fill="none" stroke="#E4E7F2" strokeWidth="0.8" />
                <ellipse {...round(62)} fill="#F7F8FC" stroke="#DFE2EF" strokeWidth="1" />
              </g>
            );
          })()}
          {/* Benches on each side, and a tree in a round planter in each corner */}
          {[
            { s0: 14, s1: 24, t0: c - 26, t1: c + 26 },
            { s0: c - 26, s1: c + 26, t0: 14, t1: 24 },
          ].map((bench) => (
            <Box3 key={`${bench.s0}-${bench.t0}`} o={[o[0], o[1] - 8]} {...bench} h1={9} />
          ))}
          {([[34, 34], [size - 34, 34], [34, size - 34]] as Point[]).map(([ps, pt]) => (
            <g key={`${ps}-${pt}`}>
              <Slab origin={[o[0], o[1] - 8]} s0={ps - 14} t0={pt - 14} s1={ps + 14} t1={pt + 14} r={13} h={8} top="#E3E6F0" side="#CDD1E5" shadow={0.08} />
              <Tree origin={o} s={ps} t={pt} size={0.85} base={16} />
            </g>
          ))}
          {steps.map((step) => (
            <Step key={step.rank} {...step} o={o} />
          ))}
          {people.map((person) => (
            <g key={person.key} opacity={person.ghost ? 0.45 : 1}>
              <Person origin={[o[0], o[1] - person.lift]} s={person.s} t={person.t} look={person.look} cheer={person.cheer} pose={person.pose} laugh={person.rank > 0} />
            </g>
          ))}
          <Box3 o={[o[0], o[1] - 8]} s0={size - 24} s1={size - 14} t0={c - 26} t1={c + 26} h1={9} />
          <Box3 o={[o[0], o[1] - 8]} s0={c - 26} s1={c + 26} t0={size - 24} t1={size - 14} h1={9} />
          <Slab origin={[o[0], o[1] - 8]} s0={size - 48} t0={size - 48} s1={size - 20} t1={size - 20} r={13} h={8} top="#E3E6F0" side="#CDD1E5" shadow={0.08} />
          <Tree origin={o} s={size - 34} t={size - 34} size={0.85} base={16} />
        </>
      }
    />
  );
}

// ---------------------------------------------------------------------------------------------
// App Store: the app's store page (icon, figures, ratings), then the reviews as cards.

const stars = (n: number) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

/**
 * The App Store module as its store page: the icon and name, a strip of key figures (as on the
 * App Store), then the ratings: the average in big and how the stars spread, from the reviews.
 */
export function AppStorePanel({ project, module, rating, icon }: { project: Project; module: Module; rating: string; icon: string }) {
  if (module.view.kind !== 'table') return null;
  const notes = module.view.rows.map(([, note]) => parseInt(note, 10) || 0).filter((n) => n > 0);
  const spread = [5, 4, 3, 2, 1].map((n) => ({ n, count: notes.filter((x) => x === n).length }));
  const most = Math.max(1, ...spread.map((row) => row.count));
  const waiting = module.view.rows.filter(([, , , status]) => normalize(status).includes('repondre')).length;
  return (
    <section className="store" data-project={project.id} aria-label={`${project.name} sur l'App Store`}>
      <header className="store-head">
        <span className="store-icon">
          <img src={icon} alt="" />
        </span>
        <div className="store-title">
          <h3 className="store-name">{project.name}</h3>
          <p className="store-tag">{project.tag}</p>
          <p className="store-note">Avis d'exemple : les vrais arriveront avec App Store Connect.</p>
        </div>
      </header>

      <dl className="store-strip">
        {module.kpis.map((kpi) => (
          <div key={kpi.label} className="store-fact">
            <dt>{kpi.label}</dt>
            <dd>{kpi.value}</dd>
            <dd className="store-fact-delta">{kpi.delta}</dd>
          </div>
        ))}
      </dl>

      <div className="store-ratings">
        <h4 className="store-subhead">Notes et avis</h4>
        <div className="store-score">
          <span className="store-score-num">{rating}</span>
          <span className="store-score-of">sur 5</span>
        </div>
        <ul className="store-bars" aria-label="Répartition des étoiles">
          {spread.map(({ n, count }) => (
            <li key={n}>
              <span className="store-bars-stars" aria-label={`${n} étoiles`}>
                {'★'.repeat(n)}
              </span>
              <span className="store-bars-track">
                <span style={{ width: `${(count / most) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
        <p className="store-count">
          {notes.length} avis
          {waiting > 0 && <span className="store-waiting">{waiting} à répondre</span>}
        </p>
      </div>
    </section>
  );
}

/** Reviews as cards: stars, the quote, the date, its status, and an answer button for those waiting. */
export function ReviewCards({ rows, onOpen, onAction }: { rows: string[][]; onOpen: (name: string) => void; onAction: (label: string) => void }) {
  return (
    <ul className="reviews">
      {rows.map(([text, note, date, status]) => {
        const n = parseInt(note, 10) || 0;
        const waiting = normalize(status).includes('repondre');
        return (
          <li key={text} className={`review${waiting ? ' review--waiting' : ''}`}>
            <div className="review-top">
              <span className="review-stars" aria-label={`${n} étoiles sur 5`}>
                {stars(n)}
              </span>
              <span className="review-date">{date}</span>
            </div>
            <button type="button" className="review-text" onClick={() => onOpen(text)}>
              « {text} »
            </button>
            <div className="review-foot">
              <span className={`review-status${waiting ? ' review-status--waiting' : ''}`}>{status}</span>
              {waiting && (
                <button type="button" className="review-answer" onClick={() => onAction(`Répondre : ${text}`)}>
                  Répondre
                </button>
              )}
            </div>
          </li>
        );
      })}
      {rows.length === 0 && <li className="tool-empty">Aucun avis ne correspond.</li>}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------
// Revenue: one tower per month, as high as its takings, and the golden dice that sell the most.

const euros = (text: string) => parseFloat(text.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;

/**
 * The Revenus module as a scene: a bank in white clay. Against its back wall, one safe per month
 * (oldest on the left), as tall as its takings, the current month's dial in the project's colour;
 * a counter with the banker and a client, a guard, and a heap of golden dice as big as their share.
 */
export function RevenueScene({ project, module, onSelect }: { project: Project; module: Module; onSelect: (name: string) => void }) {
  if (module.view.kind !== 'table') return null;
  const months = [...module.view.rows].reverse().map(([month, ca, buys, trend]) => ({ month, ca, value: euros(ca), buys, trend }));
  const max = Math.max(...months.map((m) => m.value), 1);
  const shareKpi = module.kpis.find((k) => normalize(k.label).includes('dore'));
  const share = shareKpi ? parseInt(shareKpi.value, 10) || 0 : 0;
  const size = 360;
  const o: Point = [0.866 * size + 60, 150];
  const box: [number, number, number, number] = [0, 0, 0.866 * size * 2 + 120, size + 200];
  const b = 8; // top of the plate
  const k = 8; // wall thickness
  const wall = 140;
  // Safes in a row against the back wall, oldest month on the left
  const w = 62;
  const d = 46;
  const gap = Math.min(22, (size - 40 - months.length * w) / Math.max(1, months.length - 1));
  const safes = months.map((m, i) => ({ ...m, s: 30 + i * (w + gap), t: k + 8, h: 42 + (m.value / max) * 64, now: i === months.length - 1 }));
  const items: SceneItem[] = [...safes].reverse().map((safe) => {
    const [x, y] = iso(o, safe.s + w / 2, safe.t + d / 2);
    return { id: safe.month, x, y: y - b - safe.h - 4, label: safe.month, sub: `${safe.buys} achats · ${safe.trend}`, tone: safe.now ? 'accent' : 'muted', value: safe.ca };
  });
  // Golden dice: one per 10 % of sales, in a small heap
  const dice = Math.max(1, Math.round(share / 10));
  const now = safes[safes.length - 1];
  const heapAt: Point = [now ? now.s + 4 : 200, k + 8 + d + 18];
  const heap: [number, number, number][] = Array.from({ length: dice }, (_, i) => {
    const layer = i < 3 ? 0 : i < 5 ? 1 : 2;
    const index = layer === 0 ? i : layer === 1 ? i - 3 : i - 5;
    return [heapAt[0] + index * 18 + layer * 9, heapAt[1] + (index % 2) * 10 + layer * 6, 8 + layer * 14];
  });
  // A circle drawn flat on the left wall (a plane of constant s): t to the left, height up
  const onLeftWall = (t: number, h: number) => {
    const [x, y] = iso(o, k, t);
    return `matrix(-0.866 0.5 0 -1 ${x.toFixed(1)} ${(y - h).toFixed(1)})`;
  };
  // Marble floor: a checkerboard of slightly darker slabs
  const tile = (size - k - 12) / 11;
  const tiles = Array.from({ length: 121 }, (_, i) => [i % 11, Math.floor(i / 11)]).filter(([a, z]) => (a + z) % 2 === 0);
  const P: Point = [o[0], o[1] - b];
  // A brass post of the queue, and the velvet rope between two of them
  const post = ([s, t]: Point) => {
    const [x, y] = iso(P, s, t);
    return (
      <g key={`${s}-${t}`}>
        <ellipse cx={x} cy={y} rx="3.4" ry="1.4" fill="#C9A23A" />
        <line x1={x} y1={y} x2={x} y2={y - 17} stroke="#C9A23A" strokeWidth="1.8" />
        <circle cx={x} cy={y - 18} r="2" fill="#E8C35A" />
      </g>
    );
  };
  const rope = ([s1, t1]: Point, [s2, t2]: Point) => {
    const [x1, y1] = iso(P, s1, t1);
    const [x2, y2] = iso(P, s2, t2);
    return <path d={`M${x1},${y1 - 16} Q${(x1 + x2) / 2},${(y1 + y2) / 2 - 6} ${x2},${y2 - 16}`} fill="none" className="accent-stroke" strokeWidth="1.8" strokeLinecap="round" />;
  };
  // A plant in a white pot
  const plant = ([s, t]: Point) => (
    <g key={`${s}-${t}`}>
      <Box3 o={P} s0={s - 7} s1={s + 7} t0={t - 7} t1={t + 7} h1={12} />
      <Tree origin={o} s={s} t={t} size={0.55} base={b + 12} />
    </g>
  );
  // A circle drawn flat on a safe's door (a plane of constant t): s to the right, height up
  const onDoor = (s: number, t: number, h: number) => {
    const [x, y] = iso(o, s, t);
    return `matrix(0.866 0.5 0 -1 ${x.toFixed(1)} ${(y - h).toFixed(1)})`;
  };
  const [signX, signY] = iso(o, 40, k);
  const banker: Look = { skin: SKIN.rose, top: '#2B2B2B', bottom: '#2B2B2B', shoes: '#1F1F1F', head: 'hair', headColor: '#4A3A30', eyes: 'glasses' };
  const client: Look = { skin: SKIN.tan, top: '#F4F4F4', bottom: '#6FA8DC', shoes: '#F2C14E', head: 'cap', headColor: '#3E8E5E', holds: 'phone' };
  const guard: Look = { skin: SKIN.deep, top: '#1F1F1F', bottom: '#1F1F1F', shoes: '#1F1F1F', head: 'cap', headColor: '#1F1F1F', eyes: 'sunglasses' };

  return (
    <SceneFrame
      project={project}
      box={box}
      title="Les revenus, mois par mois"
      items={items}
      onSelect={onSelect}
      hood={{ ground: o, size: [size, size] }}
      lit={[solid(o, [[0, size, wall + b], [0, 0, wall + b], [size, 0, wall + b], [size, 0, 0], [size, size, 0], [0, size, 0]])]}
      lights={
        <>
          {/* The counter lamp, a light over the vault and one on this month's safe */}
          <ellipse cx={iso(P, 130, 218)[0]} cy={iso(P, 130, 218)[1] - 30} rx="26" ry="14" fill="#FFE1A0" fillOpacity="0.45" filter="url(#bld-blur-m)" />
          <ellipse cx={iso(o, k, 116)[0] + 10} cy={iso(o, k, 116)[1] - b - 66} rx="60" ry="56" fill="#FFF1CC" fillOpacity="0.22" filter="url(#bld-blur-m)" />
          {now && <ellipse cx={iso(P, now.s + w / 2, now.t + d)[0]} cy={iso(P, now.s + w / 2, now.t + d)[1] - now.h / 2} rx="40" ry="44" fill="#FFF1CC" fillOpacity="0.2" filter="url(#bld-blur-m)" />}
        </>
      }
      art={
        <>
          <Slab origin={o} s0={0} t0={0} s1={size} t1={size} r={32} h={b} top="#F7F8FC" side="#CDD1E5" shadow={0.16} />
          {/* Marble floor */}
          {tiles.map(([a, z]) => (
            <polygon key={`${a}-${z}`} points={points(P, [[k + a * tile, k + z * tile], [k + (a + 1) * tile, k + z * tile], [k + (a + 1) * tile, k + (z + 1) * tile], [k + a * tile, k + (z + 1) * tile]])} fill="#ECEEF6" />
          ))}
          {/* The bank's two back walls, a skirting in the project's colour, and its name on the right one */}
          <g stroke="#DADDED" strokeWidth="0.8" strokeLinejoin="round">
            <polygon points={solid(o, [[k, k, b], [k, size - 24, b], [k, size - 24, b + wall], [k, k, b + wall]])} fill="url(#bld-wall-left)" />
            <polygon points={solid(o, [[0, size - 24, b], [k, size - 24, b], [k, size - 24, b + wall], [0, size - 24, b + wall]])} fill="url(#bld-wall-right)" />
            <polygon points={solid(o, [[0, 0, b + wall], [k, k, b + wall], [k, size - 24, b + wall], [0, size - 24, b + wall]])} fill="#FFFFFF" />
            <polygon points={solid(o, [[k, k, b], [size - 24, k, b], [size - 24, k, b + wall], [k, k, b + wall]])} fill="url(#bld-wall-right)" />
            <polygon points={solid(o, [[size - 24, 0, b], [size - 24, k, b], [size - 24, k, b + wall], [size - 24, 0, b + wall]])} fill="url(#bld-wall-left)" />
            <polygon points={solid(o, [[0, 0, b + wall], [size - 24, 0, b + wall], [size - 24, k, b + wall], [k, k, b + wall]])} fill="#FFFFFF" />
          </g>
          <polygon className="lot-cap" points={solid(o, [[k, k, b], [k, size - 24, b], [k, size - 24, b + 5], [k, k, b + 5]])} />
          <polygon className="lot-cap" points={solid(o, [[k, k, b], [size - 24, k, b], [size - 24, k, b + 5], [k, k, b + 5]])} />
          {/* Two fluted pilasters on each wall */}
          {[60, 290].map((ps) => (
            <g key={`ps-${ps}`}>
              <polygon points={solid(o, [[ps, k, b], [ps + 14, k, b], [ps + 14, k, b + wall - 8], [ps, k, b + wall - 8]])} fill="#F7F8FC" stroke="#DADDED" strokeWidth="0.6" />
              {[4, 7, 10].map((f) => (
                <line key={f} {...upright(iso(o, ps + f, k), b + 6, b + wall - 14)} stroke="#E1E3EF" strokeWidth="0.8" />
              ))}
            </g>
          ))}
          <text
            transform={`matrix(0.866 0.5 0 1 ${signX.toFixed(1)} ${(signY - b - wall + 24).toFixed(1)})`}
            fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif"
            fontWeight="700"
            fontSize="17"
            letterSpacing="5"
            fill="#2B2B2B"
          >
            {`BANQUE ${project.name.toUpperCase()}`}
          </text>

          {/* The vault door, round, set in the left wall: frame, bolts, the wheel to open it */}
          <g transform={onLeftWall(116, b + 66)}>
            <circle r="52" fill="#D9DCEA" />
            <circle r="46" cx="-2" cy="-2" fill="#C9CDDD" />
            <circle r="44" fill="#EEF0F6" stroke="#C4C8DA" strokeWidth="1.4" />
            <circle r="34" fill="none" stroke="#D3D6E4" strokeWidth="2.4" />
            {Array.from({ length: 16 }, (_, i) => (
              <circle key={i} cx={39 * Math.cos((i * Math.PI) / 8)} cy={39 * Math.sin((i * Math.PI) / 8)} r="1.7" fill="#BFC4D6" />
            ))}
            <g stroke="#8C919A" strokeWidth="2.2" strokeLinecap="round">
              <circle r="14" fill="none" />
              {[0, 1, 2, 3, 4, 5].map((spoke) => (
                <line key={spoke} x1="0" y1="0" x2={19 * Math.cos((spoke * Math.PI) / 3)} y2={19 * Math.sin((spoke * Math.PI) / 3)} />
              ))}
            </g>
            {[0, 1, 2, 3, 4, 5].map((spoke) => (
              <circle key={spoke} cx={20 * Math.cos((spoke * Math.PI) / 3)} cy={20 * Math.sin((spoke * Math.PI) / 3)} r="2.4" fill="#A7ACB8" />
            ))}
            <circle r="5" className="lot-cap" />
            <rect x="44" y="-16" width="7" height="32" rx="2" fill="#C4C8DA" />
          </g>

          {/* The safes: a steel box, its door with hinges, a dial and a three-spoke handle */}
          {safes.map((safe) => {
            const { s, t, h } = safe;
            const front = t + d;
            const [hx, hy] = iso(o, s + w * 0.5, front);
            return (
              <g key={safe.month} className={safe.now ? 'safe safe--now' : 'safe'}>
                <polygon points={points(o, [[s, t], [s + w + 12, t], [s + w + 12, front + 10], [s, front]])} fill="#2E3470" fillOpacity="0.18" filter="url(#bld-blur-m)" transform={`translate(0 ${-b})`} />
                <Box3 o={[o[0], o[1] - b]} s0={s} s1={s + w} t0={t} t1={front} h1={h} top="#F4F5FA" />
                {/* Door, slightly proud of the front, and its two hinges */}
                <polygon points={solid(o, [[s + 6, front + 1, b + 6], [s + w - 6, front + 1, b + 6], [s + w - 6, front + 1, b + h - 6], [s + 6, front + 1, b + h - 6]])} fill="#F2F3F8" stroke="#CDD1E5" strokeWidth="0.8" />
                <polygon points={solid(o, [[s + 3, front + 1, b + h * 0.25], [s + 7, front + 1, b + h * 0.25], [s + 7, front + 1, b + h * 0.25 + 8], [s + 3, front + 1, b + h * 0.25 + 8]])} fill="#B9BED3" />
                <polygon points={solid(o, [[s + 3, front + 1, b + h * 0.7], [s + 7, front + 1, b + h * 0.7], [s + 7, front + 1, b + h * 0.7 - 8], [s + 3, front + 1, b + h * 0.7 - 8]])} fill="#B9BED3" />
                <g transform={onDoor(s + w * 0.5, front + 1, b + h * 0.58)}>
                  <circle r="12" className={safe.now ? 'lot-cap' : 'tower-cap'} />
                  <circle r="8.6" fill="#FFFFFF" />
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((tick) => (
                    <line key={tick} x1="0" y1="7.4" x2="0" y2="8.4" stroke="#9AA0B8" strokeWidth="0.7" transform={`rotate(${tick * 30})`} />
                  ))}
                  <circle r="3" fill="#D3D6E8" stroke="#9AA0B8" strokeWidth="0.6" />
                </g>
                <g transform={onDoor(s + w * 0.5, front + 1, b + h * 0.24)} stroke="#8C919A" strokeWidth="1.6" strokeLinecap="round">
                  <line x1="0" y1="0" x2="0" y2="6" />
                  <line x1="0" y1="0" x2="5.2" y2="-3" />
                  <line x1="0" y1="0" x2="-5.2" y2="-3" />
                </g>
                <text x={hx} y={hy - b + 16} textAnchor="middle" fontSize="9" fontWeight="700" letterSpacing="1.4" fill="#9AA0B8" fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif">
                  {safe.month.slice(0, 4).toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* The guard, by the vault */}
          <Person origin={P} s={40} t={178} look={guard} />

          {/* The counter: the banker behind a glass screen, a lamp and a bell, a strip in the project's colour */}
          <Person origin={P} s={92} t={196} look={banker} laugh />
          <Box3 o={P} s0={52} s1={140} t0={206} t1={228} h1={26} top="#F7F8FC" />
          <polygon className="lot-cap" points={solid(o, [[52, 228, b + 18], [140, 228, b + 18], [140, 228, b + 21], [52, 228, b + 21]])} />
          <polygon points={solid(o, [[54, 209, b + 26], [138, 209, b + 26], [138, 209, b + 52], [54, 209, b + 52]])} fill="#DCE6F5" fillOpacity="0.38" stroke="#C3CDE2" strokeWidth="0.8" />
          {[82, 110].map((ms) => (
            <line key={ms} {...upright(iso(o, ms, 209), b + 26, b + 52)} stroke="#C3CDE2" strokeWidth="1" />
          ))}
          {(() => {
            const [lx, ly] = iso(P, 130, 218);
            const [bx, by] = iso(P, 66, 220);
            return (
              <g>
                <line x1={lx} y1={ly - 26} x2={lx} y2={ly - 40} stroke="#C9A23A" strokeWidth="1.4" />
                <path d={`M${lx - 6},${ly - 39} Q${lx},${ly - 47} ${lx + 6},${ly - 39} Z`} className="lot-cap" />
                <path d={`M${bx - 3.4},${by - 26} A3.4 3 0 0 1 ${bx + 3.4},${by - 26} Z`} fill="#E8C35A" />
                <circle cx={bx} cy={by - 29.4} r="0.9" fill="#C9A23A" />
              </g>
            );
          })()}

          {/* The queue: a carpet in the project's colour between brass posts and velvet ropes */}
          <polygon className="lot-cap" fillOpacity="0.9" points={points(P, [[78, 230], [114, 230], [114, size - 16], [78, size - 16]])} />
          <polygon fill="none" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="0.8" points={points(P, [[81, 233], [111, 233], [111, size - 19], [81, size - 19]])} />
          {rope([66, 244], [66, 296])}
          {post([66, 244])}
          {post([66, 296])}
          <Person origin={P} s={96} t={312} look={{ skin: SKIN.light, top: '#9CC8F2', bottom: '#2B2B2B', shoes: '#F4F4F4', head: 'long', headColor: '#8A5A3C', holds: 'phone' }} />
          <Person origin={P} s={96} t={258} look={client} laugh />
          {rope([126, 244], [126, 296])}
          {post([126, 244])}
          {post([126, 296])}

          {plant([330, 120])}
          {plant([330, 318])}

          {heap.map(([hs, ht, hh], i) => (
            <g key={i}>
              <polygon points={solid(o, [[hs + 14, ht, hh], [hs + 14, ht + 14, hh], [hs + 14, ht + 14, hh + 14], [hs + 14, ht, hh + 14]])} fill="#D9A92E" />
              <polygon points={solid(o, [[hs, ht + 14, hh], [hs + 14, ht + 14, hh], [hs + 14, ht + 14, hh + 14], [hs, ht + 14, hh + 14]])} fill="#F2C14E" />
              <polygon points={solid(o, [[hs, ht, hh + 14], [hs + 14, ht, hh + 14], [hs + 14, ht + 14, hh + 14], [hs, ht + 14, hh + 14]])} fill="#FFDB7A" />
              <circle cx={iso(o, hs + 7, ht + 7)[0]} cy={iso(o, hs + 7, ht + 7)[1] - hh - 14} r="1.6" fill="#8A6A12" />
            </g>
          ))}
        </>
      }
    />
  );
}

/** A vertical line standing at a floor point, from height h0 to h1 (for a <line>). */
function upright([x, y]: Point, h0: number, h1: number) {
  return { x1: x, y1: y - h0, x2: x, y2: y - h1 };
}

/** Months as cards: takings in big, purchases, trend, and a bar against the best month. */
export function RevenueCards({ rows, onOpen }: { rows: string[][]; onOpen: (name: string) => void }) {
  const max = Math.max(...rows.map(([, ca]) => euros(ca)), 1);
  return (
    <ul className="revenue-cards">
      {rows.map(([month, ca, buys, trend], i) => (
        <li key={month} className={`revenue${i === 0 ? ' revenue--now' : ''}`}>
          <button type="button" className="revenue-open" onClick={() => onOpen(month)}>
            <span className="revenue-month">{month}</span>
            <span className="revenue-ca">{ca}</span>
            <span className="revenue-bar" aria-hidden="true">
              <span style={{ width: `${(euros(ca) / max) * 100}%` }} />
            </span>
            <span className="revenue-foot">
              <span>{buys} achats</span>
              <span className={`revenue-trend revenue-trend--${normalize(trend)}`}>{trend}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------
// Posts: a content studio, with the week's posts floating around as thumbnails.

/** A post thumbnail's shape: tall for reels, TikToks and stories, square for carousels. */
const isTall = (format: string) => !normalize(format).includes('carrousel');

/** A white clay box standing on the plate (desk, platform): two faces and its top. */
function Box3({ o, s0, s1, t0, t1, h0 = 0, h1, top = '#FFFFFF' }: { o: Point; s0: number; s1: number; t0: number; t1: number; h0?: number; h1: number; top?: string }) {
  return (
    <g>
      <polygon points={solid(o, [[s1, t0, h0], [s1, t1, h0], [s1, t1, h1], [s1, t0, h1]])} fill="#D3D6E8" />
      <polygon points={solid(o, [[s0, t1, h0], [s1, t1, h0], [s1, t1, h1], [s0, t1, h1]])} fill="#EBEDF5" />
      <polygon points={solid(o, [[s0, t0, h1], [s1, t0, h1], [s1, t1, h1], [s0, t1, h1]])} fill={top} />
    </g>
  );
}

/** A softbox on its stand: a white glowing panel turned towards the subject. */
function Softbox({ o, s, t, b }: { o: Point; s: number; t: number; b: number }) {
  const [x, y] = iso(o, s, t);
  const foot = y - b;
  return (
    <g>
      <ellipse cx={x + 3} cy={foot + 2} rx="9" ry="3.4" fill="#2E3470" fillOpacity="0.14" filter="url(#bld-blur-s)" />
      <line x1={x} y1={foot} x2={x - 7} y2={foot + 5} stroke="#8E93AB" strokeWidth="1.4" />
      <line x1={x} y1={foot} x2={x + 7} y2={foot + 5} stroke="#8E93AB" strokeWidth="1.4" />
      <line x1={x} y1={foot} x2={x} y2={foot - 58} stroke="#8E93AB" strokeWidth="1.6" />
      <polygon points={`${x - 13},${foot - 82} ${x + 13},${foot - 70} ${x + 13},${foot - 46} ${x - 13},${foot - 58}`} fill="#3A3F52" />
      <polygon points={`${x - 11},${foot - 79} ${x + 11},${foot - 69} ${x + 11},${foot - 49} ${x - 11},${foot - 59}`} className="softbox-panel" fill="#FFFFFF" />
    </g>
  );
}

/**
 * The Publications module as a production studio: a paper backdrop on stands with the project's
 * logo, the boxer posing on a low platform, a photographer shooting him between two softboxes,
 * and an editing corner (desk, iMac with a timeline, keyboard, an editor on a stool). The week's
 * posts float around as thumbnails in their format, with their day; those to approve are orange.
 */
export function StudioScene({ project, module, icon, onSelect }: { project: Project; module: Module; icon: string; onSelect: (name: string) => void }) {
  if (module.view.kind !== 'table') return null;
  const posts = module.view.rows.map(([title, format, date, status]) => ({ title, format, date, status }));
  const size = 380;
  const o: Point = [0.866 * size + 60, 130];
  const box: [number, number, number, number] = [0, 0, 0.866 * size * 2 + 120, size + 180];
  const b = 8;
  const ob: Point = [o[0], o[1] - b];
  // Backdrop along the back left edge, logo in the middle
  const [lx, ly] = iso(o, 30, 262);
  // Thumbnails out of the way of the set: front left and along the right edge
  const spots: Point[] = [
    [60, 330],
    [170, 350],
    [345, 150],
    [345, 60],
    [300, 350],
  ];
  const items: SceneItem[] = posts.map((post, i) => {
    const [s, t] = spots[i % spots.length];
    const [x, y] = iso(o, s, t);
    const waiting = normalize(post.status).startsWith('a ');
    return { id: post.title, x, y: y - (isTall(post.format) ? 92 : 78), label: post.title, sub: `${post.format} · ${post.date} · ${post.status}`, tone: waiting ? 'alert' : 'accent' };
  });
  // Desk with the iMac, front right
  const desk = { s0: 238, s1: 318, t0: 238, t1: 286 };
  const [mx, my] = iso(o, 262, desk.t1 - 14);

  return (
    <SceneFrame
      project={project}
      box={box}
      title="Le studio de production et les contenus de la semaine"
      items={items}
      onSelect={onSelect}
      hood={{ ground: o, size: [size, size] }}
      lit={[
        points(ob, [[0, 0], [size, 0], [size, size], [0, size]]),
        solid(o, [[18, 40, b], [18, 320, b], [18, 320, b + 140], [18, 40, b + 140]]),
      ]}
      art={
        <>
          <Slab origin={o} s0={0} t0={0} s1={size} t1={size} r={32} h={b} top="#F5F6FA" side="#CDD1E5" shadow={0.16} />
          <FloorText origin={ob} s={30} t={size - 16} size={16}>
            {`STUDIO · ${posts.length} CONTENUS CETTE SEMAINE`}
          </FloorText>

          {/* Paper backdrop on two stands, curving onto the floor, the logo on it */}
          <line {...lineOf(iso(o, 16, 34), iso(o, 16, 34), b)} />
          <line x1={iso(o, 14, 34)[0]} y1={iso(o, 14, 34)[1] - b} x2={iso(o, 14, 34)[0]} y2={iso(o, 14, 34)[1] - b - 146} stroke="#8E93AB" strokeWidth="2" />
          <line x1={iso(o, 14, 326)[0]} y1={iso(o, 14, 326)[1] - b} x2={iso(o, 14, 326)[0]} y2={iso(o, 14, 326)[1] - b - 146} stroke="#8E93AB" strokeWidth="2" />
          <polygon points={solid(o, [[16, 44, b], [16, 316, b], [16, 316, b + 138], [16, 44, b + 138]])} fill="#FBFBFE" stroke="#E2E4F0" />
          <polygon points={solid(o, [[16, 44, b], [16, 316, b], [92, 316, b], [92, 44, b]])} fill="#FFFFFF" />
          <line {...lineOf(iso(o, 14, 30), iso(o, 14, 330), b + 144)} stroke="#8E93AB" strokeWidth="3" strokeLinecap="round" />
          {/* The project's name in text on the paper, like the gym's wall (RNDS: Kode Mono and its red dot) */}
          <g transform={`matrix(0.866 -0.5 0 1 ${lx} ${ly - b - 60})`}>
            {project.id === 'rnds' ? (
              <>
                <text fontFamily="'Kode Mono', ui-monospace, monospace" fontWeight="700" fontSize="40" fill="#000000" textLength="104" lengthAdjust="spacing">
                  RNDS
                </text>
                <circle cx="112" cy="-28" r="4.2" fill="#FF0A3C" />
                <text y="18" fontFamily="'Kode Mono', ui-monospace, monospace" fontSize="10" fill="#8E93AB" letterSpacing="2.6">
                  STUDIO
                </text>
              </>
            ) : (
              <image href={icon} x="30" y="-48" width="48" height="48" />
            )}
          </g>

          {/* Low platform with the boxer posing */}
          <Box3 o={o} s0={70} s1={150} t0={140} t1={220} h0={b} h1={b + 8} top="#FFFFFF" />
          <Person origin={[o[0], o[1] - b - 8]} s={110} t={180} look={{ skin: SKIN.tan, top: '#1F1F1F', bottom: '#FF0A3C', shoes: '#F4F4F4', head: 'buzz', headColor: '#2A2A2A', shorts: true, gloves: '#FF0A3C' }} />

          {/* Softboxes on each side of the subject */}
          <Softbox o={o} s={70} t={96} b={b} />
          <Softbox o={o} s={176} t={250} b={b} />

          {/* The photographer, camera up */}
          <Person origin={ob} s={214} t={168} pose="camera" look={{ skin: SKIN.light, top: '#2B2B2B', bottom: '#B8AE7E', shoes: '#F4F4F4', head: 'cap', headColor: '#1F1F1F' }} />

          {/* Editing corner: desk, iMac showing a timeline, keyboard, editor on a stool */}
          <Box3 o={o} s0={desk.s0} s1={desk.s1} t0={desk.t0} t1={desk.t1} h0={b} h1={b + 24} />
          <polygon points={solid(o, [[desk.s0 + 4, desk.t0 + 4, b], [desk.s0 + 8, desk.t0 + 4, b], [desk.s0 + 8, desk.t0 + 4, b + 24], [desk.s0 + 4, desk.t0 + 4, b + 24]])} fill="#C3C8E0" />
          <rect x={mx - 2} y={my - b - 24 - 12} width="4" height="12" fill="#C3C8E0" />
          <polygon points={solid(o, [[250, desk.t1 - 14, b + 34], [300, desk.t1 - 14, b + 34], [300, desk.t1 - 14, b + 70], [250, desk.t1 - 14, b + 70]])} fill="#2A2D3A" />
          <polygon points={solid(o, [[252, desk.t1 - 14, b + 40], [298, desk.t1 - 14, b + 40], [298, desk.t1 - 14, b + 68], [252, desk.t1 - 14, b + 68]])} fill="#1C1F2B" />
          {/* Timeline on the screen: tracks of clips */}
          {[
            [255, 272, 60, 'lot-cap'],
            [274, 296, 60, ''],
            [255, 266, 54, ''],
            [268, 290, 54, 'lot-cap'],
            [255, 284, 48, ''],
          ].map(([s0, s1, h, cls], i) => (
            <polygon key={i} className={(cls as string) || undefined} points={solid(o, [[s0 as number, desk.t1 - 14, b + (h as number)], [s1 as number, desk.t1 - 14, b + (h as number)], [s1 as number, desk.t1 - 14, b + (h as number) + 3.5], [s0 as number, desk.t1 - 14, b + (h as number) + 3.5]])} fill={cls ? undefined : '#5B6178'} />
          ))}
          <polygon points={solid(o, [[250, desk.t1 - 14, b + 34], [300, desk.t1 - 14, b + 34], [300, desk.t1 - 14, b + 40], [250, desk.t1 - 14, b + 40]])} fill="#EDEFF6" />
          <polygon points={solid(o, [[256, desk.t1 - 9, b + 24], [290, desk.t1 - 9, b + 24], [290, desk.t1 - 3, b + 24], [256, desk.t1 - 3, b + 24]])} fill="#E2E4F0" stroke="#C6CADF" strokeWidth="0.5" />
          <Person origin={ob} s={330} t={262} pose="sit" look={{ skin: SKIN.rose, top: '#9CC8F2', bottom: '#2B2B2B', shoes: '#F4F4F4', head: 'hair', headColor: '#3A2A20', headphones: true }} />

          {/* A plant in the corner */}
          <Tree origin={o} s={350} t={20} size={0.6} base={b} />

          {/* Thumbnails of the week's posts */}
          {posts.map((post, i) => {
            const [s, t] = spots[i % spots.length];
            const [x, y] = iso(o, s, t);
            const tall = isTall(post.format);
            const w = tall ? 30 : 38;
            const h = tall ? 50 : 38;
            const waiting = normalize(post.status).startsWith('a ');
            return (
              <g key={post.title}>
                <ellipse cx={x} cy={y - b} rx="10" ry="4" fill="#2E3470" fillOpacity="0.14" filter="url(#bld-blur-s)" />
                <line x1={x} y1={y - b} x2={x} y2={y - b - 26} stroke="#CDD1E5" strokeWidth="1.5" />
                <rect x={x - w / 2} y={y - b - 26 - h} width={w} height={h} rx="6" fill="#1C1C1E" stroke={waiting ? '#D97757' : '#E1E3F0'} strokeWidth="1.6" />
                <rect x={x - w / 2 + 3} y={y - b - 23 - h} width={w - 6} height={h - 14} rx="4" className="lot-cap" opacity="0.85" />
                <path d={`M${x - 3},${y - b - 26 - h / 2 - 9} l7,4 l-7,4 z`} fill="#FFFFFF" />
                <text x={x} y={y - b - 30} textAnchor="middle" fontSize="7" fontWeight="700" fill="#FFFFFF">
                  {post.date.split(' ')[0].toUpperCase()}
                </text>
              </g>
            );
          })}
        </>
      }
      lights={
        <>
          {/* The softboxes and the iMac screen glow a little at night */}
          <ellipse cx={iso(o, 70, 96)[0]} cy={iso(o, 70, 96)[1] - b - 64} rx="22" ry="18" fill="#FFFFFF" fillOpacity="0.45" filter="url(#bld-blur-m)" />
          <ellipse cx={iso(o, 176, 250)[0]} cy={iso(o, 176, 250)[1] - b - 64} rx="22" ry="18" fill="#FFFFFF" fillOpacity="0.45" filter="url(#bld-blur-m)" />
          <ellipse cx={mx + 18} cy={my - b - 64} rx="26" ry="14" fill="#9DB4FF" fillOpacity="0.35" filter="url(#bld-blur-m)" />
        </>
      }
    />
  );
}

/** x1/y1/x2/y2 of a line between two floor points, raised by h. */
function lineOf([x1, y1]: Point, [x2, y2]: Point, h: number) {
  return { x1, y1: y1 - h, x2, y2: y2 - h };
}

/** The week's posts as cards: format, title, when, status, and a button to approve those waiting. */
export function PostCards({ rows, onOpen, onAction }: { rows: string[][]; onOpen: (name: string) => void; onAction: (label: string) => void }) {
  return (
    <ul className="posts">
      {rows.map(([title, format, date, status]) => {
        const waiting = normalize(status).startsWith('a ');
        return (
          <li key={title} className={`post${waiting ? ' post--waiting' : ''}`}>
            <span className={`post-thumb${isTall(format) ? ' post-thumb--tall' : ''}`} aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 7.5v9l7.5-4.5z" />
              </svg>
            </span>
            <div className="post-body">
              <span className="post-format">{format}</span>
              <button type="button" className="post-title" onClick={() => onOpen(title)}>
                {title}
              </button>
              <span className="post-date">{date}</span>
            </div>
            <div className="post-side">
              <span className={`review-status${waiting ? ' review-status--waiting' : ''}`}>{status}</span>
              {waiting && (
                <button type="button" className="review-answer" onClick={() => onAction(`Valider : ${title}`)}>
                  Valider
                </button>
              )}
            </div>
          </li>
        );
      })}
      {rows.length === 0 && <li className="tool-empty">Aucun contenu ne correspond.</li>}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------
// Followers: a grandstand per platform, filled with a crowd as big as its audience.

const CROWD = ['#1F1F1F', '#F4F4F4', '#FF0A3C', '#9CC8F2', '#B8AE7E', '#2C4FB8', '#EFE7D2', '#8A5A3C'];
const CROWD_SKIN = [SKIN.light, SKIN.rose, SKIN.tan, SKIN.deep];

/** A platform's colours on its stadium: the scoreboard and the band round the stands. */
function platformColour(name: string) {
  const key = normalize(name);
  if (key.includes('insta')) return { main: '#E1306C', ink: '#FFFFFF' };
  if (key.includes('tiktok')) return { main: '#111111', ink: '#25F4EE' };
  if (key.includes('youtube')) return { main: '#FF0000', ink: '#FFFFFF' };
  return { main: '', ink: '#FFFFFF' };
}

/**
 * The Abonnés module as stadiums, one per platform, as big as its following: an oval of stands
 * full of fans (about one per twenty followers), a green pitch, four floodlights and a scoreboard
 * in the platform's colours with its name and count.
 */
export function FollowersScene({ project, module, onSelect }: { project: Project; module: Module; onSelect: (name: string) => void }) {
  if (module.view.kind !== 'table') return null;
  const platforms = module.view.rows.map(([name, count, month, trend]) => ({ name, count, value: euros(count), month, trend }));
  const size = 400;
  const o: Point = [0.866 * size + 60, 170];
  const box: [number, number, number, number] = [0, 0, 0.866 * size * 2 + 120, size + 210];
  const b = 8;
  const P: Point = [o[0], o[1] - b];
  // Biggest stadium at the back, the others in front, each sized by its followers
  const spots: Point[] = [
    [115, 125],
    [298, 152],
    [182, 306],
    [330, 330],
    [60, 330],
  ];
  const stadiums = [...platforms]
    .sort((a, b2) => b2.value - a.value)
    .map((p, i) => ({ ...p, at: spots[i % spots.length], r: Math.min(100, 46 + Math.sqrt(p.value) * 0.95), colour: platformColour(p.name) }))
    .sort((a, b2) => a.at[0] + a.at[1] - (b2.at[0] + b2.at[1]));
  const H = 20; // height of the stands
  const items: SceneItem[] = stadiums.map((st) => {
    const [x, y] = iso(P, st.at[0] - st.r * 0.62, st.at[1] - st.r * 0.62);
    return { id: st.name, x, y: y - H - 48, label: st.name, sub: `${st.month} en 30 jours · ${st.trend}`, tone: 'accent', value: st.count };
  });
  const oval = ([cs, ct]: Point, r: number, h: number) => {
    const [x, y] = iso(P, cs, ct);
    return { cx: x, cy: y - h, rx: r * 1.2247, ry: r * 0.7071 };
  };

  return (
    <SceneFrame
      project={project}
      box={box}
      title="Les abonnés, plateforme par plateforme"
      zoom={1.35}
      items={items}
      onSelect={onSelect}
      hood={{ ground: o, size: [size, size] }}
      lit={[points(P, [[0, 0], [size, 0], [size, size], [0, size]])]}
      lights={
        <>
          {stadiums.map((st) => {
            const pitch = oval(st.at, st.r * 0.56, 4);
            return <ellipse key={st.name} {...pitch} fill="#FFF4CC" fillOpacity="0.35" filter="url(#bld-blur-m)" />;
          })}
        </>
      }
      art={
        <>
          <Slab origin={o} s0={0} t0={0} s1={size} t1={size} r={32} h={b} top="#F5F6FA" side="#CDD1E5" shadow={0.16} />
          {stadiums.map((st, si) => {
            const { at, r, colour } = st;
            const [cs, ct] = at;
            const outer = oval(at, r, H);
            const base = oval(at, r, 0);
            const hole = oval(at, r * 0.6, H);
            const pitch = oval(at, r * 0.56, 4);
            const clip = `stadium-${project.id}-${si}`;
            const fans = Math.min(220, Math.max(12, Math.round(st.value / 20)));
            const mast = (a: number) => {
              const rad = (a * Math.PI) / 180;
              const [x, y] = iso(P, cs + r * 1.04 * Math.cos(rad), ct + r * 1.04 * Math.sin(rad));
              return (
                <g key={a}>
                  <line x1={x} y1={y} x2={x} y2={y - H - 34} stroke="#B9BED3" strokeWidth="1.6" />
                  <rect x={x - 5} y={y - H - 40} width="10" height="6" rx="1.4" fill="#E8EAF2" stroke="#B9BED3" strokeWidth="0.6" />
                  <rect x={x - 3.6} y={y - H - 38.6} width="7.2" height="3.2" rx="0.8" fill="#FFF6D6" />
                </g>
              );
            };
            const [bx, by] = iso(P, cs - r * 0.62, ct - r * 0.62);
            return (
              <g key={st.name}>
                <ellipse cx={base.cx + 8} cy={base.cy + 6} rx={base.rx} ry={base.ry} fill="#2E3470" fillOpacity="0.16" filter="url(#bld-blur-m)" />
                {/* Back floodlights, the scoreboard, then the bowl */}
                {[200, 250].map(mast)}
                <line x1={bx - 16} y1={by - H + 4} x2={bx - 16} y2={by - H - 18} stroke="#B9BED3" strokeWidth="1.6" />
                <line x1={bx + 16} y1={by - H + 4} x2={bx + 16} y2={by - H - 18} stroke="#B9BED3" strokeWidth="1.6" />
                <g transform={`translate(${bx} ${by - H - 30})`}>
                  <rect x="-30" y="-12" width="60" height="26" rx="4" fill={colour.main || 'var(--accent)'} />
                  <text y="-1" textAnchor="middle" fontSize="8.5" fontWeight="700" fill={colour.ink} fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif">
                    {st.name}
                  </text>
                  <text y="10" textAnchor="middle" fontSize="9" fontWeight="300" fill="#FFFFFF" fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif">
                    {st.count}
                  </text>
                </g>
                {/* Outer wall, a band in the platform's colour, the stands */}
                <ellipse {...base} fill="#D3D6E8" />
                <rect x={base.cx - base.rx} y={outer.cy} width={base.rx * 2} height={base.cy - outer.cy} fill="#D3D6E8" />
                <ellipse cx={outer.cx} cy={outer.cy + 7} rx={outer.rx} ry={outer.ry} fill={colour.main || 'var(--accent)'} />
                <rect x={base.cx - base.rx} y={outer.cy} width={base.rx * 2} height="7" fill={colour.main || 'var(--accent)'} />
                <ellipse {...outer} fill="#EEF0F7" />
                {[0.9, 0.8, 0.7].map((f) => (
                  <ellipse key={f} {...oval(at, r * f, H)} fill="none" stroke="#DADDEB" strokeWidth="0.7" />
                ))}
                {/* The bowl: inner wall, then the pitch seen through the opening */}
                <ellipse {...hole} fill="#C9CDDF" />
                <clipPath id={clip}>
                  <ellipse {...hole} />
                </clipPath>
                <g clipPath={`url(#${clip})`}>
                  <ellipse {...pitch} fill="#CFE3C3" />
                  <ellipse {...oval(at, r * 0.56, 4)} fill="none" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="1" />
                  <line {...(() => {
                    const [x1, y1] = iso(P, cs, ct - r * 0.56);
                    const [x2, y2] = iso(P, cs, ct + r * 0.56);
                    return { x1, y1: y1 - 4, x2, y2: y2 - 4 };
                  })()} stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="1" />
                  <ellipse {...oval(at, r * 0.14, 4)} fill="none" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="1" />
                </g>
                {/* Fans all round the stands */}
                {Array.from({ length: fans }, (_, j) => {
                  const ring = j % 3;
                  const a = ((j * 137.5) % 360) * (Math.PI / 180);
                  const rr = r * (0.66 + ring * 0.1);
                  const [x, y] = iso(P, cs + rr * Math.cos(a), ct + rr * Math.sin(a));
                  const seed = (j * 5 + si) % 8;
                  return (
                    <g key={j}>
                      <rect x={x - 1.5} y={y - H - 3.6} width="3" height="3.4" rx="1.2" fill={CROWD[seed]} />
                      <circle cx={x} cy={y - H - 4.8} r="1.4" fill={CROWD_SKIN[seed % 4]} />
                    </g>
                  );
                })}
                {/* Front floodlights */}
                {[20, 70].map(mast)}
              </g>
            );
          })}
        </>
      }
    />
  );
}

/** Platforms as cards: followers in big, gained in 30 days, trend, and their share of the total. */
export function FollowerCards({ rows, onOpen }: { rows: string[][]; onOpen: (name: string) => void }) {
  const total = rows.reduce((sum, [, count]) => sum + euros(count), 0) || 1;
  return (
    <ul className="revenue-cards">
      {rows.map(([name, count, month, trend]) => (
        <li key={name} className="revenue">
          <button type="button" className="revenue-open" onClick={() => onOpen(name)}>
            <span className="revenue-month">{name}</span>
            <span className="revenue-ca">{count}</span>
            <span className="revenue-bar" aria-hidden="true">
              <span style={{ width: `${(euros(count) / total) * 100}%`, background: 'var(--accent)' }} />
            </span>
            <span className="revenue-foot">
              <span>{month} en 30 jours</span>
              <span className={`revenue-trend revenue-trend--${normalize(trend)}`}>{trend}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
