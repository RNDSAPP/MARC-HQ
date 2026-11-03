import { useEffect } from 'react';
import AccountButton from '../components/AccountButton';
import AppRail from '../components/AppRail';
import HqMark from '../components/HqMark';
import Building from '../components/Building';
import ProjectCard from '../components/ProjectCard';
import { HomeTabBar } from '../components/TabBar';
import TodayTasks from '../components/TodayTasks';
import { openNewProject } from '../components/NewProjectDialog';
import { useProjects } from '../data/customProjects';
import { dayLabel, greeting, timeLabel } from '../lib/dates';
import './Home.css';

export default function Home() {
  const projects = useProjects();

  useEffect(() => {
    document.title = 'Marc HQ';
  }, []);

  if (!projects) return <div className="home" />;

  const agents = projects.flatMap((project) => project.agents);
  const active = agents.filter((agent) => agent.status !== 'done').length;
  const waiting = agents.filter((agent) => agent.status === 'wait').length;

  return (
    <div className="home">
      <AppRail projects={projects} />
      <main className="home-inner">
        {/* On phones, an iPhone-style top: the app bar (logo, name, Marc's round), a large hello
            and the two agent counts side by side. The desktop header below is hidden there. */}
        <header className="home-phone">
          <div className="home-phone-bar">
            <span className="home-phone-brand">
              <span className="home-phone-logo" aria-hidden="true">
                <HqMark size={18} />
              </span>
              Marc HQ
            </span>
            <AccountButton placement="down" />
          </div>
          <div className="home-phone-hello">
            <h1 className="home-phone-title">{greeting()} Marc</h1>
            <p className="home-phone-date">
              {dayLabel()} · {timeLabel()} · RNDS et Club 421
            </p>
          </div>
          <ul className="home-phone-stats" aria-label="État des agents">
            <li className="home-phone-stat">
              <span className="home-phone-stat-num">
                <span className="home-pill-dot home-pill-dot--work" aria-hidden="true" />
                {active}
              </span>
              <span className="home-phone-stat-label">{active > 1 ? 'agents au travail' : 'agent au travail'}</span>
            </li>
            <li className="home-phone-stat">
              <span className="home-phone-stat-num">
                <span className="home-pill-dot home-pill-dot--wait" aria-hidden="true" />
                {waiting}
              </span>
              <span className="home-phone-stat-label">{waiting > 1 ? 'attendent ta réponse' : 'attend ta réponse'}</span>
            </li>
          </ul>
        </header>

        <header className="home-header">
          <div className="home-title-block">
            <span className="home-logo" aria-hidden="true">
              <HqMark size={26} />
            </span>
            <div className="home-title-text">
              <span className="home-eyebrow">
                {greeting()} Marc · {dayLabel()} · {timeLabel()}
              </span>
              <h1 className="home-title">
                <span className="home-title-light">Marc HQ</span> <span className="home-title-bold">RNDS et Club 421</span>
              </h1>
            </div>
          </div>
          <ul className="home-pills" aria-label="État des agents">
            <li className="home-pill">
              <span className="home-pill-dot home-pill-dot--work" aria-hidden="true" />
              {active === 0 ? 'Aucun agent au travail' : `${active} ${active > 1 ? 'agents au travail' : 'agent au travail'}`}
            </li>
            <li className="home-pill">
              <span className="home-pill-dot home-pill-dot--wait" aria-hidden="true" />
              {waiting === 0 ? 'Personne n’attend ta réponse' : `${waiting} ${waiting > 1 ? 'attendent ta réponse' : 'attend ta réponse'}`}
            </li>
          </ul>
        </header>

        {/* The building has a floor for each of the two original projects; added ones get a card */}
        <Building projects={projects.filter((project) => !project.custom)} />

        <div className="home-grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}

          <button type="button" className="home-new" onClick={openNewProject}>
            <span className="home-new-plus" aria-hidden="true">
              +
            </span>
            <span className="home-new-title">Nouveau projet</span>
            <span className="home-new-sub">Son espace, ses outils, ses connexions</span>
          </button>

          <TodayTasks projects={projects} />
        </div>
      </main>
      <HomeTabBar projects={projects} />
    </div>
  );
}
