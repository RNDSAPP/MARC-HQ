import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Version, VersionStatus } from '../../data/types';
import type { useVersions } from '../../data/tools';
import { VERSION_STATE, useAppStore } from '../../lib/appstore';
import { dueLabel } from '../../lib/dates';
import './Tools.css';

type Props = { api: ReturnType<typeof useVersions>; query: (text: string) => boolean; projectId: string };

const STATUS: { key: VersionStatus; label: string }[] = [
  { key: 'prevue', label: 'Prévue' },
  { key: 'en-cours', label: 'En cours' },
  { key: 'review', label: 'En review' },
  { key: 'publiee', label: 'Publiée' },
];

/** Roadmap and release notes: each version, its state, its date and what goes in it. */
export default function VersionsPage({ api, query, projectId }: Props) {
  const [name, setName] = useState('');
  // The versions as Apple sees them, live from App Store Connect
  const store = useAppStore(projectId, true).data;
  const order = (v: Version) => STATUS.findIndex((s) => s.key === v.status);
  // What is being built comes first, then what is planned, then what is out
  const sorted = [...api.versions].sort((a, b) => ((order(a) + 2) % 4) - ((order(b) + 2) % 4));
  const visible = sorted.filter((v) => query(`${v.name} ${v.items.map((i) => i.text).join(' ')}`));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    api.add(name.trim());
    setName('');
  }

  return (
    <section className="tool" aria-labelledby="tool-title">
      <div className="tool-head">
        <h1 id="tool-title" className="tool-title">
          <span className="tool-title-light">Versions</span> <span className="tool-title-bold">{api.versions.length}</span>
        </h1>
      </div>
      {store && store.versions.length > 0 && (
        <div className="tool-group">
          <h2 className="tool-group-title">Sur l’App Store, en direct</h2>
          <ul className="store-versions">
            {store.versions.map((v) => (
              <li key={`${v.version}-${v.platform}`} className="store-version">
                <span className="store-version-num">{v.version}</span>
                <span className={`store-version-state${VERSION_STATE[v.state] === 'En ligne' ? ' store-version-state--live' : ''}`}>{VERSION_STATE[v.state] ?? v.state}</span>
                <span className="store-version-date">Créée le {new Date(v.created).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <h2 className="tool-group-title">Tes prochaines versions</h2>
      <form className="tool-add" onSubmit={submit}>
        <label className="visually-hidden" htmlFor="version-name">
          Nouvelle version
        </label>
        <input id="version-name" className="tool-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nouvelle version (ex. 1.4)" autoComplete="off" />
        <button type="submit" className="tool-primary" disabled={!name.trim()}>
          Ajouter
        </button>
      </form>

      {visible.length === 0 && <p className="tool-empty">Aucune version. Ajoute la prochaine juste au-dessus.</p>}
      <div className="versions">
        {visible.map((version) => (
          <VersionCard key={version.id} version={version} api={api} />
        ))}
      </div>
    </section>
  );
}

function VersionCard({ version, api }: { version: Version; api: Props['api'] }) {
  const [item, setItem] = useState('');
  const done = version.items.filter((i) => i.done).length;
  const progress = version.items.length ? Math.round((done / version.items.length) * 100) : version.status === 'publiee' ? 100 : 0;
  return (
    <article className={`version version--${version.status}`}>
      <header className="version-head">
        <h2 className="version-name">{version.name}</h2>
        <label className="visually-hidden" htmlFor={`${version.id}-status`}>
          État
        </label>
        <select id={`${version.id}-status`} className="tool-select" value={version.status} onChange={(e) => api.update(version.id, { status: e.target.value as VersionStatus })}>
          {STATUS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <label className="visually-hidden" htmlFor={`${version.id}-date`}>
          Date
        </label>
        <input id={`${version.id}-date`} type="date" className="tool-select" value={version.date ?? ''} onChange={(e) => api.update(version.id, { date: e.target.value || null })} />
        {version.date && <span className="version-when">{dueLabel(version.date)}</span>}
        <button type="button" className="tool-remove" onClick={() => api.remove(version.id)} aria-label={`Supprimer la version ${version.name}`}>
          ×
        </button>
      </header>
      <div className="progress" aria-label={`${progress} % livré`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <ul className="version-items">
        {version.items.map((i) => (
          <li key={i.id} className={`task${i.done ? ' task--done' : ''}`}>
            <label className="task-main">
              <input type="checkbox" className="tool-check" checked={i.done} onChange={() => api.toggleItem(version.id, i.id)} />
              <span className="task-text">{i.text}</span>
            </label>
            <button type="button" className="tool-remove" onClick={() => api.removeItem(version.id, i.id)} aria-label={`Retirer « ${i.text} »`}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <form
        className="version-add"
        onSubmit={(e) => {
          e.preventDefault();
          if (!item.trim()) return;
          api.addItem(version.id, item.trim());
          setItem('');
        }}
      >
        <label className="visually-hidden" htmlFor={`${version.id}-item`}>
          Ajouter à la version {version.name}
        </label>
        <input id={`${version.id}-item`} className="tool-input" value={item} onChange={(e) => setItem(e.target.value)} placeholder="Fonctionnalité ou correction" autoComplete="off" />
      </form>
    </article>
  );
}
