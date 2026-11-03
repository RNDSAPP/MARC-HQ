import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { handToAgent } from '../lib/agents';
import './AgentDialog.css';

/**
 * "Confier à l'agent": Marc writes what the project's Claude agents should do; it goes to Marc
 * HQ's request list, which the agents read from Claude Code (marc-hq skill).
 */
export default function AgentDialog({ projectId, projectName, draft, onClose, onSent }: {
  projectId: string;
  projectName: string;
  draft: string;
  onClose: () => void;
  onSent: (text: string) => void;
}) {
  const [text, setText] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    field.current?.focus();
    const key = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    const failed = await handToAgent(projectId, text.trim());
    setBusy(false);
    if (failed) setError(failed);
    else onSent(text.trim());
  }

  return (
    <div className="agent-dialog" role="dialog" aria-modal="true" aria-labelledby="agent-dialog-title">
      <button type="button" className="agent-dialog-backdrop" aria-label="Fermer" onClick={onClose} />
      <form className="agent-dialog-panel" onSubmit={send}>
        <h2 id="agent-dialog-title" className="agent-dialog-title">
          Confier à l'agent · {projectName}
        </h2>
        <p className="agent-dialog-text">Écris ce que l'agent doit faire. Il le verra dans Claude Code et te dira ici où il en est.</p>
        <textarea ref={field} className="agent-dialog-input" value={text} onChange={(e) => setText(e.target.value)} rows={4} />
        {error && <p className="agent-dialog-error">{error}</p>}
        <div className="agent-dialog-actions">
          <button type="button" className="agent-dialog-cancel" onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className="agent-dialog-send" disabled={busy || !text.trim()}>
            {busy ? 'Envoi…' : 'Confier'}
          </button>
        </div>
      </form>
    </div>
  );
}
