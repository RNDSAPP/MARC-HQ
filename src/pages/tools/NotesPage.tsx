import { useState } from 'react';
import type { Note } from '../../data/types';
import './Tools.css';

type Props = {
  notes: Note[];
  query: (text: string) => boolean;
  onAdd: () => string;
  onUpdate: (id: string, change: Partial<Pick<Note, 'title' | 'body' | 'pinned'>>) => void;
  onRemove: (id: string) => void;
};

const when = (time: number) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(time);

/** The project's notes: a list on the left, the open note on the right. Every keystroke is saved. */
export default function NotesPage({ notes, query, onAdd, onUpdate, onRemove }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = notes
    .filter((note) => query(`${note.title} ${note.body}`))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  const current = notes.find((note) => note.id === openId) ?? null;

  const create = () => setOpenId(onAdd());

  return (
    <section className={`tool notes${current ? ' notes--editing' : ''}`} aria-labelledby="tool-title">
      <div className="tool-head">
        <h1 id="tool-title" className="tool-title">
          <span className="tool-title-light">Notes</span> <span className="tool-title-bold">{notes.length}</span>
        </h1>
        <button type="button" className="tool-primary" onClick={create}>
          Nouvelle note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="tool-empty">
          Aucune note pour l'instant. Garde ici ce que tu ne veux pas oublier : un appel, un retour, une décision.
        </div>
      ) : (
        <div className="notes-body">
          <ul className="notes-list" aria-label="Toutes les notes">
            {visible.map((note) => (
              <li key={note.id}>
                <button type="button" className={`note-item${note.id === openId ? ' note-item--open' : ''}`} onClick={() => setOpenId(note.id)}>
                  <span className="note-item-title">
                    {note.pinned && <span className="note-pin" aria-label="Épinglée">●</span>}
                    {note.title || 'Sans titre'}
                  </span>
                  <span className="note-item-preview">{note.body.split('\n')[0] || 'Vide'}</span>
                  <span className="note-item-date">{when(note.updatedAt)}</span>
                </button>
              </li>
            ))}
            {visible.length === 0 && <li className="tool-empty">Aucune note ne correspond.</li>}
          </ul>

          {current ? (
            <article className="note-editor tool-card">
              <div className="note-editor-bar">
                <button type="button" className="tool-ghost note-back" onClick={() => setOpenId(null)}>
                  ← Notes
                </button>
                <span className="note-saved">Enregistrée · {when(current.updatedAt)}</span>
                <button type="button" className="tool-ghost" aria-pressed={current.pinned} onClick={() => onUpdate(current.id, { pinned: !current.pinned })}>
                  {current.pinned ? 'Désépingler' : 'Épingler'}
                </button>
                <button
                  type="button"
                  className="tool-ghost tool-ghost--danger"
                  onClick={() => {
                    onRemove(current.id);
                    setOpenId(null);
                  }}
                >
                  Supprimer
                </button>
              </div>
              <label className="visually-hidden" htmlFor="note-title">
                Titre
              </label>
              <input
                id="note-title"
                className="note-title-input"
                value={current.title}
                placeholder="Titre"
                onChange={(event) => onUpdate(current.id, { title: event.target.value })}
              />
              <label className="visually-hidden" htmlFor="note-body">
                Texte
              </label>
              <textarea
                id="note-body"
                className="note-body-input"
                value={current.body}
                placeholder="Écris ici…"
                onChange={(event) => onUpdate(current.id, { body: event.target.value })}
              />
            </article>
          ) : (
            <p className="note-placeholder">Choisis une note dans la liste, ou crée-en une.</p>
          )}
        </div>
      )}
    </section>
  );
}
