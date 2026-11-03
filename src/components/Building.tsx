import { Link } from 'react-router-dom';
import type { Project } from '../data/types';
import { agentStatusLabel, projectStatus } from '../lib/format';
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
const CLUB = '#1F9A5A';
const CLUB_SOFT = '#8FE0B0';
const ALERT = '#F0B44C';

type Point = [number, number];

// Back corner of each floor. Both floors are 320 units deep along s (towards the bottom right)
// and 250 units along t (towards the bottom left), on a 30° isometric grid.
const RNDS_FLOOR: Point = [600, 120];
const CLUB_FLOOR: Point = [348.9, 265];

/** Floor coordinates (s, t) to drawing coordinates. */
function iso([x, y]: Point, s: number, t: number): Point {
  return [x + 0.866 * (s - t), y + 0.5 * (s + t)];
}

function points(origin: Point, list: Point[]) {
  return list.map(([s, t]) => iso(origin, s, t).map((n) => n.toFixed(1)).join(',')).join(' ');
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

type Figure = { s: number; t: number; tone: number; gloves?: string };

// Clay greys for the figures: body, then legs and arms a step darker.
const TONES: [string, string][] = [
  ['#D4D4D4', '#B4B4B4'],
  ['#BDBDBD', '#9E9E9E'],
  ['#E2E2E2', '#C2C2C2'],
  ['#ACACAC', '#8E8E8E'],
];

/** A small clay figure standing at floor point (s, t): shadow, legs, body, arms, head. */
function Person({ origin, s, t, tone, gloves }: Figure & { origin: Point }) {
  const [x, y] = iso(origin, s, t);
  const [body, limb] = TONES[tone];
  return (
    <g transform={`translate(${x} ${y}) scale(1.18) translate(${-x} ${-y})`}>
      <ellipse cx={x + 2.5} cy={y} rx="7" ry="2.6" fill="#000" fillOpacity="0.16" filter="url(#bld-blur-s)" />
      <rect x={x - 3.5} y={y - 11} width="3.1" height="11" rx="1.5" fill={limb} />
      <rect x={x + 0.4} y={y - 11} width="3.1" height="11" rx="1.5" fill={limb} />
      <rect x={x - 4.8} y={y - 22.5} width="9.6" height="13.5" rx="4.4" fill={body} />
      <rect x={x - 4.8} y={y - 22.5} width="9.6" height="13.5" rx="4.4" fill="url(#bld-sheen)" />
      {gloves ? (
        <>
          <rect x={x - 7.4} y={y - 22} width="2.6" height="7" rx="1.3" fill={limb} />
          <rect x={x + 4.8} y={y - 22} width="2.6" height="7" rx="1.3" fill={limb} />
          <circle cx={x - 6.2} cy={y - 23.4} r="2.8" fill={gloves} />
          <circle cx={x + 6.2} cy={y - 23.9} r="2.8" fill={gloves} />
        </>
      ) : (
        <>
          <rect x={x - 7} y={y - 21.5} width="2.4" height="10.5" rx="1.2" fill={limb} />
          <rect x={x + 4.6} y={y - 21.5} width="2.4" height="10.5" rx="1.2" fill={limb} />
        </>
      )}
      <circle cx={x} cy={y - 27} r="4" fill={body} />
      <circle cx={x} cy={y - 27} r="4" fill="url(#bld-sheen)" />
    </g>
  );
}

const RNDS_PEOPLE: Figure[] = [
  { s: 122, t: 126, tone: 3, gloves: RNDS },
  { s: 172, t: 110, tone: 1, gloves: '#8A8A8A' },
  { s: 268, t: 58, tone: 0 },
  { s: 60, t: 212, tone: 2 },
  { s: 300, t: 200, tone: 1 },
  { s: 300, t: 110, tone: 2 },
];

const CLUB_PEOPLE: Figure[] = [
  { s: 46, t: 126, tone: 2 },
  { s: 46, t: 168, tone: 0 },
  { s: 160, t: 150, tone: 3 },
  { s: 203, t: 111, tone: 0 },
  { s: 206, t: 156, tone: 2 },
  { s: 262, t: 150, tone: 1 },
  { s: 312, t: 96, tone: 0 },
  { s: 120, t: 214, tone: 1 },
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
    <svg viewBox="0 0 1000 600" className="building-art" aria-hidden="true">
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
        <radialGradient id="bld-sheen" cx="0.32" cy="0.28" r="0.75">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
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

      {/* Table grid */}
      <g stroke="#E4E4E4" strokeWidth="1">
        <line x1="-40" y1="600" x2="1000" y2="0" /><line x1="-40" y1="520" x2="860" y2="0" /><line x1="80" y1="600" x2="1000" y2="69" /><line x1="240" y1="600" x2="1000" y2="161" />
        <line x1="0" y1="20" x2="1000" y2="597" /><line x1="0" y1="110" x2="850" y2="600" /><line x1="150" y1="0" x2="1000" y2="490" />
      </g>

      {/* Base plate and its shadow on the table */}
      <polygon points="618,118 935,301 427.5,594 110.4,411" fill="#000" fillOpacity="0.1" filter="url(#bld-blur-l)" />
      <polygon points="600,96 917,279 409.5,572 92.4,389" fill="url(#bld-top)" stroke="#E2E2E2" />
      <polygon points="917,279 917,293 409.5,586 409.5,572" fill="url(#bld-side-right)" />
      <polygon points="409.5,572 409.5,586 92.4,403 92.4,389" fill="url(#bld-side-left)" />

      {/* RNDS floor */}
      <polygon points="877,280 877,298 660.5,423 660.5,405" fill="url(#bld-side-right)" />
      <polygon points="660.5,405 660.5,423 383.5,263 383.5,245" fill="url(#bld-side-left)" />
      <polygon points="600,120 877,280 660.5,405 383.5,245" fill="url(#bld-top)" stroke="#E3E3E3" />
      <g stroke="#F0F0F0" strokeWidth="1"><line x1="655" y1="152" x2="438" y2="277" /><line x1="710" y1="184" x2="493" y2="309" /><line x1="765" y1="216" x2="548" y2="341" /><line x1="820" y1="248" x2="603" y2="373" /></g>
      <g clipPath="url(#bld-clip-rnds)" filter="url(#bld-blur-m)" fill="#000" fillOpacity="0.09">
        <polygon points={points(R, [[0, 0], [0, 250], [22, 250], [22, 0]])} />
        <polygon points={points(R, [[0, 0], [320, 0], [320, 22], [0, 22]])} />
      </g>
      <polygon points="600,120 383.5,245 383.5,150 600,25" fill="url(#bld-wall-left)" />
      <polygon points="600,120 877,280 877,185 600,25" fill="url(#bld-wall-right)" />
      <line x1="383.5" y1="150" x2="600" y2="25" stroke="#D6D6D6" strokeWidth="1.5" />
      <line x1="600" y1="25" x2="877" y2="185" stroke="#E0E0E0" strokeWidth="1.5" />
      <line x1="600" y1="25" x2="600" y2="120" stroke="#D2D2D2" strokeWidth="1" />
      {/* RNDS logo as in the brand kit: Kode Mono Bold, black on light, red dot top right, no tilt or effect */}
      <g transform="matrix(0.866 -0.5 0 1 446 190)">
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
      {RNDS_PEOPLE.map((figure) => (
        <Person key={`r-${figure.s}-${figure.t}`} origin={R} {...figure} />
      ))}
      <rect x="624" y="293" width="4" height="32" rx="2" fill="url(#bld-post)" />

      {/* Club 421 floor */}
      <polygon points="626,425 626,443 409.5,568 409.5,550" fill="url(#bld-side-right)" />
      <polygon points="409.5,550 409.5,568 132.4,408 132.4,390" fill="url(#bld-side-left)" />
      <polygon points="348.9,265 626,425 409.5,550 132.4,390" fill="url(#bld-top)" stroke="#E3E3E3" />
      <g stroke="#F0F0F0" strokeWidth="1"><line x1="404" y1="297" x2="187" y2="422" /><line x1="459" y1="329" x2="242" y2="454" /><line x1="514" y1="361" x2="297" y2="486" /><line x1="569" y1="393" x2="352" y2="518" /></g>
      <g clipPath="url(#bld-clip-club)" filter="url(#bld-blur-m)" fill="#000" fillOpacity="0.09">
        <polygon points={points(C, [[0, 0], [0, 250], [22, 250], [22, 0]])} />
        <polygon points={points(C, [[0, 0], [320, 0], [320, 16], [0, 16]])} />
      </g>
      <polygon points="348.9,265 132.4,390 132.4,295 348.9,170" fill="url(#bld-wall-left)" />
      <line x1="132.4" y1="295" x2="348.9" y2="170" stroke="#D6D6D6" strokeWidth="1.5" />
      <text transform="matrix(0.866 -0.5 0 1 160 300)" fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif" fontWeight="800" fontStyle="italic" fontSize="34" fill={CLUB} letterSpacing="2">421</text>
      <text transform="matrix(0.866 -0.5 0 1 162 316)" fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif" fontWeight="600" fontSize="10" fill={CLUB} letterSpacing="3">CLUB</text>
      <line x1="246" y1="268" x2="336" y2="216" stroke="#CFCFCF" strokeWidth="2" />
      <rect x="252" y="250" width="5" height="14" fill={CLUB_SOFT} /><rect x="266" y="242" width="5" height="14" fill="#C8C8C8" /><rect x="282" y="233" width="5" height="14" fill={ALERT} fillOpacity="0.85" /><rect x="298" y="224" width="5" height="14" fill={CLUB_SOFT} /><rect x="316" y="214" width="5" height="14" fill="#C8C8C8" />
      <polygon points="348.9,265 626,425 626,401 348.9,241" fill="url(#bld-wall-right)" fillOpacity="0.9" />
      <line x1="348.9" y1="241" x2="626" y2="401" stroke="#E0E0E0" strokeWidth="1.5" />

      <FloorText origin={C} s={70} t={112} alongT size={18}>BAR</FloorText>
      <FloorText origin={C} s={150} t={236} size={18}>TABLES</FloorText>
      <Route origin={C} color={CLUB} solid={[[40, 184], [290, 184], [290, 142]]} dashed={[[40, 196], [302, 196], [302, 142]]} />

      {/* Bar counter */}
      <polygon points="366.2,282 193,382 193,412 366.2,312" fill="#000" fillOpacity="0.1" filter="url(#bld-blur-m)" />
      <polygon points="366.2,276 193,376 193,406 366.2,306" fill="url(#bld-side-right)" />
      <polygon points="340.2,261 366.2,276 193,376 167,361" fill="url(#bld-top)" stroke="#E0E0E0" />
      <line x1="345" y1="270" x2="180" y2="365" stroke="#DADADA" />
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
      {CLUB_PEOPLE.map((figure) => (
        <Person key={`c-${figure.s}-${figure.t}`} origin={C} {...figure} />
      ))}

      {/* Leaders from each floor to its label */}
      <line x1="760" y1="110" x2="760" y2="160" stroke={RNDS} strokeOpacity="0.6" strokeDasharray="3 4" />
      <circle cx="760" cy="162" r="3" fill={RNDS} />
      <line x1="150" y1="200" x2="150" y2="296" stroke={CLUB} strokeOpacity="0.6" strokeDasharray="3 4" />
      <circle cx="150" cy="298" r="3" fill={CLUB} />
    </svg>
  );
}
