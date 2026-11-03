import { useEffect } from 'react';
import Building from '../components/Building';
import ProjectCard from '../components/ProjectCard';
import { getProjects } from '../data/api';
import { useData } from '../data/useData';
import { dayLabel, greeting, timeLabel } from '../lib/dates';
import './Home.css';

export default function Home() {
  const projects = useData('projects', getProjects);

  useEffect(() => {
    document.title = 'Marc HQ';
  }, []);

  if (!projects) return <div className="home" />;

  const agents = projects.flatMap((project) => project.agents);
  const active = agents.filter((agent) => agent.status !== 'done').length;
  const waiting = agents.filter((agent) => agent.status === 'wait').length;
  const today = projects.flatMap((project) =>
    project.home.todos.map((todo) => ({ ...todo, project })),
  );

  return (
    <div className="home">
      <main className="home-inner">
        <header className="home-header">
          <div className="home-title-block">
            <span className="home-logo" aria-hidden="true">
              HQ
            </span>
            <div className="home-title-text">
              <span className="home-eyebrow">
                {dayLabel()} · {timeLabel()}
              </span>
              <h1 className="home-title">{greeting()} Marc. Deux étages, une seule boutique.</h1>
            </div>
          </div>
          <ul className="home-pills" aria-label="État des agents">
            <li className="home-pill">
              <span className="home-pill-dot home-pill-dot--work" aria-hidden="true" />
              {active} {active > 1 ? 'agents au travail' : 'agent au travail'}
            </li>
            <li className="home-pill">
              <span className="home-pill-dot home-pill-dot--wait" aria-hidden="true" />
              {waiting} {waiting > 1 ? 'attendent ta réponse' : 'attend ta réponse'}
            </li>
          </ul>
        </header>

        <Building projects={projects} />

        <div className="home-grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}

          <section className="home-today" aria-labelledby="today-title">
            <h2 id="today-title" className="home-today-title">
              Ce qui t'attend aujourd'hui
            </h2>
            <ul className="home-today-list">
              {today.map((todo) => (
                <li key={`${todo.project.id}-${todo.text}`} className="home-today-item">
                  <span className="home-today-tag" data-project={todo.project.id}>
                    {todo.project.home.shortTag}
                  </span>
                  {todo.text}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
