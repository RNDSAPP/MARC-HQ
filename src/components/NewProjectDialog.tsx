import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomProjects } from '../data/customProjects';
import './NewProjectDialog.css';

const OPEN_EVENT = 'marc-hq:new-project';

/** Opens the "Nouveau projet" dialog from anywhere (side rail, home, ⌘K). */
export const openNewProject = () => window.dispatchEvent(new Event(OPEN_EVENT));

const COLORS = ['#0A84FF', '#30B0C7', '#34C759', '#FFB000', '#FF6B00', '#FF2D55', '#AF52DE', '#1C1C1E'];

/** Shrinks an uploaded logo to a 128 px square, so it stays light in local storage. */
function readLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('canvas'));
        const side = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 128, 128);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Dialog to add a project: name, kind, colour, optional logo. It opens its new workspace. */
export default function NewProjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [logo, setLogo] = useState<string | undefined>();
  const { add } = useCustomProjects();
  const navigate = useNavigate();
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  useEffect(() => {
    if (!open) return;
    nameRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    setName('');
    setTag('');
    setLogo(undefined);
  };

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    const id = add({ name: name.trim(), tag: tag.trim(), color, logo });
    close();
    navigate(`/${id}/vue-d-ensemble`);
  }

  return (
    <div className="npd-layer">
      <button type="button" className="npd-shade" aria-label="Fermer" onClick={close} />
      <form className="npd" role="dialog" aria-modal="true" aria-labelledby="npd-title" onSubmit={submit}>
        <div className="npd-head">
          <span className="npd-preview" style={{ background: logo ? undefined : color }} aria-hidden="true">
            {logo ? <img src={logo} alt="" /> : (name.trim().charAt(0) || '+').toUpperCase()}
          </span>
          <div>
            <h2 id="npd-title" className="npd-title">
              <span className="npd-light">Nouveau</span> <span className="npd-bold">projet</span>
            </h2>
            <p className="npd-sub">Il aura son espace, ses outils et ses connexions.</p>
          </div>
        </div>

        <label className="npd-field">
          <span>Nom</span>
          <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Mon app" required maxLength={40} />
        </label>
        <label className="npd-field">
          <span>Type</span>
          <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Ex. App iOS, site, agence…" maxLength={40} />
        </label>

        <fieldset className="npd-colors">
          <legend>Couleur</legend>
          {COLORS.map((c) => (
            <label key={c} className="npd-color" style={{ background: c }}>
              <input type="radio" name="npd-color" value={c} checked={color === c} onChange={() => setColor(c)} />
              <span className="visually-hidden">{c}</span>
            </label>
          ))}
          <label className="npd-color npd-color--custom">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Autre couleur" />
          </label>
        </fieldset>

        <label className="npd-field npd-logo">
          <span>Logo (facultatif)</span>
          <input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) setLogo(await readLogo(file));
            }}
          />
        </label>

        <div className="npd-actions">
          <button type="button" className="npd-cancel" onClick={close}>
            Annuler
          </button>
          <button type="submit" className="npd-create" disabled={!name.trim()} style={{ background: color }}>
            Créer le projet
          </button>
        </div>
      </form>
    </div>
  );
}
