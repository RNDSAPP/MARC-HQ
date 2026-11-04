import { useEffect, useRef } from 'react';
import type { PipelineTone, Project } from '../data/types';
import { useSynced } from '../hooks/useSynced';
import { initials } from '../lib/format';
import './EntitySheet.css';

/** What the sheet shows about a club, a student union, an ambassador, a post… */
export type Entity = {
  name: string;
  /** Stage or status, shown as a coloured tag. */
  stage: string;
  tone: PipelineTone;
  /** Known facts, read-only: label and value. */
  facts: [string, string][];
  /** The pipeline's action for this stage ("Signer", "Relancer"), if any. */
  action?: string;
};

type Details = { contact: string; phone: string; email: string; address: string; social: string; notes: string };

const EMPTY: Details = { contact: '', phone: '', email: '', address: '', social: '', notes: '' };

const FIELDS: { key: Exclude<keyof Details, 'notes'>; label: string; type: string; placeholder: string }[] = [
  { key: 'contact', label: 'Contact', type: 'text', placeholder: 'Nom et rôle' },
  { key: 'phone', label: 'Téléphone', type: 'tel', placeholder: '06 …' },
  { key: 'email', label: 'Email', type: 'email', placeholder: 'nom@exemple.fr' },
  { key: 'address', label: 'Adresse', type: 'text', placeholder: 'Rue, ville' },
  { key: 'social', label: 'Instagram ou site', type: 'text', placeholder: '@compte ou lien' },
];

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-');

type Props = {
  project: Project;
  entity: Entity;
  onClose: () => void;
  onAction: (label: string) => void;
  onAddTask: (text: string) => void;
};

/**
 * Card of one establishment or person, sliding in from the right (from the bottom on a phone):
 * what we know, then fields Marc fills in (saved in this browser, per project), and quick actions.
 */
export default function EntitySheet({ project, entity, onClose, onAction, onAddTask }: Props) {
  const [details, setDetails] = useSynced<Details>(`marc-hq:${project.id}:fiche:${slug(entity.name)}`, () => EMPTY);
  const closeRef = useRef<HTMLButtonElement>(null);
  const set = (key: keyof Details, value: string) => setDetails((prev) => ({ ...prev, [key]: value }));

  // Focus once (not at every re-render, which pulled the cursor out of the fields)
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close.current();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const tel = details.phone.replace(/[^\d+]/g, '');
  const maps = details.address ? `https://maps.apple.com/?q=${encodeURIComponent(details.address)}` : '';

  return (
    <div className="sheet-layer" data-project={project.id}>
      <button type="button" className="sheet-shade" aria-label="Fermer la fiche" onClick={onClose} />
      <aside className="esheet" role="dialog" aria-modal="true" aria-labelledby="esheet-title">
        <header className="esheet-head">
          <span className="esheet-avatar" aria-hidden="true">
            {initials(entity.name)}
          </span>
          <div className="esheet-title-block">
            <span className={`esheet-stage esheet-stage--${entity.tone}`}>{entity.stage}</span>
            <h2 id="esheet-title" className="esheet-title">
              {entity.name}
            </h2>
          </div>
          <button ref={closeRef} type="button" className="esheet-close" onClick={onClose} aria-label="Fermer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div className="esheet-actions">
          {entity.action && (
            <button type="button" className="esheet-primary" onClick={() => onAction(`${entity.action} : ${entity.name}`)}>
              {entity.action}
            </button>
          )}
          <a className={`esheet-quick${tel ? '' : ' esheet-quick--off'}`} href={tel ? `tel:${tel}` : undefined} aria-disabled={!tel}>
            Appeler
          </a>
          <a className={`esheet-quick${details.email ? '' : ' esheet-quick--off'}`} href={details.email ? `mailto:${details.email}` : undefined} aria-disabled={!details.email}>
            Écrire
          </a>
          <a className={`esheet-quick${maps ? '' : ' esheet-quick--off'}`} href={maps || undefined} target="_blank" rel="noreferrer" aria-disabled={!maps}>
            Itinéraire
          </a>
          <button type="button" className="esheet-quick" onClick={() => onAddTask(`Relancer ${entity.name}`)}>
            + Tâche
          </button>
        </div>

        <dl className="esheet-facts">
          {entity.facts.map(([label, value]) => (
            <div key={label} className="esheet-fact">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <div className="esheet-fields">
          <h3 className="esheet-h3">Coordonnées</h3>
          {FIELDS.map((field) => (
            <label key={field.key} className="esheet-field">
              <span>{field.label}</span>
              <input type={field.type} value={details[field.key]} placeholder={field.placeholder} onChange={(event) => set(field.key, event.target.value)} />
            </label>
          ))}
          <label className="esheet-field esheet-field--notes">
            <span>Notes</span>
            <textarea value={details.notes} placeholder="Ce qui s'est dit, la prochaine étape…" onChange={(event) => set('notes', event.target.value)} />
          </label>
          <p className="esheet-saved">Enregistré à chaque frappe, sur ton téléphone comme sur ton ordinateur.</p>
        </div>
      </aside>
    </div>
  );
}
