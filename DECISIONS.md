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
11. **Cases « À faire ».** Elles étaient gardées pour la session du navigateur ; depuis le point 63, les tâches sont enregistrées pour de bon dans le navigateur (stockage local).

## Espace de travail

12. **La recherche filtre vraiment.** Elle cherche dans les cartes du pipeline (nom et détail) ou dans les lignes du tableau de la rubrique ouverte, sans tenir compte des accents ni des majuscules. Le compteur affiche alors « 2 sur 5 ». `⌘K` (ou `Ctrl+K`) place le curseur dans la recherche, `Échap` la vide. Elle se remet à zéro quand tu changes de rubrique.
13. **Boutons pas encore branchés.** « Signer les contrats », « Confier à l'agent », « Valider », « Signer »… sont de vrais boutons, mais il n'y a pas encore de vraies données derrière. Au lieu de ne rien faire en silence, ils affichent un court message en bas de l'écran qui le dit clairement.
14. **Projets bien séparés.** Chaque projet a ses propres données, sa propre couleur et ses propres cases cochées (`marc-hq:todos:rnds` et `marc-hq:todos:club421`). Passer d'un projet à l'autre recharge complètement l'espace : rien ne déborde de l'un à l'autre.
15. **Petits ajouts utiles.** Compteur « 1 / 3 » à côté de « À faire », tâche cochée barrée, titre de l'onglet du navigateur qui suit la rubrique (« Ambassadeurs · RNDS · Marc HQ »), lien « Aller au contenu » pour la navigation au clavier.
16. **Dates calculées.** La date en haut (« MARDI 3 NOVEMBRE ») et les numéros de semaine sous le graphique (S34 à S45) sont calculés à partir du jour réel, pas écrits en dur.
17. **Tableau.** C'est un vrai tableau HTML (meilleur pour les lecteurs d'écran), qui défile horizontalement sur petit écran et peut être parcouru au clavier.
18. **Club 421 = même écran, autres données.** Aucun composant n'est propre à un projet : `Workspace` reçoit le projet et tout le reste (rubriques, pipeline BDE, bouton « Relancer », couleur menthe) vient de `src/data/club421.ts`. Ajouter un troisième projet plus tard = un nouveau fichier de données et deux routes.

## Accueil

19. **Le bâtiment reprend le dessin de la maquette, aux couleurs des projets.** Le dessin SVG est copié trait pour trait ; les noms d'attributs ont été adaptés à React (`stroke-width` devient `strokeWidth`, etc.). À la demande de Marc, ses couleurs d'accent ont été remplacées par celles des projets : orange RNDS `#FF5A36` (au lieu de `#FF7A45`), menthe Club 421 `#8FE0B0` (au lieu de `#4ADE80`), ambre d'alerte `#F0B44C` (au lieu de `#F5B83D`). Le bâtiment et les étiquettes ont donc exactement les mêmes couleurs.
20. **Le reste de l'accueil suit les tokens du brief.** Dans la maquette, l'accueil utilisait une autre palette (fond `#09090A`, polices Inter et JetBrains Mono, vert `#4ADE80`). J'ai suivi le brief : mêmes couleurs, mêmes polices (Geist, Geist Mono) et mêmes accents que l'espace de travail, pour que tout l'outil forme un seul ensemble. Validé par Marc le 3 novembre.
21. **Étages cliquables.** Comme dans la maquette, de grandes zones invisibles sur chaque étage ouvrent le projet à la souris. Au clavier, ce sont les deux étiquettes qui servent (ce sont de vrais liens). Sur téléphone, les étiquettes sortent du dessin et se rangent dessous, pour ne pas le cacher.
22. **Chiffres de l'accueil calculés.** « 2 agents au travail » et « 1 attend ta réponse » sont comptés à partir des agents des deux projets, et l'état « Agent : … » de chaque étage vient de l'agent le plus urgent du projet. La salutation passe de « Bonjour » à « Bonsoir » à 16 h (la maquette disait « Bonsoir » à 16 h 45).
23. **Composant `ProjectCard` en plus.** Les deux cartes projet de l'accueil ont leur propre composant (`src/components/ProjectCard.tsx`), qui n'était pas dans la liste du brief. La petite courbe reprend exactement le calcul de la maquette.
24. **Les étiquettes d'étage sont un peu plus larges** que dans la maquette (284 px au lieu de 236 px), pour que chaque ligne tienne sur une seule ligne.

## Passe de design « style Apple » (demandée par Marc)

25. **Police d'Apple.** Le texte, les titres et les chiffres utilisent la police système d'Apple (San Francisco) sur Mac, iPhone et iPad, et Geist sur les autres appareils. Big Shoulders Display (titres en capitales façon affiche) n'est plus utilisée : les titres sont en minuscules, gras et serrés, comme sur apple.com. Validé par Marc le 3 novembre. Pour revenir au style affiche, il suffit de changer `--font-display` dans `src/styles/tokens.css` et de remettre la police dans `index.html`.
26. **Les couleurs ne changent pas.** Fond, surfaces, accents RNDS et Club 421, ambre d'alerte : ce sont toujours les tokens du brief. J'ai ajouté des remplissages et des séparateurs translucides (`--fill`, `--hairline`) et un effet verre dépoli (`--glass`) pour les barres qui flottent au-dessus du contenu.
27. **Boutons en pilule**, arrondis plus généreux (14 à 28 px), petit effet d'enfoncement au clic, cases « À faire » rondes comme dans l'app Rappels, compteurs en pastille grise.
28. **Icônes de rubrique** dessinées dans l'esprit des SF Symbols (`src/components/ModuleIcon.tsx`), dans la barre latérale et dans la barre d'onglets.
29. **Mobile façon iPhone.** En dessous de 860 px de large :
    1. en haut, une barre en verre dépoli avec la flèche de retour vers HQ et un sélecteur RNDS / Club 421 (contrôle segmenté) ;
    2. en bas, une barre d'onglets fixe avec les 5 rubriques du projet (`src/components/TabBar.tsx`). « Vue d'ensemble » y devient « Aperçu », pour tenir dans l'onglet ;
    3. les marges tiennent compte de l'encoche et de la barre d'accueil de l'iPhone (`viewport-fit=cover` et `safe-area-inset`) ;
    4. le champ de recherche est en 16 px pour que Safari ne zoome pas dessus ;
    5. l'app peut être ajoutée à l'écran d'accueil de l'iPhone (balises `apple-mobile-web-app` dans `index.html`).
30. **Fil d'Ariane et en-têtes en minuscules.** « Projets », « Espace RNDS », « Données d'exemple », la date « Mardi 3 novembre » : en casse normale, comme chez Apple, au lieu des capitales espacées de la maquette. Seuls les en-têtes de colonnes des tableaux restent en petites capitales.
31. **Pas d'animation sur le graphique.** J'avais ajouté une animation de pousse des barres, mais elle pouvait rester bloquée au départ (barres presque invisibles) quand la page tourne en arrière-plan. Pour la fiabilité, elle est retirée. Le message en bas de l'écran garde une petite animation d'apparition, sans risque : s'il ne s'anime pas, il s'affiche quand même.
32. **Responsive vérifié** sur les 11 pages à 320, 375, 430, 768, 1 024 et 1 440 px de large : aucun défilement horizontal de la page (seuls les tableaux défilent, comme le demande le brief).

## Passe « maquette blanche » (demandée par Marc le 3 novembre, avec la skill unslop)

Marc a montré une image de référence : une maquette 3D toute blanche, posée sur un fond gris clair, avec des étiquettes en pilule blanche. Il voulait ce style d'interface, pas cette mise en page. La mise en page ne bouge donc pas.

33. **Direction.** Produit : le QG de Marc pour piloter RNDS et Club 421. Caractère : calme, net, posé. Univers : une maquette d'architecte blanche sous lumière douce. Élément fort : le bâtiment de l'accueil, et le graphique des 12 semaines dans les espaces. Signature : l'étiquette en pilule blanche avec un point de couleur.
34. **Thème clair.** Fond gris très clair `#f4f4f4`, cartes blanches avec un filet très léger et une ombre douce (`--shadow-card`), texte presque noir `#171a20`. Les couleurs du brief (pensées pour un fond sombre) sont remplacées dans `tokens.css`. Les couleurs des projets restent les mêmes familles, foncées juste assez pour être lisibles sur du blanc : orange RNDS `#f04a2a` (texte `#c2381c`), vert Club 421 `#1f9a5a` (texte `#17804a`), car la menthe `#8FE0B0` est illisible sur du blanc.
35. **Bâtiment en maquette blanche.** Sols blancs, murs gris clair, personnages gris, ombre douce sous le bâtiment. La couleur du projet ne reste que sur quelques détails : ring et sacs de frappe orange pour RNDS, enseigne et écrans verts pour Club 421. Les étiquettes d'étage sont des cartes blanches avec le point de couleur du projet.
36. **Signature pilule blanche.** Les compteurs d'agents de l'accueil, l'étiquette au-dessus du titre de chaque rubrique (« RNDS · Mardi 3 novembre ») et le bouton « Confier à l'agent » sont des pilules blanches avec ombre douce. Le contrôle RNDS / Club 421 sur mobile a son segment choisi en blanc, comme sur iOS en mode clair.
37. **Textes.** Plus de point final dans les grands titres. En-têtes de tableau, étage et nom de projet en casse normale (« Étage 1 », « Rez-de-chaussée », « Club 421 »). La salutation passe dans la petite ligne au-dessus du titre : le titre de l'accueil devient « Deux étages, une seule boutique ».
38. **Graisses.** Plus rien au-dessus de 600 (semi-gras) : la hiérarchie vient de la taille, pas de l'épaisseur.
39. **Chiffres clés.** Quatre par ligne, ou deux par deux sur les écrans moyens : plus de ligne avec une case vide.

## Maquette en pâte blanche, charte RNDS, graphique en plateaux (3 novembre)

40. **Bâtiment façon maquette en pâte blanche**, d'après la deuxième image de Marc : chaque face a un léger dégradé, une ombre douce sous le bâtiment, le ring, le bar et les tables, et une ombre au pied des murs. Les noms des zones sont peints au sol en capitales grasses penchées (« RING », « BAR », « TABLES »), et chaque étage a un tracé au sol (un trait plein et un trait pointillé) à la couleur du projet. Le dessin se règle sur une grille isométrique (`iso()` dans `Building.tsx`), ce qui rend les déplacements simples.
41. **Personnages en figurines.** Chaque personnage a une ombre portée, deux jambes, un buste arrondi avec un reflet, deux bras et une tête. Les boxeurs du ring ont les gants levés (un rouge RNDS, un gris). Ils sont décrits dans deux listes (`RNDS_PEOPLE`, `CLUB_PEOPLE`) : en ajouter un, c'est une ligne.
42. **Couleurs RNDS d'après sa charte graphique** (`Documents/RNDS/RNDS_charte_graphique.pdf`) : le rouge « Rouge Gong » `#FF0A3C` remplace l'orange de la maquette, avec `#C8002C` pour le texte sur fond blanc. La charte met du noir sur le rouge : le bouton principal RNDS a donc son texte en noir (c'est aussi plus lisible que du blanc).
43. **Logo RNDS respecté.** Sur le mur du bâtiment, le logo est en Kode Mono gras, noir, droit, avec le point rouge en haut à droite, comme dans la charte (pas incliné, pas en rouge, sans effet). Il a été placé sur le mur de gauche pour ne pas être caché par l'étiquette. Dans la barre latérale, la pastille RNDS est noire avec un « R » en Kode Mono. La police Kode Mono est chargée depuis Google Fonts.
44. **Club 421 garde son vert** en attendant sa charte graphique (remplacé par le violet, voir le point 48).
45. **Graphique en plateaux** (`src/components/WeeklySteps.tsx`), d'après la troisième image de Marc : une marche par semaine, reliée à la suivante par une pente, un trait épais, une zone qui s'efface vers le bas et des repères verticaux en pointillés. Les semaines passées sont en gris, la semaine en cours à la couleur du projet, avec un point et un trait pointillé. Le grand chiffre au-dessus est en graisse fine (300), comme dans la référence et dans la charte RNDS. Il remplace l'ancien graphique en barres (`WeeklyBars`).
46. **Graphique en plateaux aussi sur l'accueil.** Les cartes RNDS et Club 421 affichent le même graphique, en version compacte (sans l'axe des semaines), sous un grand chiffre fin. Il dessine maintenant de vraies données au lieu d'une courbe décorative : la série de la rubrique qui correspond au grand chiffre (abonnés pour RNDS, téléchargements pour Club 421), choisie par `trendModule` dans les données. L'ancien calcul de courbe (`src/lib/spark.ts`) est supprimé.
47. **Murs avec une vraie épaisseur.** Les murs du fond des deux étages sont maintenant des volumes de 8 unités d'épaisseur : face intérieure, dessus blanc et bout coupé visibles, comme sur une maquette. Club 421 a un grand mur à gauche et un muret bas du côté de RNDS. Le bar est une vraie boîte posée devant le mur. Composant `Walls` et fonction `solid()` dans `Building.tsx`. Les traits pointillés qui reliaient les étiquettes au dessin sont retirés : les étiquettes sont déjà posées sur leur étage.
48. **Club 421 en violet**, à la demande de Marc, calé ensuite sur le violet de son logo (voir le point 50). L'enseigne « 421 CLUB » est centrée sur le mur du fond, au-dessus du bar, à la place de l'enseigne et des petits écrans qui débordaient du mur. À ajuster quand la charte de Club 421 sera prête.
49. **Personnages façon figurines en vinyle**, d'après la référence de Marc : grosse tête ronde avec oreilles, petits yeux avec un éclat, sourcils épais, joues roses, casquette, bob, cheveux ou cheveux longs, lunettes ou lunettes de soleil, casque audio, téléphone ou gobelet, vêtements en couleur et baskets avec semelle. Chaque volume a un reflet en haut à gauche et une ombre en bas à droite (`vinyl()` dans `Building.tsx`), avec une ombre de la tête sur les épaules et des plis sur les vêtements. Ce sont des personnages originaux ; chacun est décrit par une ligne (`RNDS_PEOPLE`, `CLUB_PEOPLE`).
50. **Logos des projets**, fournis par Marc. RNDS : le « R » noir sur Rouge Gong, en carré arrondi (`src/components/ProjectMark.tsx`). Club 421 : le roi de trèfle avec ses dés, en blanc sur violet dans la barre latérale (`src/assets/logo-421-blanc.svg`) et en violet sur le mur du bâtiment (`src/assets/logo-421-violet.svg`), copiés depuis `Documents/club 421/Logo`. Le violet de Club 421 devient celui du logo : `#7c3aed` (texte `#6d28d9`, fond pâle `#f1eafe`).
51. **Points d'état à la couleur du projet** dans la barre latérale, à la demande de Marc, au lieu de l'ambre. Un projet qui attend une réponse garde un halo autour de son point, pour que l'information ne se perde pas.
52. **Abords du bâtiment**, d'après la référence de Marc : sol gris mat avec un léger grain, routes avec lignes pointillées et passage piéton, parcelles à coins arrondis autour (ombres douces), arbres en pâte blanche, réverbères et deux voitures. La scène est plus large (`viewBox` « -80 -40 1170 730 ») ; les zones cliquables ont été recalées.
53. **Bar du 421 garni** : une étagère de bouteilles au mur, des bouteilles, des verres et un gobelet à dés sur le comptoir.

## Tableaux de bord façon scène 3D, maquette animée (3 novembre)

54. **Nouveau tableau de bord de chaque projet**, d'après la référence de Marc (maison en maquette blanche) :
    1. **En-tête** : retour vers HQ, logo et nom du projet, recherche (`⌘K`), sélecteur RNDS / Club 421 (`src/components/WorkspaceHeader.tsx`). La barre latérale et le fil d'Ariane disparaissent.
    2. **Centre** : titre de la rubrique et ses deux actions, rubriques en pilules, puis la scène 3D de l'étage du projet seul sur sa plaque (`ProjectScene` dans `Building.tsx`). Des boutons ronds posés sur la maquette ouvrent les rubriques : le ring pour « Clubs », le mur et son logo pour « Publications », la table pour « BDE », le bar pour « Soirées »…
    3. **Colonne de gauche** : les agents et les chiffres clés deux par deux.
    4. **Panneau blanc à droite** : « Espace RNDS » en fin et la rubrique en gras, le grand chiffre fin avec son graphique en plateaux (`StatPanel`), puis « À faire » : la semaine en frise (aujourd'hui en relief, un point sous les jours qui ont une tâche) et les tâches en chronologie, la prochaine à faire rayée à la couleur du projet (`Activity`).
    5. **En dessous** : le pipeline ou le tableau, avec la recherche.
    6. **Écrans plus petits** : sous 1 280 px, le panneau passe sous la page ; sous 960 px, la colonne passe sous la scène ; sur téléphone, la barre d'onglets remplace les pilules.
55. **Personnages animés** (CSS, désactivé si l'appareil demande moins d'animations) :
    1. les deux boxeurs du ring se battent : chacun son tour, l'un avance et frappe, l'autre encaisse et recule, avec une étoile d'impact ;
    2. un boxeur frappe le sac, qui balance à chaque coup ;
    3. un personnage fait de la corde à sauter ;
    4. les marcheurs ont un vrai pas (jambes, bras, rebond à chaque appui, vitesse régulière) ;
    5. les autres respirent, chacun à son rythme.
56. **Ring redessiné** : tapis noir avec liseré et le « R » de RNDS au centre, tablier noir avec le logo RNDS en blanc et son point rouge (comme « sur noir » dans la charte), poteaux ronds avec coussins de coin, trois cordes rouge, blanc, rouge. Les cordes de devant passent devant les boxeurs.
57. **Pistes de 421** : table ronde sur pied, rebord blanc, tapis violet, gobelet ; sur la première, les trois dés d'un 421 (4, 2, 1) sont lancés, roulent et retombent en boucle.
58. **Lumière jaune pâle** sous les lampes, et une tache de lumière douce sur le tapis du ring.
59. **Routes et voitures** : bitume gris avec lignes de rive, ligne centrale en pointillés et passages piétons. Voitures en pâte : carrosserie, vitres teintées, pare-brise incliné, roues avec jantes, phares et feux arrière.
60. **Titre de l'accueil** : « Deux étages, une seule boutique » ne plaisait pas à Marc. Il devient « Marc HQ » en fin et « RNDS et Club 421 » en gras, comme le titre du panneau des tableaux de bord. La salutation reste dans la petite ligne au-dessus.
61. **Routes jusqu'aux bords** : les routes de l'arrière s'arrêtaient net dans le dessin ; elles filent maintenant hors du cadre. Les ombres floues des arbres et des voitures n'ont plus de bord carré (zone de flou agrandie).

## Barre latérale et outils de gestion (3 novembre)

62. **Barre latérale à icônes partout**, à la demande de Marc (accueil compris), dans l'esprit de sa référence « Unit Monitoring » : HQ en haut, les logos des projets pour passer de l'un à l'autre (avec leur point d'état), puis, dans un projet, ses rubriques et une section « Outils » (`src/components/AppRail.tsx`). Elle remplace les pilules de rubriques, le bouton retour et le sélecteur de l'en-tête ; sur téléphone, où elle est masquée, l'en-tête garde le retour et le sélecteur.
63. **Trois outils par projet**, enregistrés dans le navigateur (stockage local), séparément pour chaque projet (`src/data/tools.ts`) :
    1. **To do** (`/rnds/todo`) : ajouter une tâche avec une échéance, la cocher, la supprimer ; tâches groupées En retard, Aujourd'hui, Cette semaine, Plus tard, Sans date, et un onglet « Faites ». C'est la même liste que le panneau « À faire » des tableaux de bord, qui montre les 4 prochaines et mène à la page complète. Au départ, elle contient les tâches de la maquette, datées sur la semaine en cours.
    2. **Notes** (`/rnds/notes`) : liste à gauche, note ouverte à droite, enregistrement à chaque frappe, épingler, supprimer. Sur téléphone, la liste ou la note, l'une après l'autre.
    3. **Idées** (`/rnds/idees`) : trois colonnes « À creuser », « À tester », « Validées » ; on déplace une idée avec ses flèches ou en la glissant (ordinateur), on l'ouvre pour l'éditer. Au départ, Club 421 contient la seule idée de la maquette (« Finale inter BDE en décembre »).
    La recherche de l'en-tête filtre aussi ces pages. Ces données restent dans ce navigateur : elles ne passent pas d'un appareil à l'autre tant que Supabase n'est pas branché (il suffira de réécrire `tools.ts`).
64. **Barre d'onglets sur téléphone** : Aperçu, To do, Notes, Idées et « Rubriques », qui ouvre une feuille avec les autres rubriques du projet.
