import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useSession } from '../lib/session';
import { supabase } from '../lib/supabase';
import './AccountButton.css';

/** The photo, cropped to a 256 px square and saved as JPEG, so it stays small. */
async function square(file: File) {
  const image = await createImageBitmap(file);
  const side = Math.min(image.width, image.height);
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  canvas.getContext('2d')!.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 256, 256);
  return new Promise<Blob>((done) => canvas.toBlob((blob) => done(blob!), 'image/jpeg', 0.9));
}

/**
 * Marc's round: his profile photo (or his initials), and on a tap a small menu to change the
 * photo or sign out. The photo is kept in Supabase, so it is the same on every device.
 */
export default function AccountButton({ initials = 'MB', placement = 'up' }: { initials?: string; placement?: 'up' | 'down' }) {
  const session = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [saved, setSaved] = useState('');
  const picker = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const photo = session?.user.user_metadata?.avatar_url as string | undefined;

  // Close the menu with a tap elsewhere or Escape
  useEffect(() => {
    if (!open) return;
    const away = (event: Event) => !box.current?.contains(event.target as Node) && setOpen(false);
    const key = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    window.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', key);
    };
  }, [open]);

  async function change(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !supabase || !session) return;
    setBusy(true);
    setError('');
    const path = `${session.user.id}/photo.jpg`;
    const upload = await supabase.storage.from('avatars').upload(path, await square(file), { upsert: true, contentType: 'image/jpeg' });
    if (upload.error) {
      setBusy(false);
      setError('La photo n’a pas pu être enregistrée.');
      return;
    }
    const url = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`;
    await supabase.auth.updateUser({ data: { avatar_url: url } });
    setBusy(false);
    setOpen(false);
  }

  return (
    <div className="account" ref={box}>
      <button type="button" className="account-round" onClick={() => setOpen((was) => !was)} aria-expanded={open} aria-label="Mon compte">
        {photo ? <img src={photo} alt="" /> : <span>{initials}</span>}
      </button>
      {open && (
        <div className={`account-menu account-menu--${placement}`} role="menu">
          {session?.user.email && <p className="account-email">{session.user.email}</p>}
          <button type="button" role="menuitem" className="account-item" onClick={() => picker.current?.click()} disabled={busy || !session}>
            {busy ? 'Enregistrement…' : photo ? 'Changer la photo' : 'Ajouter une photo'}
          </button>
          {newPassword === null ? (
            <button type="button" role="menuitem" className="account-item" onClick={() => { setNewPassword(''); setSaved(''); }} disabled={!session}>
              Changer le mot de passe
            </button>
          ) : (
            <form
              className="account-form"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!supabase || newPassword.length < 6) return;
                const { error: failed } = await supabase.auth.updateUser({ password: newPassword });
                setSaved(failed ? 'Le mot de passe n’a pas pu être changé.' : 'Mot de passe enregistré.');
                if (!failed) setNewPassword(null);
              }}
            >
              <input
                className="account-input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe (6 min.)"
                autoComplete="new-password"
                minLength={6}
                aria-label="Nouveau mot de passe"
              />
              <button type="submit" className="account-item" disabled={newPassword.length < 6}>
                Enregistrer
              </button>
            </form>
          )}
          {saved && <p className="account-email">{saved}</p>}
          <button
            type="button"
            role="menuitem"
            className="account-item account-item--out"
            onClick={() => supabase?.auth.signOut()}
            disabled={!session}
          >
            Se déconnecter
          </button>
          {error && <p className="account-error">{error}</p>}
        </div>
      )}
      <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={change} />
    </div>
  );
}
