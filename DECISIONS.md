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
