import type { ReactNode } from 'react';
import { useStored } from '../hooks/useStored';
import './ViewSwitch.css';

/** The ways a list can be shown, each with its little drawing. */
const ICONS: Record<string, ReactNode> = {
  // Rows
  liste: <path d="M5 7h14M5 12h14M5 17h14" />,
  // Columns side by side
  colonnes: (
    <>
      <rect x="4" y="5" width="4.5" height="14" rx="1.5" />
      <rect x="9.75" y="5" width="4.5" height="10" rx="1.5" />
      <rect x="15.5" y="5" width="4.5" height="7" rx="1.5" />
    </>
  ),
  // A month
  calendrier: (
    <>
      <rect x="4" y="5.5" width="16" height="14" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v3.5M15.5 3.5v3.5" />
    </>
  ),
  // Tight lines
  compact: <path d="M5 6h14M5 9.5h14M5 13h14M5 16.5h14M5 20h14" />,
  // A grid of cards
  cartes: (
    <>
      <rect x="4" y="4.5" width="7" height="7" rx="1.8" />
      <rect x="13" y="4.5" width="7" height="7" rx="1.8" />
      <rect x="4" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13" y="13.5" width="7" height="7" rx="1.8" />
    </>
  ),
};

export type View = { key: string; label: string };

/**
 * The view picker of a list page (To do, Modèles, Idées, Notes, Veille): the chosen view is kept on
 * this device, page by page, so each list opens the way Marc left it.
 */
export function useView<K extends string>(page: string, views: readonly { key: K; label: string }[]) {
  const [stored, setStored] = useStored<string>(`marc-hq:view:${page}`, () => views[0].key);
  const current = (views.some((view) => view.key === stored) ? stored : views[0].key) as K;
  return [current, (next: K) => setStored(() => next)] as const;
}

export default function ViewSwitch<K extends string>({ views, value, onChange }: { views: readonly { key: K; label: string }[]; value: K; onChange: (key: K) => void }) {
  return (
    <div className="view-switch" role="group" aria-label="Affichage">
      {views.map((view) => (
        <button key={view.key} type="button" aria-pressed={value === view.key} onClick={() => onChange(view.key)} title={view.label}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {ICONS[view.key] ?? ICONS.liste}
          </svg>
          <span className="view-switch-label">{view.label}</span>
        </button>
      ))}
    </div>
  );
}
