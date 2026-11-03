import { useState } from 'react';
import type { FormEvent } from 'react';
import type { useGoals } from '../../data/tools';
import { daysFromToday, dueLabel } from '../../lib/dates';
import './Tools.css';

type Props = { api: ReturnType<typeof useGoals>; query: (text: string) => boolean };

const number = (value: number) => new Intl.NumberFormat('fr-FR').format(value);

/** Numbered goals with their progress: where you are, where you aim, by when. */
export default function GoalsPage({ api, query }: Props) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');
  const visible = api.goals.filter((g) => query(`${g.title} ${g.unit}`));

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(target.replace(/\s/g, '').replace(',', '.'));
    if (!title.trim() || !Number.isFinite(value) || value <= 0) return;
    api.add({ title: title.trim(), current: 0, target: value, unit: unit.trim(), due: null });
    setTitle('');
    setTarget('');
    setUnit('');
  }

  return (
    <section className="tool" aria-labelledby="tool-title">
      <div className="tool-head">
        <h1 id="tool-title" className="tool-title">
          <span className="tool-title-light">Objectifs</span> <span className="tool-title-bold">{api.goals.length}</span>
        </h1>
      </div>
      <form className="tool-add" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="goal-title">
          Objectif
        </label>
        <input id="goal-title" className="tool-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Objectif (ex. Clubs affiliés)" autoComplete="off" />
        <label className="visually-hidden" htmlFor="goal-target">
          Cible
        </label>
        <input id="goal-target" className="tool-input tool-input--date" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Cible" />
        <label className="visually-hidden" htmlFor="goal-unit">
          Unité
        </label>
        <input id="goal-unit" className="tool-input tool-input--date" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unité" />
        <button type="submit" className="tool-primary" disabled={!title.trim() || !target.trim()}>
          Ajouter
        </button>
      </form>

      {visible.length === 0 && <p className="tool-empty">Aucun objectif. Fixe-toi une cible chiffrée juste au-dessus.</p>}
      <div className="goals">
        {visible.map((goal) => {
          const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));
          const late = goal.due !== null && daysFromToday(goal.due) < 0 && percent < 100;
          return (
            <article key={goal.id} className="goal">
              <header className="goal-head">
                <h2 className="goal-title">{goal.title}</h2>
                <button type="button" className="tool-remove" onClick={() => api.remove(goal.id)} aria-label={`Supprimer l'objectif ${goal.title}`}>
                  ×
                </button>
              </header>
              <p className="goal-figure">
                <span className="goal-current">{number(goal.current)}</span>
                <span className="goal-target">
                  / {number(goal.target)} {goal.unit}
                </span>
              </p>
              <div className="progress progress--big" aria-label={`${percent} % atteint`}>
                <span style={{ width: `${percent}%` }} />
              </div>
              <div className="goal-foot">
                <span className="goal-percent">{percent} %</span>
                {goal.due && <span className={late ? 'goal-late' : 'goal-due'}>{late ? 'En retard' : `Pour ${dueLabel(goal.due)}`}</span>}
              </div>
              <div className="goal-edit">
                <label>
                  <span>Où j'en suis</span>
                  <input className="tool-input" inputMode="decimal" value={goal.current} onChange={(e) => api.update(goal.id, { current: Number(e.target.value.replace(/\s/g, '').replace(',', '.')) || 0 })} />
                </label>
                <label>
                  <span>Échéance</span>
                  <input className="tool-input" type="date" value={goal.due ?? ''} onChange={(e) => api.update(goal.id, { due: e.target.value || null })} />
                </label>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
