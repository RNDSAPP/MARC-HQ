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
function SceneFrame({ project, box: plateBox, art, lights, lit, items, title, onSelect, hood }: {
  project: Project;
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
// Spread order for named clubs on a grid of n × n slots, so their markers do not crowd.
const spreadOrder = (n: number) => {
  const all = Array.from({ length: n * n }, (_, i) => i);
  const c = (n - 1) / 2;
  const ring = (i: number) => Math.max(Math.abs((i % n) - c), Math.abs(Math.floor(i / n) - c));
  // Every other slot first (a checkerboard), from the middle ring outwards
  return all.sort((a, b) => ((a % n) + Math.floor(a / n)) % 2 - ((b % n) + Math.floor(b / n)) % 2 || ring(a) - ring(b));
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
function cityPlan(project: Project, module: Module) {
  const counts = project.pipeline.columns.map((column) => ({ column, count: stageCount(column, module) }));
  const n = Math.max(5, Math.ceil(Math.sqrt(Math.max(...counts.map((c) => c.count)))));
  const district = n * SLOT;
  const span = district * 2 + STREET;
  const width = 0.866 * span * 2 + 120;
  const origin: Point = [width / 2, 74];
  const box: [number, number, number, number] = [0, 0, width, span + 140];
  // Where each stage sits: affiliated at the back, the ones to sign at the front, nearest to Marc.
  const at: Record<PipelineTone, Point> = { accent: [0, 0], muted: [district + STREET, 0], new: [0, district + STREET], alert: [district + STREET, district + STREET] };
  const order = spreadOrder(n);
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
  return { origin, box, district, at, counts, lots: lots.sort((a, b) => a.s + a.t - (b.s + b.t)) };
}

/** A club building: white walls, a cap in the colour of its stage, a door; ghosts are still to contact. */
function CityBuilding({ lot, o }: { lot: Lot; o: Point }) {
  const { s, t, h, tone } = lot;
  const base = 8;
  const size = LOT;
  const ghost = tone === 'new';
  const top = base + h;
  return (
    <g className={`lot lot--${tone}`}>
      <polygon points={points(o, [[s, t], [s + size + 6, t], [s + size + 6, t + size + 6], [s, t + size]])} fill="#2E3470" fillOpacity={ghost ? 0.06 : 0.16} filter="url(#bld-blur-m)" transform={`translate(0 ${-base})`} />
      <polygon points={solid(o, [[s + size, t, base], [s + size, t + size, base], [s + size, t + size, top], [s + size, t, top]])} fill={ghost ? '#FFFFFF' : '#D3D6E8'} fillOpacity={ghost ? 0.4 : 1} />
      <polygon points={solid(o, [[s, t + size, base], [s + size, t + size, base], [s + size, t + size, top], [s, t + size, top]])} fill={ghost ? '#FFFFFF' : '#EBEBEB'} fillOpacity={ghost ? 0.5 : 1} />
      <polygon points={solid(o, [[s, t, top], [s + size, t, top], [s + size, t + size, top], [s, t + size, top]])} fill="#FFFFFF" fillOpacity={ghost ? 0.6 : 1} className={ghost ? 'lot-ghost' : undefined} />
      {!ghost && (
        <>
          <polygon className="lot-cap" points={solid(o, [[s + 4, t + 4, top], [s + size - 4, t + 4, top], [s + size - 4, t + size - 4, top], [s + 4, t + size - 4, top]])} />
          <polygon points={solid(o, [[s + 12, t + size, base], [s + 20, t + size, base], [s + 20, t + size, base + 9], [s + 12, t + size, base + 9]])} fill="#5B6168" />
        </>
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
  const { origin: o, box, district, at, counts, lots } = cityPlan(project, module);
  const span = district * 2 + STREET;
  const items: SceneItem[] = lots
    .filter((lot) => lot.name)
    .sort((a, b) => ['alert', 'muted', 'new', 'accent'].indexOf(a.tone) - ['alert', 'muted', 'new', 'accent'].indexOf(b.tone))
    .map((lot) => {
      const [x, y] = iso(o, lot.s + LOT / 2, lot.t + LOT / 2);
      return { id: lot.name as string, x, y: y - 8 - lot.h - 4, label: lot.name as string, sub: `${lot.stage} · ${lot.meta ?? ''}`, tone: lot.tone };
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
          {lots.map((lot) => (
            <CityBuilding key={`${lot.s}-${lot.t}`} lot={lot} o={o} />
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
  const size = Math.max(420, 300 + Math.ceil(crowd / 8) * 120);
  const c = size / 2;
  const o: Point = [0.866 * size + 60, 56];
  const box: [number, number, number, number] = [0, 0, 0.866 * size * 2 + 120, size + 110];
  const spot = (i: number): Point => {
    const ring = Math.floor(i / 8);
    const radius = 120 + ring * 60;
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
      items={items}
      onSelect={onSelect}
      hood={{ ground: o, size: [size, size] }}
      lit={[points([o[0], o[1] - 8], [[0, 0], [size, 0], [size, size], [0, size]])]}
      art={
        <>
          <Slab origin={o} s0={0} t0={0} s1={size} t1={size} r={30} h={8} top="#F5F6FA" side="#CDD1E5" shadow={0.16} />
          <ellipse cx={iso(o, c + 20, c + 20)[0]} cy={iso(o, c + 20, c + 20)[1] - 8} rx="120" ry="64" fill="none" stroke="#E1E3F0" strokeWidth="1.2" />
          <FloorText origin={[o[0], o[1] - 8]} s={40} t={size - 16} size={22}>
            {`${total} AMBASSADEURS`}
          </FloorText>
          <Tree origin={o} s={30} t={30} base={8} />
          <Tree origin={o} s={size - 28} t={40} size={0.9} base={8} />
          <Tree origin={o} s={40} t={size - 28} size={0.9} base={8} />
          {steps.map((step) => (
            <Step key={step.rank} {...step} o={o} />
          ))}
          {people.map((person) => (
            <g key={person.key} opacity={person.ghost ? 0.45 : 1}>
              <Person origin={[o[0], o[1] - person.lift]} s={person.s} t={person.t} look={person.look} cheer={person.cheer} pose={person.pose} />
            </g>
          ))}
        </>
      }
    />
  );
}

// ---------------------------------------------------------------------------------------------
// App Store: the game on a big phone standing on its plate, the reviews around it.

const stars = (n: number) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);

/**
 * The App Store module as a scene: a big phone shows the game's icon and its rating, the latest
 * reviews float around it as bubbles with their stars; those still waiting for an answer are amber.
 */
export function AppStoreScene({ project, module, rating, icon, onSelect }: {
  project: Project;
  module: Module;
  rating: string;
  icon: string;
  onSelect: (name: string) => void;
}) {
  if (module.view.kind !== 'table') return null;
  const reviews = module.view.rows.map(([text, note, date, status]) => ({ text, note: parseInt(note, 10) || 0, date, status }));
  const size = 360;
  const o: Point = [0.866 * size + 60, 120];
  const box: [number, number, number, number] = [0, 0, 0.866 * size * 2 + 120, size + 170];
  // The phone stands in the middle of the plate, its screen turned to us
  const p = { s0: 150, s1: 214, t: 196, h: 150 };
  const screen = (s: number, h: number): [number, number] => {
    const [x, y] = iso(o, s, p.t);
    return [x, y - h];
  };
  const [sx, sy] = screen(p.s0 + 8, p.h - 10);
  // Bubbles around the phone, alternately left and right, rising
  const spots: Point[] = [
    [60, 250],
    [300, 120],
    [70, 140],
    [310, 250],
    [190, 330],
    [30, 320],
  ];
  const items: SceneItem[] = reviews.map((review, i) => {
    const [s, t] = spots[i % spots.length];
    const [x, y] = iso(o, s, t);
    const waiting = normalize(review.status).includes('repondre');
    return {
      id: review.text,
      x,
      y: y - 70,
      label: `« ${review.text} »`,
      sub: `${stars(review.note)} · ${review.date} · ${review.status}`,
      tone: waiting ? 'alert' : 'accent',
    };
  });

  return (
    <SceneFrame
      project={project}
      box={box}
      title="Les avis App Store"
      items={items}
      onSelect={onSelect}
      hood={{ ground: o, size: [size, size] }}
      lit={[points([o[0], o[1] - 8], [[0, 0], [size, 0], [size, size], [0, size]])]}
      art={
        <>
          <Slab origin={o} s0={0} t0={0} s1={size} t1={size} r={32} h={8} top="#F5F6FA" side="#CDD1E5" shadow={0.16} />
          <FloorText origin={[o[0], o[1] - 8]} s={34} t={size - 16} size={20}>
            {`NOTE ${rating} · ${reviews.length} AVIS RÉCENTS`}
          </FloorText>
          {/* Phone: shadow, side, back edge, then the screen face */}
          <polygon points={points(o, [[p.s0, p.t - 14], [p.s1 + 30, p.t - 14], [p.s1 + 30, p.t + 20], [p.s0, p.t + 6]])} fill="#2E3470" fillOpacity="0.18" filter="url(#bld-blur-m)" />
          <polygon points={solid(o, [[p.s1, p.t - 12, 8], [p.s1, p.t, 8], [p.s1, p.t, 8 + p.h], [p.s1, p.t - 12, 8 + p.h]])} fill="#2A2A2C" />
          <polygon points={solid(o, [[p.s0, p.t - 12, 8 + p.h], [p.s1, p.t - 12, 8 + p.h], [p.s1, p.t, 8 + p.h], [p.s0, p.t, 8 + p.h]])} fill="#3A3A3D" />
          <polygon points={solid(o, [[p.s0, p.t, 8], [p.s1, p.t, 8], [p.s1, p.t, 8 + p.h], [p.s0, p.t, 8 + p.h]])} fill="#1C1C1E" />
          <polygon points={solid(o, [[p.s0 + 4, p.t, 14], [p.s1 - 4, p.t, 14], [p.s1 - 4, p.t, 4 + p.h], [p.s0 + 4, p.t, 4 + p.h]])} fill="#F4F2FA" />
          {/* On the screen: the game's icon, its name and rating */}
          <g transform={`matrix(0.866 0.5 0 1 ${sx} ${sy})`}>
            <rect x="8" y="8" width="40" height="40" rx="10" className="lot-cap" />
            <image href={icon} x="12" y="12" width="32" height="32" />
            <text x="28" y="66" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1C1C1E">
              {project.name}
            </text>
            <text x="28" y="86" textAnchor="middle" fontSize="16" fontWeight="300" fill="#1C1C1E">
              {rating}
            </text>
            <text x="28" y="98" textAnchor="middle" fontSize="8" fill="#F0B44C">
              ★★★★★
            </text>
            <rect x="12" y="108" width="32" height="10" rx="5" className="lot-cap" />
          </g>
          {/* Review bubbles, standing on thin stems */}
          {reviews.map((review, i) => {
            const [s, t] = spots[i % spots.length];
            const [x, y] = iso(o, s, t);
            const waiting = normalize(review.status).includes('repondre');
            return (
              <g key={review.text}>
                <ellipse cx={x} cy={y - 8} rx="10" ry="4" fill="#2E3470" fillOpacity="0.14" filter="url(#bld-blur-s)" />
                <line x1={x} y1={y - 8} x2={x} y2={y - 46} stroke="#CDD1E5" strokeWidth="1.5" />
                <rect x={x - 36} y={y - 74} width="72" height="28" rx="12" fill="#FFFFFF" stroke={waiting ? '#D97757' : '#E1E3F0'} strokeWidth="1.2" />
                <text x={x} y={y - 56} textAnchor="middle" fontSize="11" fill="#F0B44C" letterSpacing="1">
                  {stars(review.note)}
                </text>
              </g>
            );
          })}
        </>
      }
    />
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
 * The Revenus module as a scene: on a plate, one tower per month (oldest at the back), as high as
 * its takings, the current month in the project's colour; beside them a pile of golden dice, as
 * big as their share of sales.
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
  // Towers side by side along the plate, oldest month on the left
  const gap = 84;
  const start = (size - (months.length - 1) * gap) / 2 - 40;
  const towers = months.map((m, i) => ({ ...m, s: start + i * gap, t: 150, h: 26 + (m.value / max) * 120, now: i === months.length - 1 }));
  const items: SceneItem[] = [...towers].reverse().map((tower) => {
    const [x, y] = iso(o, tower.s + 20, tower.t + 20);
    return { id: tower.month, x, y: y - 8 - tower.h - 6, label: tower.month, sub: `${tower.buys} achats · ${tower.trend}`, tone: tower.now ? 'accent' : 'muted', value: tower.ca };
  });
  // Golden dice: one per 10 % of sales, in a small heap
  const dice = Math.max(1, Math.round(share / 10));
  const heap: [number, number, number][] = Array.from({ length: dice }, (_, i) => {
    const layer = i < 3 ? 0 : i < 5 ? 1 : 2;
    const index = layer === 0 ? i : layer === 1 ? i - 3 : i - 5;
    return [250 + index * 18 + layer * 9, 250 + (index % 2) * 10 + layer * 6, 8 + layer * 14];
  });

  return (
    <SceneFrame
      project={project}
      box={box}
      title="Les revenus, mois par mois"
      items={items}
      onSelect={onSelect}
      hood={{ ground: o, size: [size, size] }}
      lit={[
        points([o[0], o[1] - 8], [[0, 0], [size, 0], [size, size], [0, size]]),
        // Each tower's silhouette, so it stays white above the plate at night
        ...towers.map(({ s, t, h }) => solid(o, [[s, t + 40, 8], [s + 40, t + 40, 8], [s + 40, t, 8], [s + 40, t, 8 + h], [s, t, 8 + h], [s, t + 40, 8 + h]])),
      ]}
      art={
        <>
          <Slab origin={o} s0={0} t0={0} s1={size} t1={size} r={32} h={8} top="#F5F6FA" side="#CDD1E5" shadow={0.16} />
          <FloorText origin={[o[0], o[1] - 8]} s={30} t={size - 16} size={18}>
            {`${months.length} MOIS · ${months[months.length - 1]?.ca ?? ''} CE MOIS`}
          </FloorText>
          {towers.map((tower) => {
            const { s, t, h } = tower;
            const w = 40;
            const b = 8;
            return (
              <g key={tower.month} className={tower.now ? 'tower tower--now' : 'tower'}>
                <polygon points={points(o, [[s, t], [s + w + 10, t], [s + w + 10, t + w + 10], [s, t + w]])} fill="#2E3470" fillOpacity="0.16" filter="url(#bld-blur-m)" transform={`translate(0 ${-b})`} />
                <polygon points={solid(o, [[s + w, t, b], [s + w, t + w, b], [s + w, t + w, b + h], [s + w, t, b + h]])} fill="#D2D5E7" />
                <polygon points={solid(o, [[s, t + w, b], [s + w, t + w, b], [s + w, t + w, b + h], [s, t + w, b + h]])} fill="#EBEDF5" />
                <polygon points={solid(o, [[s, t, b + h], [s + w, t, b + h], [s + w, t + w, b + h], [s, t + w, b + h]])} fill="#FFFFFF" />
                <polygon className={tower.now ? 'lot-cap' : 'tower-cap'} points={solid(o, [[s, t + w, b + h - 6], [s + w, t + w, b + h - 6], [s + w, t + w, b + h], [s, t + w, b + h]])} />
                <FloorText origin={[o[0], o[1] - 8]} s={s - 2} t={t + w + 16} size={11}>
                  {tower.month.slice(0, 4).toUpperCase()}
                </FloorText>
              </g>
            );
          })}
          {heap.map(([s, t, h], i) => (
            <g key={i}>
              <polygon points={solid(o, [[s + 14, t, h], [s + 14, t + 14, h], [s + 14, t + 14, h + 14], [s + 14, t, h + 14]])} fill="#D9A92E" />
              <polygon points={solid(o, [[s, t + 14, h], [s + 14, t + 14, h], [s + 14, t + 14, h + 14], [s, t + 14, h + 14]])} fill="#F2C14E" />
              <polygon points={solid(o, [[s, t, h + 14], [s + 14, t, h + 14], [s + 14, t + 14, h + 14], [s, t + 14, h + 14]])} fill="#FFDB7A" />
              <circle cx={iso(o, s + 7, t + 7)[0]} cy={iso(o, s + 7, t + 7)[1] - h - 14} r="1.6" fill="#8A6A12" />
            </g>
          ))}
          {share > 0 && (
            <FloorText origin={[o[0], o[1] - 8]} s={232} t={300} size={11}>
              {`DÉS DORÉS · ${share} %`}
            </FloorText>
          )}
        </>
      }
    />
  );
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
  const [lx, ly] = iso(o, 30, 170);
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

/**
 * The Abonnés module as grandstands: one per platform, three tiers high, with one little
 * spectator for about every hundred followers. The goal is painted on the floor with its
 * progress bar.
 */
export function FollowersScene({ project, module, onSelect }: { project: Project; module: Module; onSelect: (name: string) => void }) {
  if (module.view.kind !== 'table') return null;
  const platforms = module.view.rows.map(([name, count, month, trend]) => ({ name, count, value: euros(count), month, trend }));
  const goalKpi = module.kpis.find((k) => normalize(k.label).includes('objectif'));
  const goalTarget = goalKpi ? euros(goalKpi.label) : 0;
  const goalShare = goalKpi ? parseInt(goalKpi.value, 10) || 0 : 0;
  const size = 380;
  const o: Point = [0.866 * size + 60, 150];
  const box: [number, number, number, number] = [0, 0, 0.866 * size * 2 + 120, size + 190];
  const b = 8;
  const width = 90;
  const stands = platforms.map((p, i) => ({ ...p, s: 20 + i * 120, t: 110, crowd: Math.min(27, Math.max(1, Math.round(p.value / 110))) }));
  const tiers = [
    { dt: 0, h: 30 },
    { dt: 22, h: 20 },
    { dt: 44, h: 10 },
  ];
  const items: SceneItem[] = stands.map((stand) => {
    const [x, y] = iso(o, stand.s + width / 2, stand.t + 10);
    return { id: stand.name, x, y: y - b - 30 - 34, label: stand.name, sub: `${stand.month} en 30 jours · ${stand.trend}`, tone: 'accent', value: stand.count };
  });

  return (
    <SceneFrame
      project={project}
      box={box}
      title="Les abonnés, plateforme par plateforme"
      items={items}
      onSelect={onSelect}
      hood={{ ground: o, size: [size, size] }}
      lit={[
        points([o[0], o[1] - b], [[0, 0], [size, 0], [size, size], [0, size]]),
        ...stands.map(({ s, t }) => solid(o, [[s, t + 66, b], [s + width, t + 66, b], [s + width, t, b], [s + width, t, b + 30], [s, t, b + 30], [s, t + 66, b + 30]])),
      ]}
      art={
        <>
          <Slab origin={o} s0={0} t0={0} s1={size} t1={size} r={32} h={b} top="#F5F6FA" side="#CDD1E5" shadow={0.16} />
          {/* Goal painted on the floor, with its progress */}
          {goalTarget > 0 && (
            <>
              <FloorText origin={[o[0], o[1] - b]} s={30} t={size - 40} size={16}>
                {`OBJECTIF ${new Intl.NumberFormat('fr-FR').format(goalTarget)} · ${goalShare} %`}
              </FloorText>
              <polygon points={points([o[0], o[1] - b], [[30, size - 30], [330, size - 30], [330, size - 20], [30, size - 20]])} fill="#E3E5F1" />
              <polygon className="lot-cap" points={points([o[0], o[1] - b], [[30, size - 30], [30 + 3 * goalShare, size - 30], [30 + 3 * goalShare, size - 20], [30, size - 20]])} />
            </>
          )}
          {stands.map((stand) => (
            <g key={stand.name}>
              <polygon points={points([o[0], o[1] - b], [[stand.s, stand.t], [stand.s + width + 12, stand.t], [stand.s + width + 12, stand.t + 70], [stand.s, stand.t + 66]])} fill="#2E3470" fillOpacity="0.14" filter="url(#bld-blur-m)" />
              {tiers.map(({ dt, h }, k) => {
                const s0 = stand.s;
                const t0 = stand.t + dt;
                const t1 = t0 + 22;
                // People of this tier, in a row along it
                const perTier = Math.ceil(stand.crowd / 3);
                const here = Math.max(0, Math.min(perTier, stand.crowd - k * perTier));
                return (
                  <g key={dt}>
                    <polygon points={solid(o, [[s0 + width, t0, b], [s0 + width, t1, b], [s0 + width, t1, b + h], [s0 + width, t0, b + h]])} fill="#D0D3E6" />
                    <polygon points={solid(o, [[s0, t1, b], [s0 + width, t1, b], [s0 + width, t1, b + h], [s0, t1, b + h]])} fill="#EBEDF5" />
                    <polygon points={solid(o, [[s0, t0, b + h], [s0 + width, t0, b + h], [s0 + width, t1, b + h], [s0, t1, b + h]])} fill="#FFFFFF" />
                    {Array.from({ length: here }, (_, j) => {
                      const [x, y] = iso(o, s0 + 8 + j * (width - 12) / Math.max(perTier, 1), t0 + 11);
                      const top = y - b - h;
                      const seed = (k * 7 + j * 3 + stand.s) % 8;
                      return (
                        <g key={j}>
                          <rect x={x - 2.6} y={top - 7} width="5.2" height="7" rx="2.2" fill={CROWD[seed]} />
                          <circle cx={x} cy={top - 9.6} r="2.8" fill={CROWD_SKIN[seed % 4]} />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
              <FloorText origin={[o[0], o[1] - b]} s={stand.s + 6} t={stand.t + 86} size={12}>
                {stand.name.toUpperCase()}
              </FloorText>
            </g>
          ))}
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
