// Scenes of particular modules, drawn with the same clay model pieces as the building:
// a city of clubs (or student unions) for a pipeline, a square with a podium for the ambassadors.
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
import './Scenes.css';

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

/** Wrapper shared by the scenes: day/night, the drawing, then HTML labels laid over it. */
function SceneFrame({ project, box, art, lights, labels, title }: {
  project: Project;
  box: [number, number, number, number];
  art: ReactNode;
  lights?: ReactNode;
  labels: ReactNode;
  title: string;
}) {
  const [choice, setChoice] = usePhaseChoice();
  const phase = usePhase(choice);
  const [x, y, w, h] = box;
  return (
    <div className="scene" data-project={project.id} data-phase={phase} aria-label={`${title}, ${phaseLabel[phase].toLowerCase()}`} role="group">
      <svg viewBox={box.join(' ')} className="scene-art" aria-hidden="true">
        <SceneDefs />
        <rect x={x} y={y} width={w} height={h} fill="url(#bld-ground)" />
        {art}
        <SkyTint box={box} />
        <g className="night-lights">{lights}</g>
        <rect x={x} y={y} width={w} height={h} filter="url(#bld-grain)" />
      </svg>
      {labels}
      <PhaseButton choice={choice} phase={phase} onChange={setChoice} />
    </div>
  );
}

/** Position in % of the drawing, for an HTML label over the point (x, y). */
const place = ([bx, by, bw, bh]: [number, number, number, number], x: number, y: number) => ({
  left: `${((x - bx) / bw) * 100}%`,
  top: `${((y - by) / bh) * 100}%`,
});

// ---------------------------------------------------------------------------------------------
// City of a pipeline: one district per stage, one building per club (or student union).

const CITY: Point = [500, 70];
const CITY_BOX: [number, number, number, number] = [100, 0, 800, 540];
const DISTRICT = 200;
const STREET = 44;
const LOT = 30;
// Where each stage sits: affiliated at the back, the ones to sign at the front, nearest to Marc.
const DISTRICT_AT: Record<PipelineTone, Point> = {
  accent: [0, 0],
  muted: [DISTRICT + STREET, 0],
  new: [0, DISTRICT + STREET],
  alert: [DISTRICT + STREET, DISTRICT + STREET],
};
// Slots of a district on a 5 × 5 grid of 40 units. Named clubs take slots spread apart, so their
// labels do not cover each other; the others fill the rest, centre first.
const GRID: Point[] = Array.from({ length: 25 }, (_, i): Point => [(i % 5) * 40 + 5, Math.floor(i / 5) * 40 + 5]);
const SPREAD = [6, 18, 8, 16, 12, 2, 10, 14, 22, 0, 4, 20, 24];
const CENTRE_FIRST = GRID.map((_, i) => i).sort((a, b) => Math.hypot(GRID[a][0] - 85, GRID[a][1] - 85) - Math.hypot(GRID[b][0] - 85, GRID[b][1] - 85));

type Lot = { s: number; t: number; h: number; tone: PipelineTone; name?: string; meta?: string };

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

function lotsOf(project: Project, module: Module): { lots: Lot[]; counts: { column: PipelineColumn; count: number }[] } {
  const lots: Lot[] = [];
  const counts = project.pipeline.columns.map((column) => ({ column, count: Math.min(stageCount(column, module), 20) }));
  for (const { column, count } of counts) {
    const [ds, dt] = DISTRICT_AT[column.tone];
    const named = SPREAD.slice(0, column.cards.length);
    const order = [...named, ...CENTRE_FIRST.filter((slot) => !named.includes(slot))];
    for (let i = 0; i < count; i++) {
      const card = column.cards[i];
      const members = card ? parseInt(card.meta.match(/(\d[\d\s]*)\s*(membres|étudiants)/)?.[1].replace(/\s/g, '') ?? '', 10) : NaN;
      // Height from the members when known (capped), else a calm varied height
      const h = Number.isFinite(members) ? Math.min(16 + Math.sqrt(members) * 2.6, 52) : 18 + ((i * 7) % 14);
      const [ls, lt] = GRID[order[i]];
      lots.push({ s: ds + ls, t: dt + lt, h, tone: column.tone, name: card?.name, meta: card?.meta });
    }
  }
  return { lots: lots.sort((a, b) => a.s + a.t - (b.s + b.t)), counts };
}

/** A club building: white walls, a cap in the colour of its stage, a door; ghosts are still to contact. */
function CityBuilding({ lot }: { lot: Lot }) {
  const { s, t, h, tone } = lot;
  const base = 8;
  const size = LOT;
  const o = CITY;
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
      {tone === 'alert' && (() => {
        const [x, y] = iso(o, s + size / 2, t + size / 2);
        return (
          <g className="lot-pin">
            <line x1={x} y1={y - top} x2={x} y2={y - top - 14} stroke="#B98A2E" strokeWidth="1.4" />
            <circle cx={x} cy={y - top - 20} r="7" fill="#F0B44C" />
            <text x={x} y={y - top - 16.5} textAnchor="middle" fontSize="10" fontWeight="800" fill="#1A1206">!</text>
          </g>
        );
      })()}
    </g>
  );
}

/** Lit windows of the city at night: a warm band on the face turned to us. */
function CityWindows({ lots }: { lots: Lot[] }) {
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
              points={solid(CITY, [[s + 4, t + LOT, top - 10], [s + LOT - 4, t + LOT, top - 10], [s + LOT - 4, t + LOT, top - 6], [s + 4, t + LOT, top - 6]])}
              fill="#FFE3A3"
              fillOpacity="0.9"
            />
          );
        })}
    </>
  );
}

/**
 * The pipeline as a city: four districts (affiliated, to sign, in discussion, to contact),
 * one building per club, as high as its membership. Named ones carry a label: tap it to find
 * the club in the pipeline below.
 */
export function PipelineCity({ project, module, onPick }: { project: Project; module: Module; onPick: (name: string) => void }) {
  const { lots, counts } = lotsOf(project, module);
  const span = DISTRICT * 2 + STREET;
  return (
    <SceneFrame
      project={project}
      box={CITY_BOX}
      title={`${project.pipeline.title} en ville`}
      art={
        <>
          {/* Streets between the districts */}
          <polygon points={points(CITY, [[DISTRICT, -200], [DISTRICT + STREET, -200], [DISTRICT + STREET, 900], [DISTRICT, 900]])} fill="url(#bld-asphalt)" />
          <polygon points={points(CITY, [[-200, DISTRICT], [900, DISTRICT], [900, DISTRICT + STREET], [-200, DISTRICT + STREET]])} fill="url(#bld-asphalt)" />
          <g fill="none" stroke="#F4F4F4" strokeWidth="1.8" strokeDasharray="14 12">
            <polyline points={points(CITY, [[DISTRICT + STREET / 2, -200], [DISTRICT + STREET / 2, 900]])} />
            <polyline points={points(CITY, [[-200, DISTRICT + STREET / 2], [900, DISTRICT + STREET / 2]])} />
          </g>
          {counts.map(({ column }) => {
            const [ds, dt] = DISTRICT_AT[column.tone];
            return <Slab key={column.name} origin={CITY} s0={ds} t0={dt} s1={ds + DISTRICT} t1={dt + DISTRICT} r={24} h={8} top="#F6F6F6" side="#CFCFCF" />;
          })}
          {counts.map(({ column, count }) => {
            const [ds, dt] = DISTRICT_AT[column.tone];
            return (
              <FloorText key={column.name} origin={[CITY[0], CITY[1] - 8]} s={ds + 14} t={dt + DISTRICT - 10} size={15}>
                {`${column.name.toUpperCase()} · ${count}`}
              </FloorText>
            );
          })}
          <Tree origin={CITY} s={DISTRICT + STREET + 182} t={14} size={0.8} base={8} />
          <Tree origin={CITY} s={14} t={DISTRICT + STREET + 184} size={0.8} base={8} />
          {lots.map((lot) => (
            <CityBuilding key={`${lot.s}-${lot.t}`} lot={lot} />
          ))}
          <polygon points={points(CITY, [[-10, -10], [span + 10, -10], [span + 10, span + 10], [-10, span + 10]])} fill="none" />
        </>
      }
      lights={<CityWindows lots={lots} />}
      labels={
        <ul className="scene-tags" aria-label={`Clubs nommés de ${project.pipeline.title}`}>
          {lots
            .filter((lot) => lot.name)
            .map((lot, index) => {
              const [x, y] = iso(CITY, lot.s + LOT / 2, lot.t + LOT / 2);
              // Neighbours' labels are staggered so they do not cover each other
              const lift = 8 + lot.h + (lot.tone === 'alert' ? 30 : 6) + (index % 2) * 16;
              return (
                <li key={lot.name} className="scene-tag-item" style={place(CITY_BOX, x, y - lift)}>
                  <button type="button" className={`scene-tag scene-tag--${lot.tone}`} onClick={() => onPick(lot.name as string)} title={lot.meta}>
                    {lot.name}
                  </button>
                </li>
              );
            })}
        </ul>
      }
    />
  );
}

// ---------------------------------------------------------------------------------------------
// Ambassadors: a square with a podium for the top three.

const SQUARE: Point = [500, 50];
const SQUARE_BOX: [number, number, number, number] = [116, 6, 768, 470];
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

// The three steps of the podium: first in the middle, second on its left, third on its right.
const STEPS: { s: number; t: number; h: number; rank: number }[] = [
  { s: 190, t: 190, h: 34, rank: 1 },
  { s: 190, t: 232, h: 24, rank: 2 },
  { s: 232, t: 190, h: 15, rank: 3 },
];
// Where the others stand on the square
const SPOTS: Point[] = [
  [96, 290],
  [320, 96],
  [120, 116],
  [150, 352],
  [352, 320],
  [250, 66],
  [70, 210],
];

function Step({ s, t, h, rank }: { s: number; t: number; h: number; rank: number }) {
  const o = SQUARE;
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
 * Ambassadors on a square: the three who brought the most sign-ups on the podium, the others
 * around, the one to chase up apart, the one still in discussion as a ghost.
 */
export function AmbassadorsPlaza({ project, module, onPick }: { project: Project; module: Module; onPick: (name: string) => void }) {
  if (module.view.kind !== 'table') return null;
  const rows = module.view.rows.map(([name, club, sign, status]) => ({ name, club, sign: parseInt(sign, 10) || 0, status }));
  const ranked = [...rows].sort((a, b) => b.sign - a.sign);
  const podium = ranked.slice(0, 3);
  const others = ranked.slice(3);
  const totalKpi = parseInt(module.kpis.find((k) => normalize(k.label).includes('ambassadeur'))?.value ?? '', 10);
  const total = Number.isFinite(totalKpi) ? totalKpi : rows.length;
  const unnamed = Math.max(total - rows.length, 0);

  const people = [
    ...podium.map((row, i) => {
      const step = STEPS[i];
      return { key: row.name, s: step.s + 20, t: step.t + 20, lift: 8 + step.h, look: LOOKS[i], cheer: i === 0, ghost: false, row, rank: i + 1 };
    }),
    ...others.map((row, i) => ({ key: row.name, s: SPOTS[i][0], t: SPOTS[i][1], lift: 8, look: LOOKS[3 + i], cheer: false, ghost: row.sign === 0, row, rank: 0 })),
    ...Array.from({ length: unnamed }, (_, i) => {
      const [s, t] = SPOTS[others.length + i] ?? [60 + i * 30, 380];
      return { key: `anon-${i}`, s, t, lift: 8, look: LOOKS[(5 + i) % LOOKS.length], cheer: false, ghost: false, row: undefined, rank: 0 };
    }),
  ].sort((a, b) => a.s + a.t - (b.s + b.t));

  return (
    <SceneFrame
      project={project}
      box={SQUARE_BOX}
      title="Les ambassadeurs sur la place"
      art={
        <>
          <Slab origin={SQUARE} s0={0} t0={0} s1={420} t1={420} r={30} h={8} top="#F6F6F6" side="#CFCFCF" shadow={0.16} />
          <ellipse cx={iso(SQUARE, 230, 230)[0]} cy={iso(SQUARE, 230, 230)[1] - 8} rx="120" ry="64" fill="none" stroke="#E2E2E2" strokeWidth="1.2" />
          <FloorText origin={[SQUARE[0], SQUARE[1] - 8]} s={40} t={404} size={22}>
            {`${total} AMBASSADEURS`}
          </FloorText>
          <Tree origin={SQUARE} s={30} t={30} base={8} />
          <Tree origin={SQUARE} s={392} t={40} size={0.9} base={8} />
          <Tree origin={SQUARE} s={40} t={392} size={0.9} base={8} />
          {STEPS.map((step) => (
            <Step key={step.rank} {...step} />
          ))}
          {people.map((person) => (
            <g key={person.key} opacity={person.ghost ? 0.45 : 1}>
              <Person origin={[SQUARE[0], SQUARE[1] - person.lift]} s={person.s} t={person.t} look={person.look} cheer={person.cheer} />
            </g>
          ))}
        </>
      }
      labels={
        <ul className="scene-tags" aria-label="Ambassadeurs nommés">
          {people
            .filter((person) => person.row)
            .map((person) => {
              const row = person.row!;
              const [x, y] = iso(SQUARE, person.s, person.t);
              const late = normalize(row.status).includes('relancer');
              const tone = person.rank > 0 ? 'accent' : late ? 'alert' : person.ghost ? 'new' : 'muted';
              return (
                // On the podium, the winner's label sits higher and the two others move aside
                <li key={person.key} className="scene-tag-item" style={place(SQUARE_BOX, x + (person.rank === 2 ? -34 : person.rank === 3 ? 34 : 0), y - person.lift - 46 - (person.rank === 1 ? 24 : 0))}>
                  <button type="button" className={`scene-tag scene-tag--${tone}`} onClick={() => onPick(row.name)} title={`${row.club} · ${row.status}`}>
                    {person.rank > 0 && <span className="scene-tag-rank">{person.rank}</span>}
                    {row.name} <span className="scene-tag-num">{row.sign}</span>
                  </button>
                </li>
              );
            })}
        </ul>
      }
    />
  );
}

