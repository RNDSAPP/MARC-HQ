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

7. **Couche d'accès asynchrone dès maintenant.** Les fonctions de `src/data/api.ts` (`getProject`, `getProjects`) renvoient des promesses, comme le fera Supabase. Les écrans passent par le petit hook `useData`, qui garde en mémoire ce qui est déjà chargé. Pour brancher Supabase, il suffira de réécrire `api.ts` : les écrans ne bougent pas.
8. **Un seul objet par projet.** `src/data/rnds.ts` et `src/data/club421.ts` ont exactement la même forme (définie dans `src/data/types.ts`) : agents, tâches, pipeline, rubriques et résumé pour l'accueil. Les textes et chiffres sont ceux de la maquette, à la lettre.
9. **Adresses des rubriques.** Les rubriques ont une adresse sans accent ni espace : `/rnds/vue-d-ensemble`, `/rnds/clubs`, `/rnds/ambassadeurs`, `/rnds/publications`, `/rnds/abonnes`, `/club421/vue-d-ensemble`, `/club421/bde`, `/club421/soirees`, `/club421/app-store`, `/club421/revenus`. `/rnds` seul mène à la vue d'ensemble ; une adresse inconnue ramène à l'accueil.
10. **Couleur des badges de statut.** Comme dans la maquette, elle se déduit du texte : « Actif », « Prêt », « Confirmé », « Répondu », « Hausse »… en couleur du projet ; « À relancer », « À valider », « À répondre », « À confirmer » en ambre ; le reste en gris.
11. **Cases « À faire ».** Elles sont gardées dans le stockage de session du navigateur : elles restent cochées quand tu changes de rubrique, de projet ou que tu recharges la page, et repartent à zéro quand tu fermes l'onglet.
