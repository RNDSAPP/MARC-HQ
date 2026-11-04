import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FormEvent } from 'react';
import ViewSwitch, { useView } from '../../components/ViewSwitch';
import type { Project } from '../../data/types';
import { removeRecord, saveRecord, useRecords } from '../../lib/records';
import type { RecordRow } from '../../lib/records';
import './Tools.css';

const NETWORKS = ['Tous', 'Instagram', 'TikTok', 'YouTube'] as const;
const VIEWS = [
  { key: 'cartes', label: 'Cartes' },
  { key: 'liste', label: 'Liste' },
  { key: 'colonnes', label: 'Par réseau' },
] as const;
/** The longest description each network takes. */
const LIMITS: Record<string, number> = { Instagram: 2200, TikTok: 4000, YouTube: 5000 };

/** Two kinds of templates: the description under the post, and the title shown on the video. */
const TYPES = [
  { key: 'description', label: 'Descriptions' },
  { key: 'titre', label: 'Titres vidéo' },
] as const;
type TemplateType = (typeof TYPES)[number]['key'];
export const typeOf = (record: RecordRow): TemplateType => (record.data.type === 'titre' ? 'titre' : 'description');

/** A title on screen reads in about two seconds: past this, it gets long. */
const TITLE_LIMIT = 70;
/** The usual looks of a text on a TikTok or a Reel. */
const STYLES = ['Contour', 'Fond blanc', 'Fond noir'] as const;

/** The title as it will look in the middle of the video (9:16, white bold text). */
export function TitlePreview({ text, look, small = false }: { text: string; look?: string; small?: boolean }) {
  const style = look === 'Fond blanc' ? 'white' : look === 'Fond noir' ? 'black' : 'outline';
  return (
    <div className={`title-preview${small ? ' title-preview--small' : ''}`} aria-hidden="true">
      <span className={`title-preview-text title-preview-text--${style}`}>{text || 'Ton texte ici'}</span>
    </div>
  );
}

/** Copies a template's text; true when it went through. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** A project's description templates, newest first (shared with the Publications widget). */
export function useTemplates(projectId: string) {
  return useRecords()
    .filter((record) => record.project_id === projectId && record.kind === 'modele')
    .sort((a, b) => (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at));
}

/**
 * Modèles: the project's ready-made descriptions (captions, hashtags, calls to action) and video
 * titles (the text put in the middle of a TikTok or a Reel, previewed as it will look) for
 * Instagram, TikTok or YouTube. One tap copies one, ready to paste in the app. Kept in Supabase,
 * the same on the phone and the computer.
 */
export default function TemplatesPage({ project, query }: { project: Project; query: (text: string) => boolean }) {
  const templates = useTemplates(project.id);
  const [filter, setFilter] = useState<string>('Tous');
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [name, setName] = useState('');
  const [network, setNetwork] = useState<string>('Tous');
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useView('modeles', VIEWS);
  const [type, setType] = useView('modeles-type', TYPES);
  const [look, setLook] = useState<string>('Contour');
  const isTitle = type === 'titre';

  const ofType = templates.filter((record) => typeOf(record) === type);
  const visible = ofType.filter((record) => (filter === 'Tous' || record.data.network === filter || record.data.network === 'Tous') && query(`${record.data.name} ${record.data.text ?? ''}`));
  const limit = isTitle ? TITLE_LIMIT : LIMITS[network];

  function reset() {
    setEditing(null);
    setName('');
    setNetwork('Tous');
    setText('');
    setLook('Contour');
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !text.trim()) return;
    setBusy(true);
    const failed = await saveRecord(project.id, 'modele', { name: name.trim(), network, text: text.trim(), type, ...(isTitle ? { look } : {}) }, editing?.id);
    setBusy(false);
    setMessage(failed || (editing ? `Modèle modifié : ${name.trim()}.` : `Modèle ajouté : ${name.trim()}.`));
    if (!failed) reset();
  }

  async function copy(record: RecordRow) {
    const ok = await copyText(record.data.text ?? '');
    setCopied(ok ? record.id : '');
    setMessage(ok ? '' : 'La copie n’a pas marché : sélectionne le texte et copie-le à la main.');
    if (ok) window.setTimeout(() => setCopied((current) => (current === record.id ? '' : current)), 2000);
  }

  const edit = (record: RecordRow) => {
    setEditing(record);
    setName(record.data.name ?? '');
    setNetwork(record.data.network ?? 'Tous');
    setText(record.data.text ?? '');
    setLook(record.data.look ?? 'Contour');
    setType(typeOf(record));
    setMessage('');
    document.getElementById('template-name')?.focus();
  };
  const remove = async (record: RecordRow) => {
    const failed = await removeRecord(record.id);
    setMessage(failed || `Modèle supprimé : ${record.data.name}.`);
  };
  const card = (record: RecordRow) => (
    <li key={record.id} className={`tool-card template${typeOf(record) === 'titre' ? ' template--title' : ''}`}>
      {typeOf(record) === 'titre' && <TitlePreview text={record.data.text ?? ''} look={record.data.look} />}
      <div className="template-head">
        <span className="template-name">{record.data.name}</span>
        {record.data.network && record.data.network !== 'Tous' && <span className="veille-network">{record.data.network}</span>}
      </div>
      {typeOf(record) === 'description' && <p className="template-body">{record.data.text}</p>}
      <div className="template-foot">
        <span className="template-count">{(record.data.text ?? '').length} caractères</span>
        <span className="template-form-actions">
          <button type="button" className="tool-ghost" onClick={() => edit(record)}>
            Modifier
          </button>
          <button type="button" className="tool-remove" onClick={() => remove(record)} aria-label={`Supprimer le modèle ${record.data.name}`}>
            ×
          </button>
          <button type="button" className="tool-primary template-copy" onClick={() => copy(record)}>
            {copied === record.id ? 'Copié ✓' : 'Copier'}
          </button>
        </span>
      </div>
    </li>
  );

  return (
    <section className="tool" aria-labelledby="tool-title">
      <div className="tool-head">
        <h1 id="tool-title" className="tool-title">
          <span className="tool-title-light">Modèles</span> <span className="tool-title-bold">{templates.length}</span>
        </h1>
        <div className="tool-segment" role="group" aria-label="Sorte de modèle">
          {TYPES.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={type === item.key}
              onClick={() => {
                setType(item.key);
                if (editing && typeOf(editing) !== item.key) reset();
              }}
            >
              {item.label} <span className="tool-segment-count">{templates.filter((record) => typeOf(record) === item.key).length || ''}</span>
            </button>
          ))}
        </div>
        <div className="tool-head-actions">
          <ViewSwitch views={VIEWS} value={view} onChange={setView} />
          {view !== 'colonnes' && (
            <div className="tool-segment" role="group" aria-label="Réseau">
              {NETWORKS.map((item) => (
                <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <form className="tool-card template-form" onSubmit={save}>
        <div className="template-form-row">
          <label className="visually-hidden" htmlFor="template-name">
            Nom du modèle
          </label>
          <input id="template-name" className="tool-input" value={name} onChange={(e) => setName(e.target.value)} placeholder={isTitle ? 'Nom (ex. Accroche erreurs)' : 'Nom du modèle (ex. Reel entraînement)'} autoComplete="off" />
          <label className="visually-hidden" htmlFor="template-network">
            Réseau
          </label>
          <select id="template-network" className="tool-input template-network" value={network} onChange={(e) => setNetwork(e.target.value)}>
            {NETWORKS.map((item) => (
              <option key={item} value={item}>
                {item === 'Tous' ? 'Tous les réseaux' : item}
              </option>
            ))}
          </select>
          {isTitle && (
            <>
              <label className="visually-hidden" htmlFor="template-look">
                Style du texte
              </label>
              <select id="template-look" className="tool-input template-network" value={look} onChange={(e) => setLook(e.target.value)}>
                {STYLES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>
        <label className="visually-hidden" htmlFor="template-text">
          {isTitle ? 'Texte à l’écran' : 'Texte de la description'}
        </label>
        <textarea
          id="template-text"
          className={`tool-input template-text${isTitle ? ' template-text--short' : ''}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isTitle ? 'Le texte au milieu de la vidéo (ex. 3 erreurs qui ruinent ton jab)' : 'Ta description : accroche, texte, appel à l’action, hashtags…'}
          rows={isTitle ? 2 : 5}
        />
        {isTitle && <TitlePreview text={text} look={look} small />}
        <div className="template-form-foot">
          <span className={`template-count${limit && text.length > limit ? ' template-count--over' : ''}`}>
            {text.length}
            {limit ? ` / ${limit}` : ''} caractères{isTitle ? ' · court = lisible en 2 secondes' : ''}
          </span>
          <span className="template-form-actions">
            {editing && (
              <button type="button" className="tool-ghost" onClick={reset}>
                Annuler
              </button>
            )}
            <button type="submit" className="tool-primary" disabled={busy || !name.trim() || !text.trim()}>
              {editing ? 'Enregistrer' : 'Ajouter'}
            </button>
          </span>
        </div>
      </form>

      {message && (
        <p className="mail-message" role="status">
          {message}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="tool-empty">
          {ofType.length === 0
            ? isTitle
              ? 'Pas encore de titre. Ajoute tes textes d’accroche juste au-dessus : tu vois comment ils rendent au milieu de la vidéo, et tu les copies en un appui.'
              : 'Pas encore de modèle. Ajoute tes descriptions types juste au-dessus : tu les copieras en un appui au moment de publier.'
            : 'Aucun modèle pour ce réseau.'}
        </p>
      ) : view === 'liste' ? (
        <ul className="tool-card template-rows">
          {visible.map((record) => (
            <li key={record.id} className="template-row">
              <button type="button" className="template-row-main" onClick={() => edit(record)}>
                <span className="template-row-name">
                  {record.data.name}
                  {record.data.network && record.data.network !== 'Tous' && <span className="veille-network">{record.data.network}</span>}
                </span>
                <span className="template-row-text">{(record.data.text ?? '').split('\n')[0]}</span>
              </button>
              <button type="button" className="tool-primary template-copy" onClick={() => copy(record)}>
                {copied === record.id ? 'Copié ✓' : 'Copier'}
              </button>
            </li>
          ))}
        </ul>
      ) : view === 'colonnes' ? (
        <div className="task-columns">
          {NETWORKS.map((item) => {
            const items = visible.filter((record) => (record.data.network || 'Tous') === item);
            return (
              <section key={item} className="task-column" aria-label={item}>
                <h2 className="task-column-title">
                  {item === 'Tous' ? 'Tous les réseaux' : item} <span>{items.length}</span>
                </h2>
                {items.length === 0 ? <p className="task-column-empty">Rien ici</p> : <ul className="templates templates--column">{items.map(card)}</ul>}
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="templates">{visible.map(card)}</ul>
      )}
    </section>
  );
}

/**
 * In Publications: the latest templates, each one tap from the clipboard, and the way to all of
 * them in the Modèles tool.
 */
export function TemplatesWidget({ project }: { project: Project }) {
  const templates = useTemplates(project.id).slice(0, 4);
  const [copied, setCopied] = useState('');
  return (
    <section className="templates-widget" aria-labelledby="templates-widget-title">
      <div className="templates-widget-head">
        <h2 id="templates-widget-title" className="templates-widget-title">
          Modèles de description et de titres
        </h2>
        <Link className="templates-widget-all" to={`/${project.id}/modeles`}>
          {templates.length ? 'Tous les modèles' : 'Ajouter un modèle'} →
        </Link>
      </div>
      {templates.length === 0 ? (
        <p className="templates-widget-empty">Range ici tes descriptions types et tes titres à mettre au milieu des vidéos, pour les copier en un appui.</p>
      ) : (
        <ul className="templates-widget-list">
          {templates.map((record) => (
            <li key={record.id}>
              <button
                type="button"
                className="templates-widget-item"
                onClick={async () => {
                  if (await copyText(record.data.text ?? '')) {
                    setCopied(record.id);
                    window.setTimeout(() => setCopied((current) => (current === record.id ? '' : current)), 2000);
                  }
                }}
              >
                <span className="templates-widget-name">
                  {record.data.name}
                  {typeOf(record) === 'titre' && <span className="veille-network">Titre</span>}
                </span>
                <span className="templates-widget-text">{record.data.text}</span>
                <span className="templates-widget-copy">{copied === record.id ? 'Copié ✓' : 'Copier'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
