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
const RNDS = '#F04A2A';
const RNDS_SOFT = '#F58A70';
const CLUB = '#1F9A5A';
const CLUB_SOFT = '#8FE0B0';
const ALERT = '#F0B44C';

/**
 * Drawing taken from reference/maquette.dc.html. Attribute names were adapted to React
 * recoloured as a white scale model, with each project's colour kept on a few details.
 */
function BuildingArt() {
  return (
    <svg viewBox="0 0 1000 600" className="building-art" aria-hidden="true">
      <g stroke="#E4E4E4" strokeWidth="1">
      <line x1="-40" y1="600" x2="1000" y2="0"/><line x1="-40" y1="520" x2="860" y2="0"/><line x1="80" y1="600" x2="1000" y2="69"/><line x1="240" y1="600" x2="1000" y2="161"/>
      <line x1="0" y1="20" x2="1000" y2="597"/><line x1="0" y1="110" x2="850" y2="600"/><line x1="150" y1="0" x2="1000" y2="490"/>
      </g>
      <polygon points="600,96 917,279 409.5,572 92.4,389" fill="#F7F7F7" stroke="#E2E2E2"/>
      <polygon points="917,279 917,291 409.5,584 409.5,572" fill="#DEDEDE"/>
      <polygon points="409.5,572 409.5,584 92.4,401 92.4,389" fill="#D2D2D2"/>

      <polygon points="877,280 877,296 660.5,421 660.5,405" fill="#E2E2E2"/>
      <polygon points="660.5,405 660.5,421 383.5,261 383.5,245" fill="#D3D3D3"/>
      <polygon points="600,120 877,280 660.5,405 383.5,245" fill="#FFFFFF" stroke="#E3E3E3"/>
      <g stroke="#F0F0F0" strokeWidth="1"><line x1="655" y1="152" x2="438" y2="277"/><line x1="710" y1="184" x2="493" y2="309"/><line x1="765" y1="216" x2="548" y2="341"/><line x1="820" y1="248" x2="603" y2="373"/></g>
      <polygon points="600,120 383.5,245 383.5,150 600,25" fill="#EAEAEA"/>
      <polygon points="600,120 877,280 877,185 600,25" fill="#F5F5F5"/>
      <line x1="383.5" y1="150" x2="600" y2="25" stroke="#D6D6D6" strokeWidth="1.5"/>
      <line x1="600" y1="25" x2="877" y2="185" stroke="#E0E0E0" strokeWidth="1.5"/>
      <line x1="600" y1="25" x2="600" y2="120" stroke="#CDCDCD" strokeWidth="1"/>
      <text transform="matrix(0.866 0.5 0 1 652 108)" fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif" fontWeight="600" fontSize="36" fill={RNDS} letterSpacing="4">RNDS</text>
      <text transform="matrix(0.866 0.5 0 1 655 126)" fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif" fontSize="10" fill={RNDS_SOFT} letterSpacing="3">BOXING CLUB</text>
      <polygon points="430,183 560,108 560,148 430,223" fill="#EDEDED" stroke="#CFCFCF"/>
      <polygon points="440,190 550,127 550,141 440,204" fill={RNDS} fillOpacity="0.25"/>
      <line x1="626" y1="40" x2="626" y2="92" stroke="#CFCFCF"/>
      <ellipse cx="626" cy="96" rx="16" ry="6" fill="#CDCDCD"/>
      <polygon points="612,98 640,98 742,255 626,322 510,255" fill="#FFFFFF" fillOpacity="0.6"/>
      <line x1="808" y1="192" x2="808" y2="228" stroke="#B4B4B4" strokeWidth="2"/>
      <rect x="801" y="228" width="14" height="38" rx="6" fill={RNDS}/>
      <rect x="801" y="236" width="14" height="4" fill="#C2381C"/>
      <line x1="842" y1="212" x2="842" y2="248" stroke="#B4B4B4" strokeWidth="2"/>
      <rect x="835" y="248" width="14" height="38" rx="6" fill={RNDS}/>
      <rect x="835" y="256" width="14" height="4" fill="#C2381C"/>
      <polygon points="504.7,255 626,325 626,337 504.7,267" fill="#E6E6E6"/>
      <polygon points="626,325 747.2,255 747.2,267 626,337" fill="#D8D8D8"/>
      <polygon points="626,185 747.2,255 626,325 504.7,255" fill="#FAFAFA" stroke="#DADADA"/>
      <polygon points="626,203 716,255 626,307 536,255" fill="none" stroke={RNDS} strokeOpacity="0.4"/>
      <circle cx="626" cy="255" r="14" fill="none" stroke={RNDS} strokeOpacity="0.35"/>
      <line x1="626" y1="185" x2="626" y2="155" stroke="#BDBDBD" strokeWidth="3"/>
      <line x1="747.2" y1="255" x2="747.2" y2="225" stroke="#BDBDBD" strokeWidth="3"/>
      <line x1="504.7" y1="255" x2="504.7" y2="225" stroke="#BDBDBD" strokeWidth="3"/>
      <polygon points="626,155 747.2,225 626,295 504.7,225" fill="none" stroke={RNDS} strokeWidth="1.6"/>
      <polygon points="626,167 747.2,237 626,307 504.7,237" fill="none" stroke={RNDS} strokeWidth="1.6"/>
      <polygon points="626,179 747.2,249 626,319 504.7,249" fill="none" stroke={RNDS} strokeWidth="1.2" strokeOpacity="0.6"/>
      <g><rect x="592" y="224" width="9" height="20" rx="4.5" fill="#9C9C9C"/><circle cx="596.5" cy="217" r="5.5" fill="#9C9C9C"/><circle cx="604" cy="229" r="3.5" fill={RNDS}/><circle cx="590" cy="231" r="3.5" fill={RNDS}/></g>
      <g><rect x="649" y="242" width="9" height="20" rx="4.5" fill="#B9B9B9"/><circle cx="653.5" cy="235" r="5.5" fill="#B9B9B9"/><circle cx="646" cy="247" r="3.5" fill="#8A8A8A"/><circle cx="660" cy="249" r="3.5" fill="#8A8A8A"/></g>
      <g><rect x="815" y="268" width="9" height="20" rx="4.5" fill="#A8A8A8"/><circle cx="819.5" cy="261" r="5.5" fill="#A8A8A8"/></g>
      <g><rect x="468" y="270" width="9" height="20" rx="4.5" fill="#C7C7C7"/><circle cx="472.5" cy="263" r="5.5" fill="#C7C7C7"/></g>
      <g><rect x="700" y="318" width="9" height="20" rx="4.5" fill="#B0B0B0"/><circle cx="704.5" cy="311" r="5.5" fill="#B0B0B0"/></g>
      <g><rect x="760" y="300" width="9" height="20" rx="4.5" fill="#C7C7C7"/><circle cx="764.5" cy="293" r="5.5" fill="#C7C7C7"/></g>

      <polygon points="626,425 626,441 409.5,566 409.5,550" fill="#E2E2E2"/>
      <polygon points="409.5,550 409.5,566 132.4,406 132.4,390" fill="#D3D3D3"/>
      <polygon points="348.9,265 626,425 409.5,550 132.4,390" fill="#FFFFFF" stroke="#E3E3E3"/>
      <g stroke="#F0F0F0" strokeWidth="1"><line x1="404" y1="297" x2="187" y2="422"/><line x1="459" y1="329" x2="242" y2="454"/><line x1="514" y1="361" x2="297" y2="486"/><line x1="569" y1="393" x2="352" y2="518"/></g>
      <polygon points="348.9,265 132.4,390 132.4,295 348.9,170" fill="#EAEAEA"/>
      <line x1="132.4" y1="295" x2="348.9" y2="170" stroke="#D6D6D6" strokeWidth="1.5"/>
      <text transform="matrix(0.866 -0.5 0 1 160 300)" fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif" fontWeight="600" fontSize="34" fill={CLUB} letterSpacing="3">421</text>
      <text transform="matrix(0.866 -0.5 0 1 162 316)" fontFamily="-apple-system, BlinkMacSystemFont, Geist, sans-serif" fontSize="10" fill={CLUB_SOFT} letterSpacing="3">CLUB</text>
      <line x1="246" y1="268" x2="336" y2="216" stroke="#CFCFCF" strokeWidth="2"/>
      <rect x="252" y="250" width="5" height="14" fill={CLUB} fillOpacity="0.75"/><rect x="266" y="242" width="5" height="14" fill="#BDBDBD"/><rect x="282" y="233" width="5" height="14" fill={ALERT} fillOpacity="0.8"/><rect x="298" y="224" width="5" height="14" fill={CLUB} fillOpacity="0.75"/><rect x="316" y="214" width="5" height="14" fill="#BDBDBD"/>
      <polygon points="348.9,265 626,425 626,401 348.9,241" fill="#F5F5F5" fillOpacity="0.9"/>
      <line x1="348.9" y1="241" x2="626" y2="401" stroke="#E0E0E0" strokeWidth="1.5"/>
      <polygon points="366.2,276 193,376 193,406 366.2,306" fill="#E3E3E3"/>
      <polygon points="340.2,261 366.2,276 193,376 167,361" fill="#F7F7F7"/>
      <line x1="345" y1="270" x2="180" y2="365" stroke="#DADADA"/>
      <g><rect x="228" y="358" width="9" height="20" rx="4.5" fill="#B0B0B0"/><circle cx="232.5" cy="351" r="5.5" fill="#B0B0B0"/></g>
      <g><rect x="276" y="331" width="9" height="20" rx="4.5" fill="#C7C7C7"/><circle cx="280.5" cy="324" r="5.5" fill="#C7C7C7"/></g>
      <line x1="392" y1="318" x2="392" y2="356" stroke="#CFCFCF"/>
      <ellipse cx="392" cy="360" rx="13" ry="5" fill="#CDCDCD"/>
      <polygon points="380,362 404,362 440,405 392,430 344,405" fill="#FFFFFF" fillOpacity="0.6"/>
      <line x1="392" y1="398" x2="392" y2="422" stroke="#B4B4B4" strokeWidth="3"/>
      <ellipse cx="392" cy="398" rx="38" ry="21" fill="#EFEFEF" stroke={CLUB} strokeOpacity="0.55"/>
      <rect x="380" y="389" width="9" height="9" rx="2" fill="#9C9C9C" transform="rotate(20 384.5 393.5)"/>
      <rect x="394" y="394" width="9" height="9" rx="2" fill="#9C9C9C" transform="rotate(-15 398.5 398.5)"/>
      <rect x="405" y="385" width="9" height="9" rx="2" fill={RNDS} transform="rotate(35 409.5 389.5)"/>
      <g><rect x="354" y="400" width="9" height="20" rx="4.5" fill="#9C9C9C"/><circle cx="358.5" cy="393" r="5.5" fill="#9C9C9C"/></g>
      <g><rect x="424" y="402" width="9" height="20" rx="4.5" fill="#B9B9B9"/><circle cx="428.5" cy="395" r="5.5" fill="#B9B9B9"/></g>
      <g><rect x="388" y="426" width="9" height="20" rx="4.5" fill="#A8A8A8"/><circle cx="392.5" cy="419" r="5.5" fill="#A8A8A8"/></g>
      <line x1="500" y1="468" x2="500" y2="490" stroke="#B4B4B4" strokeWidth="3"/>
      <ellipse cx="500" cy="468" rx="32" ry="18" fill="#EFEFEF"/>
      <rect x="494" y="462" width="8" height="8" rx="2" fill="#9C9C9C" transform="rotate(10 498 466)"/>
      <g><rect x="526" y="467" width="9" height="20" rx="4.5" fill="#B9B9B9"/><circle cx="530.5" cy="460" r="5.5" fill="#B9B9B9"/></g>
      <g><rect x="466" y="478" width="9" height="20" rx="4.5" fill="#C7C7C7"/><circle cx="470.5" cy="471" r="5.5" fill="#C7C7C7"/></g>
      <g><rect x="300" y="470" width="9" height="20" rx="4.5" fill="#B0B0B0"/><circle cx="304.5" cy="463" r="5.5" fill="#B0B0B0"/></g>

      <line x1="760" y1="110" x2="760" y2="160" stroke={RNDS} strokeOpacity="0.6" strokeDasharray="3 4"/>
      <circle cx="760" cy="162" r="3" fill={RNDS}/>
      <line x1="150" y1="200" x2="150" y2="296" stroke={CLUB} strokeOpacity="0.6" strokeDasharray="3 4"/>
      <circle cx="150" cy="298" r="3" fill={CLUB}/>
    </svg>
  );
}
