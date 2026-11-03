# Décisions prises pendant la construction de la V1

Chaque fois que le brief ne tranchait pas, j'ai pris l'option la plus simple. Tout est réversible.

## Projet et outils

1. **Identité Git locale.** Ton identité Git globale est celle de TTP Creators, et le brief dit que TTP ne doit pas être relié à ce projet. J'ai donc réglé dans ce dépôt seulement le nom « Marc Bouraoui » et ton adresse Gmail. Aucun dépôt distant, rien n'a été poussé. À ton retour, quand tu auras choisi le compte (RNDS, Club 421 ou un autre), on changera cette identité et on pourra réécrire l'auteur des commits si tu veux.
2. **Versions.** Vite 7, React 19, React Router 7, TypeScript 5.8. Ce sont les versions stables actuelles.
3. **Script de build.** `npm run build` lance d'abord la vérification TypeScript (`tsc --noEmit`), puis Vite. Un seul fichier `tsconfig.json` au lieu des trois que génère le modèle Vite : plus simple à lire.
4. **Le brief et la maquette sont copiés dans le dépôt** (`BRIEF.md`, `reference/maquette.dc.html`) pour qu'ils restent à côté du code.

## Style

5. **Un fichier CSS par composant**, posé à côté du composant (`Sidebar.tsx` et `Sidebar.css`). Toutes les valeurs (couleurs, polices, arrondis) viennent des variables de `src/styles/tokens.css`.
6. **Couleur du projet.** L'attribut `data-project="rnds"` ou `data-project="club421"` sur la page change les variables `--accent`, `--accent-soft` et `--accent-tint`. Les composants n'ont donc jamais besoin de savoir dans quel projet ils sont pour choisir leur couleur.

## Données

7. **Couche d'accès asynchrone dès maintenant.** La fonction `getProjects` de `src/data/api.ts` renvoie des promesses, comme le fera Supabase. Les écrans passent par le petit hook `useData`, qui garde en mémoire ce qui est déjà chargé. Pour brancher Supabase, il suffira de réécrire `api.ts` : les écrans ne bougent pas.
8. **Un seul objet par projet.** `src/data/rnds.ts` et `src/data/club421.ts` ont exactement la même forme (définie dans `src/data/types.ts`) : agents, tâches, pipeline, rubriques et résumé pour l'accueil. Les textes et chiffres sont ceux de la maquette, à la lettre.
9. **Adresses des rubriques.** Les rubriques ont une adresse sans accent ni espace : `/rnds/vue-d-ensemble`, `/rnds/clubs`, `/rnds/ambassadeurs`, `/rnds/publications`, `/rnds/abonnes`, `/club421/vue-d-ensemble`, `/club421/bde`, `/club421/soirees`, `/club421/app-store`, `/club421/revenus`. `/rnds` seul mène à la vue d'ensemble ; une adresse inconnue ramène à l'accueil.
10. **Couleur des badges de statut.** Comme dans la maquette, elle se déduit du texte : « Actif », « Prêt », « Confirmé », « Répondu », « Hausse »… en couleur du projet ; « À relancer », « À valider », « À répondre », « À confirmer » en ambre ; le reste en gris.
11. **Cases « À faire ».** Elles sont gardées dans le stockage de session du navigateur : elles restent cochées quand tu changes de rubrique, de projet ou que tu recharges la page, et repartent à zéro quand tu fermes l'onglet.

## Espace de travail

12. **La recherche filtre vraiment.** Elle cherche dans les cartes du pipeline (nom et détail) ou dans les lignes du tableau de la rubrique ouverte, sans tenir compte des accents ni des majuscules. Le compteur affiche alors « 2 sur 5 ». `⌘K` (ou `Ctrl+K`) place le curseur dans la recherche, `Échap` la vide. Elle se remet à zéro quand tu changes de rubrique.
13. **Boutons pas encore branchés.** « Signer les contrats », « Confier à l'agent », « Valider », « Signer »… sont de vrais boutons, mais il n'y a pas encore de vraies données derrière. Au lieu de ne rien faire en silence, ils affichent un court message en bas de l'écran qui le dit clairement.
14. **Projets bien séparés.** Chaque projet a ses propres données, sa propre couleur et ses propres cases cochées (`marc-hq:todos:rnds` et `marc-hq:todos:club421`). Passer d'un projet à l'autre recharge complètement l'espace : rien ne déborde de l'un à l'autre.
15. **Petits ajouts utiles.** Compteur « 1 / 3 » à côté de « À faire », tâche cochée barrée, titre de l'onglet du navigateur qui suit la rubrique (« Ambassadeurs · RNDS · Marc HQ »), lien « Aller au contenu » pour la navigation au clavier.
16. **Dates calculées.** La date en haut (« MARDI 3 NOVEMBRE ») et les numéros de semaine sous le graphique (S34 à S45) sont calculés à partir du jour réel, pas écrits en dur.
17. **Tableau.** C'est un vrai tableau HTML (meilleur pour les lecteurs d'écran), qui défile horizontalement sur petit écran et peut être parcouru au clavier.
18. **Club 421 = même écran, autres données.** Aucun composant n'est propre à un projet : `Workspace` reçoit le projet et tout le reste (rubriques, pipeline BDE, bouton « Relancer », couleur menthe) vient de `src/data/club421.ts`. Ajouter un troisième projet plus tard = un nouveau fichier de données et deux routes.

## Accueil

19. **Le bâtiment est repris tel quel.** Le dessin SVG est copié trait pour trait depuis la maquette ; seuls les noms d'attributs ont été adaptés à React (`stroke-width` devient `strokeWidth`, etc.). Il garde donc ses propres couleurs (orange `#FF7A45`, vert `#4ADE80`).
20. **Le reste de l'accueil suit les tokens du brief.** Dans la maquette, l'accueil utilisait une autre palette (fond `#09090A`, polices Inter et JetBrains Mono, vert `#4ADE80`). J'ai suivi le brief : mêmes couleurs, mêmes polices (Geist, Geist Mono) et mêmes accents que l'espace de travail, pour que tout l'outil forme un seul ensemble. Validé par Marc le 3 novembre : on garde comme ça, bâtiment compris.
21. **Étages cliquables.** Comme dans la maquette, de grandes zones invisibles sur chaque étage ouvrent le projet à la souris. Au clavier, ce sont les deux étiquettes qui servent (ce sont de vrais liens). Sur téléphone, les étiquettes sortent du dessin et se rangent dessous, pour ne pas le cacher.
22. **Chiffres de l'accueil calculés.** « 2 agents au travail » et « 1 attend ta réponse » sont comptés à partir des agents des deux projets, et l'état « Agent : … » de chaque étage vient de l'agent le plus urgent du projet. La salutation passe de « Bonjour » à « Bonsoir » à 16 h (la maquette disait « Bonsoir » à 16 h 45).
23. **Composant `ProjectCard` en plus.** Les deux cartes projet de l'accueil ont leur propre composant (`src/components/ProjectCard.tsx`), qui n'était pas dans la liste du brief. La petite courbe reprend exactement le calcul de la maquette.
24. **Les étiquettes d'étage sont un peu plus larges** que dans la maquette (264 px au lieu de 236 px) : avec la police Geist, « Agent : attend ta réponse » passait sur deux lignes.
