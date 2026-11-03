import { useState } from 'react';
import type { Project } from '../../data/types';
import { useStored } from '../../hooks/useStored';
import './Tools.css';

type Connector = {
  id: string;
  name: string;
  group: string;
  /** What it would bring to this project. */
  gives: string;
  /** What it takes to plug it in for real. */
  needs: string[];
};

// Each real connection needs a server side (Supabase) to keep the access safely, and an app
// declared with the service. Until then, Marc marks the ones he wants first.
const CONNECTORS: Connector[] = [
  { id: 'claude', name: 'Claude', group: 'Agents', gives: 'Des agents qui rédigent les relances, résument les avis et préparent les posts, à partir des données du projet.', needs: ['Une clé API Claude, gardée côté serveur', 'Supabase pour faire tourner les agents'] },
  { id: 'gmail', name: 'Gmail', group: 'Mails et agenda', gives: 'Les mails des clubs et partenaires rangés dans chaque fiche, et les réponses préparées.', needs: ['Une application déclarée chez Google (OAuth)', 'Supabase pour garder l’accès'] },
  { id: 'agenda', name: 'Google Agenda', group: 'Mails et agenda', gives: 'Les rendez-vous et soirées dans la frise de la semaine.', needs: ['La même application Google que Gmail'] },
  { id: 'instagram', name: 'Instagram', group: 'Réseaux', gives: 'Abonnés, portée et publications en vrai dans les chiffres et la rubrique Publications.', needs: ['Un compte professionnel Instagram', 'Une application déclarée chez Meta'] },
  { id: 'tiktok', name: 'TikTok', group: 'Réseaux', gives: 'Vues et abonnés TikTok à côté d’Instagram.', needs: ['Une application déclarée chez TikTok for Developers'] },
  { id: 'meta', name: 'Meta Business', group: 'Réseaux', gives: 'Publicités Facebook et Instagram : dépenses, résultats, coût par inscription.', needs: ['Un compte Meta Business', 'L’application Meta d’Instagram'] },
  { id: 'youtube', name: 'YouTube', group: 'Réseaux', gives: 'Vues et abonnés de la chaîne.', needs: ['L’application Google de Gmail'] },
  { id: 'appstore', name: 'App Store Connect', group: 'App et code', gives: 'Téléchargements, note, avis et versions en vrai, avec réponse aux avis.', needs: ['Une clé API App Store Connect', 'Supabase pour la garder'] },
  { id: 'github', name: 'GitHub', group: 'App et code', gives: 'Les commits, tickets et versions du dépôt dans Versions et Retours.', needs: ['Le dépôt du projet sur le bon compte', 'Un jeton GitHub, gardé côté serveur'] },
  { id: 'supabase', name: 'Supabase', group: 'App et code', gives: 'La base de données de Marc HQ : tout est synchronisé entre ton Mac et ton iPhone.', needs: ['Un projet Supabase (gratuit pour commencer)'] },
  { id: 'stripe', name: 'Stripe', group: 'Paiements', gives: 'Le chiffre d’affaires et les achats en direct dans Revenus.', needs: ['Une clé Stripe en lecture seule'] },
];

type Wish = Record<string, boolean>;

/**
 * Connections of a project: what each service would bring, what it takes to plug it in, and a
 * "À brancher" list Marc fills to say which ones come first. Nothing is connected for real yet:
 * the buttons say so plainly.
 */
export default function ConnectionsPage({ project, query, onRemoveProject }: {
  project: Project;
  query: (text: string) => boolean;
  /** Only for projects added from the app. */
  onRemoveProject?: () => void;
}) {
  const [wish, setWish] = useStored<Wish>(`marc-hq:${project.id}:connections`, () => ({}));
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const visible = CONNECTORS.filter((c) => query(`${c.name} ${c.group} ${c.gives}`));
  const groups = [...new Set(visible.map((c) => c.group))];
  const wanted = CONNECTORS.filter((c) => wish[c.id]).length;

  return (
    <section className="tool" aria-labelledby="tool-title">
      <div className="tool-head">
        <h1 id="tool-title" className="tool-title">
          <span className="tool-title-light">Connexions</span> <span className="tool-title-bold">{wanted} à brancher</span>
        </h1>
      </div>
      <p className="conn-intro">
        Aucun outil n'est encore branché pour de vrai : il faut d'abord une partie serveur (Supabase) pour garder les accès en sécurité. Marque ceux que tu
        veux en premier, on les branchera dans cet ordre.
      </p>

      {groups.map((group) => (
        <div key={group} className="tool-group">
          <h2 className="tool-group-title">{group}</h2>
          <ul className="conns">
            {visible
              .filter((c) => c.group === group)
              .map((c) => (
                <li key={c.id} className={`conn${wish[c.id] ? ' conn--wanted' : ''}`}>
                  <div className="conn-head">
                    <span className="conn-icon" aria-hidden="true">
                      {c.name.charAt(0)}
                    </span>
                    <span className="conn-name">{c.name}</span>
                    <span className={`conn-state${wish[c.id] ? ' conn-state--wanted' : ''}`}>{wish[c.id] ? 'À brancher' : 'Pas connecté'}</span>
                  </div>
                  <p className="conn-gives">{c.gives}</p>
                  {open === c.id && (
                    <div className="conn-needs">
                      <p>Pour le brancher, il faudra :</p>
                      <ul>
                        {c.needs.map((n) => (
                          <li key={n}>{n}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="conn-actions">
                    <button type="button" className="tool-ghost" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)}>
                      {open === c.id ? 'Masquer' : 'Ce qu’il faut'}
                    </button>
                    <button type="button" className={wish[c.id] ? 'tool-ghost' : 'tool-primary tool-primary--small'} onClick={() => setWish((prev) => ({ ...prev, [c.id]: !prev[c.id] }))}>
                      {wish[c.id] ? 'Retirer de la liste' : 'Mettre à brancher'}
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        </div>
      ))}

      {onRemoveProject && (
        <div className="conn-danger">
          <div>
            <h2 className="tool-group-title">Supprimer {project.name}</h2>
            <p className="conn-gives">Le projet disparaît de Marc HQ. Ses tâches, notes et idées restent dans ce navigateur si tu le recrées avec le même nom.</p>
          </div>
          {confirm ? (
            <div className="conn-actions">
              <button type="button" className="tool-ghost" onClick={() => setConfirm(false)}>
                Annuler
              </button>
              <button type="button" className="conn-delete" onClick={onRemoveProject}>
                Oui, supprimer
              </button>
            </div>
          ) : (
            <button type="button" className="tool-ghost tool-ghost--danger" onClick={() => setConfirm(true)}>
              Supprimer le projet
            </button>
          )}
        </div>
      )}
    </section>
  );
}
