import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { KINDS, removeRecord, saveRecord } from '../lib/records';
import type { RecordKind, RecordRow } from '../lib/records';
import './AgentDialog.css';

/**
 * Add or change a club, an ambassador, a BDE, a soirée or a post. Saved in Supabase, so it shows
 * at once everywhere (scene, table, figures, home) and, when dated, in Google Agenda.
 */
export default function RecordDialog({ projectId, kind, record, onClose, onDone }: {
  projectId: string;
  kind: RecordKind;
  /** Given: change this one (and offer to delete it). */
  record?: RecordRow;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const spec = KINDS[kind];
  const [values, setValues] = useState<Record<string, string>>(() => {
    const start: Record<string, string> = {};
    for (const field of spec.fields) start[field.key] = record?.data[field.key] ?? (field.type === 'select' ? field.options![0] : '');
    return start;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    first.current?.focus();
    const key = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  const name = values.name ?? values.title ?? '';

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const clean = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.trim()]));
    const failed = await saveRecord(projectId, kind, clean, record?.id);
    setBusy(false);
    if (failed) setError(failed);
    else onDone(record ? `${spec.title} modifié : ${name.trim()}.` : `${spec.title} ajouté : ${name.trim()}.`);
  }

  async function remove() {
    if (!record) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    await removeRecord(record.id);
    onDone(`${spec.title} supprimé : ${name}.`);
  }

  return (
    <div className="agent-dialog" role="dialog" aria-modal="true" aria-labelledby="record-title">
      <button type="button" className="agent-dialog-backdrop" aria-label="Fermer" onClick={onClose} />
      <form className="agent-dialog-panel" onSubmit={submit}>
        <h2 id="record-title" className="agent-dialog-title">
          {record ? `Modifier : ${record.data.name ?? record.data.title}` : `Ajouter un${spec.one === 'publication' || spec.one === 'soirée' ? 'e' : ''} ${spec.one}`}
        </h2>
        <div className="record-fields">
          {spec.fields.map((field, index) => (
            <label key={field.key} className="record-field">
              <span className="record-label">
                {field.label}
                {field.required && ' *'}
              </span>
              {field.type === 'select' ? (
                <select className="record-input" value={values[field.key]} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}>
                  {field.options!.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <input
                  ref={index === 0 ? first : undefined}
                  className="record-input"
                  type={field.type === 'number' ? 'text' : field.type}
                  inputMode={field.type === 'number' ? 'numeric' : undefined}
                  value={values[field.key]}
                  onChange={(e) => setValues({ ...values, [field.key]: field.type === 'number' ? e.target.value.replace(/[^\d\s]/g, '') : e.target.value })}
                  placeholder={field.placeholder}
                  required={field.required}
                />
              )}
            </label>
          ))}
        </div>
        {error && <p className="agent-dialog-error">{error}</p>}
        <div className="agent-dialog-actions">
          {record && (
            <button type="button" className="record-delete" onClick={remove} disabled={busy}>
              {confirming ? 'Confirmer la suppression' : 'Supprimer'}
            </button>
          )}
          <button type="button" className="agent-dialog-cancel" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="agent-dialog-send" disabled={busy || !name.trim()}>
            {busy ? '…' : record ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </form>
    </div>
  );
}
