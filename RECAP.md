# Marc HQ : récap de la V1

## Ce qui est fait

Les six étapes du brief sont faites, dans l'ordre, avec un commit pour chacune. Le code est sur GitHub, dans le dépôt `ttpcreators/marc.hq`, choisi par Marc le 3 novembre.

1. **Projet** : Vite, React, TypeScript, React Router, tokens de couleur et polices (Big Shoulders Display, Geist, Geist Mono).
2. **Données** : `src/data/rnds.ts` et `src/data/club421.ts` (tous les textes et chiffres de la maquette), derrière `src/data/api.ts`.
3. **Espace RNDS** : les 5 rubriques (vue d'ensemble, clubs, ambassadeurs, publications, abonnés) avec barre latérale, fil d'Ariane, recherche, bloc titre avec graphique sur 12 semaines, chiffres clés, pipeline ou tableau, agents et tâches.
4. **Espace Club 421** : mêmes composants, ses propres données et sa couleur (violet depuis le 3 novembre) (vue d'ensemble, BDE, soirées, App Store, revenus).
5. **Accueil** : le bâtiment isométrique de la maquette, les deux étages cliquables, les deux cartes projet et « Ce qui t'attend aujourd'hui ».
6. **Finitions** : responsive jusqu'au téléphone (vérifié sur les 11 pages, sans défilement horizontal), navigation au clavier avec focus visible, `npm run build` passe sans erreur TypeScript.

En plus du brief, pour que l'outil serve vraiment au quotidien :

1. La recherche filtre pour de vrai les cartes du pipeline et les lignes des tableaux, sans tenir compte des accents. `⌘K` y met le curseur, `Échap` la vide.
2. Les cases « À faire » restent cochées pendant la session, avec un compteur « 1 / 3 », et chaque projet a les siennes.
3. Les boutons pas encore branchés affichent un court message qui le dit, au lieu de ne rien faire.
4. La date, l'heure, la salutation et les numéros de semaine sont calculés à partir du jour réel.

Ensuite, à ta demande, une passe de design « style Apple » : police d'Apple, titres en minuscules serrés, boutons en pilule, verre dépoli, cases rondes, icônes façon SF Symbols. Sur mobile, l'app se comporte comme une app iPhone : sélecteur de projet en haut, barre d'onglets en bas, marges qui respectent l'encoche. Vérifié sur les 11 pages, de 320 à 1 440 px de large.

Puis une passe « maquette blanche », d'après ton image de référence : thème clair (fond gris très clair, cartes blanches, ombres douces), bâtiment de l'accueil en maquette blanche avec la couleur des projets sur quelques détails seulement, étiquettes en pilule blanche. La mise en page n'a pas bougé.

Enfin, d'après tes deux autres références : le bâtiment est devenu une maquette en pâte blanche (ombres douces, inscriptions peintes au sol, un tracé par projet, personnages en figurines), RNDS a pris les couleurs et le logo de sa charte graphique (rouge `#FF0A3C`), et le graphique des 12 semaines est devenu un graphique en plateaux avec un grand chiffre fin.

Toutes les décisions prises sans toi sont expliquées dans `DECISIONS.md` (142 points).

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
2. `src/components` : un composant par fichier, avec son CSS à côté : `WorkspaceHeader`, `Hero`, `StatPanel`, `WeeklySteps`, `Activity`, `KpiStrip`, `Pipeline`, `DataTable`, `StatusBadge`, `AgentCard`, `Building` (maquette de l'accueil et scène de chaque projet), `ProjectCard`, `ProjectMark` (logos), `TabBar` (barre d'onglets mobile) et `ModuleIcon` (icônes des rubriques).
3. `src/data` : les données d'exemple, leurs types et la couche d'accès.
4. `src/lib` : petits outils (dates, initiales, couleur des statuts).
5. `src/styles/tokens.css` : toutes les couleurs, polices et arrondis à un seul endroit.

## Ce qui reste à faire

1. **Brancher les vraies données** (Supabase, puis tes dépôts GitHub et autres sources) : il suffit de réécrire `src/data/api.ts`, les écrans ne bougent pas. La clé publique Supabase est rangée dans `.env.local` (jamais envoyé sur GitHub) ; il manque l'adresse du projet Supabase. Le modèle est dans `.env.example`.
2. **Brancher les boutons d'action** : « Signer les contrats », « Confier à l'agent », « Valider », « Signer », « Relancer », « Ajouter un club »… Ils affichent pour l'instant un message « pas encore branché ».
3. **Synchroniser tâches, notes et idées entre appareils** : aujourd'hui elles sont enregistrées dans le navigateur seulement. Avec Supabase, elles seront les mêmes partout.
5. **Afficher les outils à l'intérieur de Marc HQ** (sans quitter la page) : possible seulement avec une version « app de bureau » (Tauri ou Electron), les sites refusant d'être intégrés dans une page web.
6. **Mettre l'app en ligne** : tout est prêt pour GitHub Pages (ttpcreators.github.io/marc.hq/). Il reste à passer le dépôt en public et à activer Pages.

## Points à valider avec toi

1. **Couleurs.** L'app est passée en thème clair, à ta demande. RNDS suit sa charte (rouge `#FF0A3C`). Club 421 est en violet (`#7C4DFF`) à ta demande ; envoie-moi sa charte quand elle est prête pour caler la teinte exacte.
2. ~~**Titres façon Apple ou façon affiche ?**~~ Réglé : les grands titres restent dans la police d'Apple, en minuscules (validé par Marc le 3 novembre).
3. ~~**Identité des commits.**~~ Réglé : tous les commits sont signés « ttpcreators » avec l'adresse masquée de GitHub (choix de Marc le 3 novembre).
4. **Salutation.** « Bonsoir » à partir de 16 h, pour coller à la maquette. On peut passer à 18 h si tu préfères.
5. **Adresses des rubriques** sans accent (`/rnds/abonnes`, `/club421/soirees`…). Ça te va ?
6. **Les étiquettes d'étage** sont un peu plus larges que dans la maquette, pour que le texte tienne sur une ligne.
