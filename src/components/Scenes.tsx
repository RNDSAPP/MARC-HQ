// Scenes of particular modules, drawn with the same clay model pieces as the building:
// a city of clubs (or student unions) for a pipeline, a square with a podium for the ambassadors.
import { useState } from 'react';
import type { ReactNode } from 'react';
import type { Module, PipelineColumn, PipelineTone, Project } from '../data/types';
import { phaseLabel, usePhase } from '../lib/sun';
import {
  FloorText,
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
function SceneFrame({ project, box, art, lights, items, title, onSelect }: {
  project: Project;
  box: [number, number, number, number];
  art: ReactNode;
  lights?: ReactNode;
  items: SceneItem[];
  title: string;
  onSelect: (id: string) => void;
}) {
  const [choice, setChoice] = usePhaseChoice();
  const phase = usePhase(choice);
  const [hover, setHover] = useState<string | null>(null);
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
            {art}
            <SkyTint box={box} />
            <g className="night-lights">{lights}</g>
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
      <polygon points={points(o, [[s, t], [s + size + 6, t], [s + size + 6, t + size + 6], [s, t + size]])} fill="#000" fillOpacity={ghost ? 0.06 : 0.16} filter="url(#bld-blur-m)" transform={`translate(0 ${-base})`} />
      <polygon points={solid(o, [[s + size, t, base], [s + size, t + size, base], [s + size, t + size, top], [s + size, t, top]])} fill={ghost ? '#FFFFFF' : '#D6D6D6'} fillOpacity={ghost ? 0.4 : 1} />
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
            return <Slab key={column.name} origin={o} s0={ds} t0={dt} s1={ds + district} t1={dt + district} r={24} h={8} top="#F6F6F6" side="#CFCFCF" />;
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
  { skin: SKIN.rose, top: '#F2F2F2', bottom: '#F2F2F2', shoes: '#F4F4F4', head: 'cap', headColor: '#2C4FB8' },
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
      <polygon points={solid(o, [[s + size, t, b], [s + size, t + size, b], [s + size, t + size, b + h], [s + size, t, b + h]])} fill="#D2D2D2" />
      <polygon points={solid(o, [[s, t + size, b], [s + size, t + size, b], [s + size, t + size, b + h], [s, t + size, b + h]])} fill="#EDEDED" />
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
      art={
        <>
          <Slab origin={o} s0={0} t0={0} s1={size} t1={size} r={30} h={8} top="#F6F6F6" side="#CFCFCF" shadow={0.16} />
          <ellipse cx={iso(o, c + 20, c + 20)[0]} cy={iso(o, c + 20, c + 20)[1] - 8} rx="120" ry="64" fill="none" stroke="#E2E2E2" strokeWidth="1.2" />
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
