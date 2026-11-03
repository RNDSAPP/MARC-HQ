# Marc HQ : récap de la V1

## Ce qui est fait

Les six étapes du brief sont faites, dans l'ordre, avec un commit local pour chacune (rien n'a été poussé, aucun dépôt distant).

1. **Projet** : Vite, React, TypeScript, React Router, tokens de couleur et polices (Big Shoulders Display, Geist, Geist Mono).
2. **Données** : `src/data/rnds.ts` et `src/data/club421.ts` (tous les textes et chiffres de la maquette), derrière `src/data/api.ts`.
3. **Espace RNDS** : les 5 rubriques (vue d'ensemble, clubs, ambassadeurs, publications, abonnés) avec barre latérale, fil d'Ariane, recherche, bloc titre avec graphique sur 12 semaines, chiffres clés, pipeline ou tableau, agents et tâches.
4. **Espace Club 421** : mêmes composants, ses propres données et sa couleur menthe (vue d'ensemble, BDE, soirées, App Store, revenus).
5. **Accueil** : le bâtiment isométrique de la maquette, les deux étages cliquables, les deux cartes projet et « Ce qui t'attend aujourd'hui ».
6. **Finitions** : responsive jusqu'au téléphone (vérifié sur les 11 pages, sans défilement horizontal), navigation au clavier avec focus visible, `npm run build` passe sans erreur TypeScript.

En plus du brief, pour que l'outil serve vraiment au quotidien :

1. La recherche filtre pour de vrai les cartes du pipeline et les lignes des tableaux, sans tenir compte des accents. `⌘K` y met le curseur, `Échap` la vide.
2. Les cases « À faire » restent cochées pendant la session, avec un compteur « 1 / 3 », et chaque projet a les siennes.
3. Les boutons pas encore branchés affichent un court message qui le dit, au lieu de ne rien faire.
4. La date, l'heure, la salutation et les numéros de semaine sont calculés à partir du jour réel.

Toutes les décisions prises sans toi sont expliquées dans `DECISIONS.md` (24 points).

## Lancer l'app

Dans le dossier `marc-hq` :

```bash
npm install
```

```bash
npm run dev
```

Puis ouvre l'adresse affichée (en général http://localhost:5173).

## Comment le code est rangé

1. `src/pages` : les deux écrans, `Home` (accueil) et `Workspace` (espace de travail d'un projet).
2. `src/components` : un composant par fichier, avec son CSS à côté : `Sidebar`, `Topbar`, `Hero`, `WeeklyBars`, `KpiStrip`, `Pipeline`, `DataTable`, `StatusBadge`, `AgentCard`, `TodoList`, `Building`, plus `ProjectCard` pour les cartes de l'accueil.
3. `src/data` : les données d'exemple, leurs types et la couche d'accès.
4. `src/lib` : petits outils (dates, initiales, couleur des statuts, courbe de l'accueil).
5. `src/styles/tokens.css` : toutes les couleurs, polices et arrondis à un seul endroit.

## Ce qui reste à faire

1. **Brancher les vraies données** (Supabase, puis tes dépôts GitHub et autres sources) : il suffit de réécrire `src/data/api.ts`, les écrans ne bougent pas.
2. **Brancher les boutons d'action** : « Signer les contrats », « Confier à l'agent », « Valider », « Signer », « Relancer », « Ajouter un club »… Ils affichent pour l'instant un message « pas encore branché ».
3. **Garder les tâches cochées pour de bon** : aujourd'hui elles repartent à zéro quand tu fermes l'onglet. Avec une base de données, elles seront gardées partout.
4. **Choisir le compte GitHub** puis créer le dépôt distant et pousser.
5. **Mettre l'app en ligne**, si tu veux y accéder depuis ton téléphone.

## Points à valider avec toi

1. ~~**Couleurs de l'accueil.**~~ Validé par Marc : l'accueil suit les tokens du brief et le bâtiment garde ses couleurs d'origine.
2. **Identité des commits.** Ton identité Git globale est celle de TTP Creators. Pour ne pas mélanger, les commits de ce dépôt sont signés « Marc Bouraoui » avec ton adresse Gmail. Dis-moi à quel compte rattacher Marc HQ, et je changerai l'identité (et l'auteur des commits déjà faits si tu veux).
3. **Salutation.** « Bonsoir » à partir de 16 h, pour coller à la maquette. On peut passer à 18 h si tu préfères.
4. **Adresses des rubriques** sans accent (`/rnds/abonnes`, `/club421/soirees`…). Ça te va ?
5. **Les étiquettes d'étage** sont un peu plus larges que dans la maquette, pour que le texte tienne sur une ligne.
