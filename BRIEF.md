# Marc HQ : brief de construction V1

## Contexte

Marc HQ est l'outil interne de Marc Bouraoui pour piloter deux projets produits : **RNDS** (app de boxe, « le Strava de la boxe ») et **Club 421** (jeu de dés iOS pour les soirées étudiantes). C'est un seul outil avec un espace par projet : même moteur, mêmes briques, mais les noms changent selon le projet. Les données des deux projets restent séparées.

TTP Creators et TTP Suite ne font **pas** partie de ce projet. Rien ne doit y être relié.

Marc n'est pas développeur : écris un code propre, bien rangé, et explique tes choix dans `DECISIONS.md`.

## Référence visuelle

Le fichier `reference/maquette.dc.html` est la maquette validée. C'est un format de maquette particulier (balises `x-dc`, `sc-for`, `sc-if`) : **ne le copie pas tel quel**, sers t'en comme référence pour reproduire fidèlement le rendu, les couleurs, les typos, les textes et la structure dans une vraie app React. Toutes les données d'exemple (clubs, BDE, chiffres, agents, tâches) sont dans le script en bas du fichier : reprends les.

## Stack

1. Vite + React + TypeScript.
2. CSS avec variables (tokens ci dessous), pas de librairie de composants lourde.
3. React Router pour la navigation.
4. Données d'exemple dans des fichiers TypeScript locaux (`src/data/rnds.ts`, `src/data/club421.ts`) derrière une petite couche d'accès (`src/data/api.ts`), pour pouvoir brancher Supabase plus tard sans toucher aux écrans.
5. Pas de Supabase, pas de déploiement, pas de compte externe pour cette V1.

## Tokens de design

Couleurs : fond `#121110`, barre latérale `#0E0D0C`, surface `#1A1917`, surface basse `#161513`, carte `#1F1D1A`, bordure `#2E2B27`, bordure douce `#24221F`, texte `#F2EEE6`, texte secondaire `#C8C2B8`, texte discret `#9A948A`, alerte `#F0B44C`.
Accent RNDS : `#FF5A36` (texte doux `#FF8A6B`, teinte `#2A1712`).
Accent Club 421 : `#8FE0B0` (texte doux `#A9EAC4`, teinte `#14261C`).
Typos (Google Fonts) : Big Shoulders Display 800 pour les titres et gros chiffres, Geist pour le texte, Geist Mono pour les données et étiquettes.

## Écrans et routes

1. `/` : accueil. Le bâtiment isométrique de la maquette (garde le SVG tel quel), avec les deux étiquettes cliquables, les deux cartes projet et la liste « Ce qui t'attend aujourd'hui ».
2. `/rnds/:module` et `/club421/:module` : l'espace de travail. Modules RNDS : vue d'ensemble, clubs, ambassadeurs, publications, abonnés. Modules Club 421 : vue d'ensemble, bde, soirees, app-store, revenus.
3. Structure de l'espace de travail, comme dans la maquette : barre latérale (retour HQ, sélecteur des deux projets, rubriques), barre du haut (fil d'Ariane, recherche), bloc titre façon affiche avec graphique sur 12 semaines, bandeau de chiffres clés, pipeline en colonnes (vue d'ensemble, clubs, BDE) ou tableau (autres rubriques), colonne de droite avec les agents et les tâches.

## Composants attendus

`Sidebar`, `Topbar`, `Hero`, `WeeklyBars`, `KpiStrip`, `Pipeline` (colonnes et cartes), `DataTable`, `StatusBadge`, `AgentCard`, `TodoList`, `Building` (accueil). Un composant par fichier dans `src/components`.

## Exigences de qualité

1. Responsive jusqu'au mobile : la barre latérale passe au dessus, les colonnes s'empilent, les tableaux défilent horizontalement.
2. Navigation clavier, focus visible, vrais boutons et liens.
3. Les cases « À faire » se cochent et restent cochées pendant la session.
4. Aucune erreur TypeScript, `npm run build` doit passer.

## Façon de travailler

Marc est absent pendant ta session : **ne lui pose aucune question**. Quand un choix n'est pas tranché ici, prends l'option la plus simple et note la dans `DECISIONS.md`.
Fais un commit git local à chaque étape terminée, avec un message clair en français. **Ne pousse rien sur GitHub** et ne crée aucun dépôt distant : Marc choisira le compte à son retour.
Quand tu as fini, écris dans `RECAP.md` : ce qui est fait, comment lancer l'app (`npm install` puis `npm run dev`), ce qui reste à faire, et les points à valider avec Marc.

## Ordre de travail

1. Initialiser le projet, les tokens, les polices, le routeur.
2. Les données d'exemple et la couche d'accès.
3. L'espace de travail RNDS complet, vue d'ensemble d'abord.
4. Le même espace pour Club 421 (mêmes composants, autres données).
5. L'accueil avec le bâtiment.
6. Responsive, accessibilité, `npm run build`, `RECAP.md`.
