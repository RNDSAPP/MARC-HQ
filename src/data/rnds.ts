// Sample data for RNDS, taken from reference/maquette.dc.html.
import type { Project } from './types';

export const rnds: Project = {
  id: 'rnds',
  name: 'RNDS',
  tag: 'App boxe',
  mark: 'R',
  space: 'Espace RNDS',
  searchPlaceholder: 'Rechercher un club, un ambassadeur, un post',

  agents: [
    {
      name: 'Agent produit',
      task: 'A fini l’écran de détection des coups. Il attend ta validation avant de lancer les tests.',
      status: 'wait',
      when: 'il y a 12 min',
      action: 'Valider',
    },
    {
      name: 'Agent contenu',
      task: 'Les 4 publications de la semaine sont prêtes et planifiées.',
      status: 'done',
      when: 'il y a 1 h',
      action: 'Voir',
    },
  ],

  todos: [
    { id: 'rnds-1', text: 'Signer le contrat de Villeurbanne Boxing', due: 'Auj.' },
    { id: 'rnds-2', text: 'Relancer Yanis, aucune publication depuis 12 jours', due: 'Auj.' },
    { id: 'rnds-3', text: 'Valider le reel de jeudi', due: 'Mer.' },
  ],

  pipeline: {
    title: 'Pipeline clubs',
    hotAction: 'Signer',
    columns: [
      {
        name: 'À contacter',
        tone: 'new',
        cards: [
          { name: 'Boxe Part Dieu', meta: 'Lyon 3e · 70 membres', when: 'Nouveau' },
          { name: 'Fight Academy Écully', meta: 'Écully · 33 membres', when: 'Nouveau' },
        ],
      },
      {
        name: 'En discussion',
        tone: 'muted',
        cards: [
          { name: 'Noble Art Vénissieux', meta: 'Vénissieux · 38 membres', when: 'Appel jeu.' },
          { name: 'Team Fight Décines', meta: 'Décines · 29 membres', when: 'Relance' },
        ],
      },
      {
        name: 'Contrat à signer',
        tone: 'alert',
        hot: true,
        cards: [
          { name: 'Villeurbanne Boxing', meta: 'Villeurbanne · 61 membres', when: 'Auj.' },
          { name: 'Punch Factory Bron', meta: 'Bron · 44 membres', when: 'Ven.' },
        ],
      },
      {
        name: 'Affiliés',
        tone: 'accent',
        cards: [
          { name: 'Boxe Club Lyon 7', meta: 'Lyon 7e · 84 membres', when: 'Depuis août' },
          { name: 'Boxe Gerland', meta: 'Lyon 7e · 52 membres', when: 'Depuis sept.' },
          { name: 'Ring Croix Rousse', meta: 'Lyon 4e · 47 membres', when: 'Depuis oct.' },
        ],
      },
    ],
  },

  modules: [
    {
      slug: 'vue-d-ensemble',
      label: 'Vue d’ensemble',
      headline: '2 clubs attendent ta signature.',
      sub: 'Villeurbanne Boxing et Punch Factory Bron ont dit oui. Il ne manque plus que toi pour passer à 14 clubs affiliés.',
      cta: 'Signer les contrats',
      heroLabel: 'Clubs affiliés',
      heroNum: '12',
      heroDelta: '+2 ce mois',
      series: [3, 3, 4, 5, 5, 6, 7, 7, 8, 9, 10, 12],
      kpis: [
        { label: 'Clubs affiliés', value: '12', delta: '+2' },
        { label: 'Ambassadeurs', value: '9', delta: '+1' },
        { label: 'Inscriptions générées', value: '143', delta: '+22' },
        { label: 'Abonnés', value: '3 412', delta: '+6 %' },
      ],
      view: { kind: 'pipeline' },
    },
    {
      slug: 'clubs',
      label: 'Clubs',
      count: '18',
      headline: '4 clubs en discussion, 2 à signer.',
      sub: 'Ton prochain club se trouve probablement dans cette liste. Les relances sont triées par urgence.',
      cta: 'Ajouter un club',
      heroLabel: 'Membres couverts',
      heroNum: '860',
      heroDelta: '+74',
      series: [410, 450, 480, 520, 560, 600, 640, 690, 720, 780, 820, 860],
      kpis: [
        { label: 'Affiliés', value: '12', delta: '+2' },
        { label: 'À signer', value: '2', delta: '+1' },
        { label: 'En discussion', value: '4', delta: '+1' },
        { label: 'À contacter', value: '6', delta: '0' },
      ],
      view: { kind: 'pipeline' },
    },
    {
      slug: 'ambassadeurs',
      label: 'Ambassadeurs',
      count: '9',
      headline: 'Karim a ramené 41 inscriptions.',
      sub: 'Il est ton meilleur ambassadeur, de loin. Yanis n’a rien publié depuis 12 jours : une relance s’impose.',
      cta: 'Ajouter un ambassadeur',
      heroLabel: 'Inscriptions générées',
      heroNum: '143',
      heroDelta: '+22 cette semaine',
      series: [2, 5, 8, 12, 18, 26, 40, 55, 71, 96, 121, 143],
      kpis: [
        { label: 'Ambassadeurs', value: '9', delta: '+1' },
        { label: 'Actifs', value: '7', delta: '0' },
        { label: 'Meilleur code', value: 'LYON10', delta: '41' },
        { label: 'Conversion', value: '6,2 %', delta: '+0,8' },
      ],
      view: {
        kind: 'table',
        title: 'Classement',
        columns: ['AMBASSADEUR', 'CLUB', 'INSCRIPTIONS', 'STATUT'],
        rows: [
          ['Karim B.', 'Boxe Club Lyon 7', '41', 'Actif'],
          ['Inès D.', 'Ring Croix Rousse', '33', 'Actif'],
          ['Mehdi K.', 'Boxe Gerland', '27', 'Actif'],
          ['Yanis M.', 'Boxe Gerland', '12', 'À relancer'],
          ['Sarah L.', 'Villeurbanne Boxing', '0', 'En discussion'],
        ],
      },
    },
    {
      slug: 'publications',
      label: 'Publications',
      count: '4',
      headline: 'Le reel de jeudi attend ton feu vert.',
      sub: 'Les 4 contenus de la semaine sont prêts. Ta semaine est couverte jusqu’à dimanche.',
      cta: 'Planifier un post',
      heroLabel: 'Vues moyennes par reel',
      heroNum: '4 900',
      heroDelta: '+12 %',
      series: [2100, 2600, 2400, 3100, 2900, 3500, 3300, 3900, 4100, 3800, 4500, 4900],
      kpis: [
        { label: 'Prévues', value: '4', delta: 'cette sem.' },
        { label: 'Publiées', value: '18', delta: 'ce mois' },
        { label: 'Engagement', value: '7,4 %', delta: '+1,1' },
        { label: 'Meilleur format', value: 'Reel', delta: '61 %' },
      ],
      view: {
        kind: 'table',
        title: 'Cette semaine',
        columns: ['CONTENU', 'FORMAT', 'DATE', 'STATUT'],
        rows: [
          ['Détection des coups en action', 'Reel', 'Jeu. 18 h', 'À valider'],
          ['Portrait de Karim', 'Carrousel', 'Ven. 12 h', 'Prêt'],
          ['Défi 100 coups', 'TikTok', 'Sam. 17 h', 'Prêt'],
          ['Club du mois : Gerland', 'Story', 'Dim. 10 h', 'Prêt'],
        ],
      },
    },
    {
      slug: 'abonnes',
      label: 'Abonnés',
      headline: '+192 abonnés en 30 jours.',
      sub: 'TikTok grandit deux fois plus vite qu’Instagram. Les vidéos d’entraînement font la différence.',
      cta: 'Fixer un objectif',
      heroLabel: 'Abonnés au total',
      heroNum: '3 412',
      heroDelta: '+6 %',
      series: [2600, 2650, 2720, 2790, 2850, 2930, 3000, 3080, 3150, 3230, 3320, 3412],
      kpis: [
        { label: 'Instagram', value: '2 640', delta: '+5 %' },
        { label: 'TikTok', value: '772', delta: '+9 %' },
        { label: 'Inscrits app', value: '1 108', delta: '+14 %' },
        { label: 'Objectif 5 000', value: '68 %', delta: '+4' },
      ],
      view: {
        kind: 'table',
        title: 'Par plateforme',
        columns: ['PLATEFORME', 'ABONNÉS', '30 JOURS', 'TENDANCE'],
        rows: [
          ['Instagram', '2 640', '+128', 'Hausse'],
          ['TikTok', '772', '+64', 'Hausse'],
          ['App RNDS', '1 108', '+143', 'Hausse'],
        ],
      },
    },
  ],

  home: {
    label: 'RNDS',
    floor: 'ÉTAGE 1',
    summary: '2 clubs en attente · 3 412 abonnés',
    big: '3 412',
    bigLabel: 'abonnés, +6 % sur 30 jours',
    mini: [
      { label: 'Clubs affiliés', value: '12' },
      { label: 'Ambassadeurs', value: '9' },
    ],
    sparkSeed: 1,
    shortTag: 'RNDS',
    todos: [
      { text: 'Valider l’écran de détection des coups' },
      { text: 'Signer le contrat de Villeurbanne Boxing' },
    ],
  },
};
