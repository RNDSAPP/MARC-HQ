import { useUpdate } from '../lib/update';
import './UpdateBanner.css';

/** A small note at the top when a newer Marc HQ is online: one tap loads it. */
export default function UpdateBanner() {
  const ready = useUpdate();
  if (!ready) return null;
  return (
    <div className="update" role="status">
      <span>Nouvelle version de Marc HQ</span>
      <button type="button" className="update-button" onClick={() => window.location.reload()}>
        Mettre à jour
      </button>
    </div>
  );
}
