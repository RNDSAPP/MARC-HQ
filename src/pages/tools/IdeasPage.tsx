import { useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import ViewSwitch, { useView } from '../../components/ViewSwitch';
import type { Idea, IdeaStage } from '../../data/types';
import './Tools.css';

type Props = {
  ideas: Idea[];
  query: (text: string) => boolean;
  onAdd: (title: string) => void;
  onUpdate: (id: string, change: Partial<Pick<Idea, 'title' | 'detail' | 'stage'>>) => void;
  onRemove: (id: string) => void;
};

const STAGES: { key: IdeaStage; label: string; hint: string }[] = [
  { key: 'creuser', label: 'À creuser', hint: 'Pas encore réfléchie' },
  { key: 'tester', label: 'À tester', hint: 'On essaie en vrai' },
  { key: 'validee', label: 'Validées', hint: 'On la garde' },
];

const VIEWS = [
  { key: 'colonnes', label: 'Colonnes' },
  { key: 'liste', label: 'Liste' },
] as const;

/** The project's ideas, on three columns (or one list). Move a card with its arrows, or drag it on desktop. */
export default function IdeasPage({ ideas, query, onAdd, onUpdate, onRemove }: Props) {
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [over, setOver] = useState<IdeaStage | null>(null);
  const [view, setView] = useView('idees', VIEWS);
  const visible = ideas.filter((idea) => query(`${idea.title} ${idea.detail}`));

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = title.trim();
    if (!value) return;
    onAdd(value);
    setTitle('');
  }

  const drop = (stage: IdeaStage) => (event: DragEvent) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    if (id) onUpdate(id, { stage });
    setOver(null);
  };

  return (
    <section className="tool" aria-labelledby="tool-title">
      <div className="tool-head">
        <h1 id="tool-title" className="tool-title">
          <span className="tool-title-light">Idées</span> <span className="tool-title-bold">{ideas.length}</span>
        </h1>
        <ViewSwitch views={VIEWS} value={view} onChange={setView} />
      </div>

      <form className="tool-add" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="idea-title">
          Nouvelle idée
        </label>
        <input id="idea-title" className="tool-input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nouvelle idée" autoComplete="off" />
        <button type="submit" className="tool-primary" disabled={!title.trim()}>
          Ajouter
        </button>
      </form>

      {view === 'liste' && (
        <ul className="tool-card template-rows">
          {visible.length === 0 && <li className="tool-empty">Aucune idée pour l’instant.</li>}
          {visible.map((idea) => {
            const at = STAGES.findIndex((stage) => stage.key === idea.stage);
            return (
              <li key={idea.id} className="template-row">
                <span className="template-row-main">
                  <span className="template-row-name">
                    {idea.title}
                    <span className="veille-network">{STAGES[at]?.label}</span>
                  </span>
                  {idea.detail && <span className="template-row-text">{idea.detail}</span>}
                </span>
                <span className="idea-move">
                  <button type="button" className="tool-ghost" disabled={at <= 0} onClick={() => onUpdate(idea.id, { stage: STAGES[at - 1].key })} aria-label={`Ramener « ${idea.title} » d’une étape`}>
                    ←
                  </button>
                  <button type="button" className="tool-ghost" disabled={at >= STAGES.length - 1} onClick={() => onUpdate(idea.id, { stage: STAGES[at + 1].key })} aria-label={`Avancer « ${idea.title} » d’une étape`}>
                    →
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <div className="ideas" hidden={view === 'liste'}>
        {STAGES.map((stage, stageIndex) => {
          const items = visible.filter((idea) => idea.stage === stage.key);
          return (
            <section
              key={stage.key}
              className={`ideas-col${over === stage.key ? ' ideas-col--over' : ''}`}
              aria-label={stage.label}
              onDragOver={(event) => {
                event.preventDefault();
                setOver(stage.key);
              }}
              onDragLeave={() => setOver(null)}
              onDrop={drop(stage.key)}
            >
              <h2 className="ideas-col-title">
                {stage.label} <span>{items.length}</span>
              </h2>
              <p className="ideas-col-hint">{stage.hint}</p>
              <ul className="ideas-list">
                {items.map((idea) => (
                  <li
                    key={idea.id}
                    className="idea"
                    draggable={editing !== idea.id}
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', idea.id)}
                  >
                    {editing === idea.id ? (
                      <div className="idea-edit">
                        <label className="visually-hidden" htmlFor={`idea-${idea.id}-title`}>
                          Idée
                        </label>
                        <input id={`idea-${idea.id}-title`} className="tool-input" value={idea.title} onChange={(event) => onUpdate(idea.id, { title: event.target.value })} />
                        <label className="visually-hidden" htmlFor={`idea-${idea.id}-detail`}>
                          Détail
                        </label>
                        <textarea
                          id={`idea-${idea.id}-detail`}
                          className="tool-input idea-detail-input"
                          value={idea.detail}
                          placeholder="Pourquoi, comment, pour qui…"
                          onChange={(event) => onUpdate(idea.id, { detail: event.target.value })}
                        />
                        <div className="idea-actions">
                          <button type="button" className="tool-ghost tool-ghost--danger" onClick={() => onRemove(idea.id)}>
                            Supprimer
                          </button>
                          <button type="button" className="tool-primary tool-primary--small" onClick={() => setEditing(null)}>
                            Fermer
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button type="button" className="idea-open" onClick={() => setEditing(idea.id)}>
                          <span className="idea-title">{idea.title}</span>
                          {idea.detail && <span className="idea-detail">{idea.detail}</span>}
                        </button>
                        <div className="idea-move">
                          <button
                            type="button"
                            className="tool-ghost"
                            disabled={stageIndex === 0}
                            onClick={() => onUpdate(idea.id, { stage: STAGES[stageIndex - 1].key })}
                            aria-label={`Ramener « ${idea.title} » dans ${STAGES[Math.max(stageIndex - 1, 0)].label}`}
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            className="tool-ghost"
                            disabled={stageIndex === STAGES.length - 1}
                            onClick={() => onUpdate(idea.id, { stage: STAGES[stageIndex + 1].key })}
                            aria-label={`Passer « ${idea.title} » dans ${STAGES[Math.min(stageIndex + 1, STAGES.length - 1)].label}`}
                          >
                            →
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
                {items.length === 0 && <li className="ideas-empty">Rien ici</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </section>
  );
}
