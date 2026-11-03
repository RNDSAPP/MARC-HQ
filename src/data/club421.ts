// Sample data for Club 421, taken from reference/maquette.dc.html.
import type { Project } from './types';

export const club421: Project = {
  id: 'club421',
  name: 'Club 421',
  tag: 'Jeu iOS',
  mark: '4',
  space: 'Espace Club 421',
  searchPlaceholder: 'Rechercher un BDE, une soirée, un avis',

  agents: [
    {
      name: 'Agent iOS',
      task: 'Soumet la version 1.3 avec le mode équipe. Review Apple en cours.',
      status: 'work',
      when: 'en direct',
      action: 'Suivre',
    },
    {
      name: 'Agent partenariats',
      task: '3 mails de relance BDE sont prêts, ils attendent ton envoi.',
      status: 'done',
      when: 'il y a 40 min',
      action: 'Relire',
    },
  ],

  todos: [
    { id: 'club421-1', text: 'Confirmer la soirée du 14 avec le BDE Commerce', due: 'Auj.' },
    { id: 'club421-2', text: 'Relancer le BDE Ingé', due: 'Auj.' },
    { id: 'club421-3', text: 'Répondre aux 4 avis App Store', due: 'Jeu.' },
  ],

  pipeline: {
    title: 'Pipeline BDE',
    hotAction: 'Relancer',
    columns: [
      {
        name: 'À contacter',
        tone: 'new',
        cards: [
          { name: 'BDE Droit Lyon', meta: 'Faculté · 1 800 étudiants', when: 'Nouveau' },
          { name: 'BDE Archi', meta: 'École · 600 étudiants', when: 'Nouveau' },
        ],
      },
      {
        name: 'Contactés',
        tone: 'muted',
        cards: [{ name: 'BDE Ingé Lyon', meta: 'École d’ingé · respo events', when: 'Relance' }],
      },
      {
        name: 'En discussion',
        tone: 'alert',
        hot: true,
        cards: [
          { name: 'BDE Sciences Po', meta: 'IEP · trésorier', when: 'Appel lun.' },
          { name: 'BDE Commerce Lyon', meta: 'Soirée du 14 à confirmer', when: 'Auj.' },
        ],
      },
      {
        name: 'Partenaires',
        tone: 'accent',
        cards: [
          { name: 'BDE Médecine', meta: 'Faculté · 2 soirées faites', when: 'Depuis sept.' },
          { name: 'BDE Pharma', meta: 'Faculté · 1 soirée faite', when: 'Depuis oct.' },
        ],
      },
    ],
  },

  modules: [
    {
      slug: 'vue-d-ensemble',
      label: 'Vue d’ensemble',
      headline: 'La soirée du 14 est à confirmer.',
      sub: 'Le BDE Commerce attend ta réponse pour ouvrir la billetterie. 150 étudiants, ta plus grosse soirée à date.',
      cta: 'Confirmer la soirée',
      heroLabel: 'Téléchargements cette semaine',
      heroNum: '+184',
      heroDelta: '+32 %',
      series: [60, 72, 68, 90, 85, 104, 98, 120, 131, 126, 140, 184],
      kpis: [
        { label: 'Téléchargements', value: '2 930', delta: '+184' },
        { label: 'CA du mois', value: '312 €', delta: '+18 %' },
        { label: 'BDE partenaires', value: '7', delta: '+2' },
        { label: 'Note App Store', value: '4,7', delta: '+0,1' },
      ],
      view: { kind: 'pipeline' },
    },
    {
      slug: 'bde',
      label: 'BDE',
      count: '15',
      headline: '2 BDE à un appel de signer.',
      sub: 'Le BDE Ingé n’a pas répondu depuis une semaine. Ton agent a préparé la relance.',
      cta: 'Ajouter un BDE',
      heroLabel: 'Étudiants touchés',
      heroNum: '2 400',
      heroDelta: '+600',
      series: [300, 420, 500, 640, 800, 950, 1100, 1350, 1600, 1900, 2100, 2400],
      kpis: [
        { label: 'Partenaires', value: '7', delta: '+2' },
        { label: 'En discussion', value: '2', delta: '0' },
        { label: 'Contactés', value: '1', delta: '+1' },
        { label: 'À contacter', value: '8', delta: '+3' },
      ],
      view: { kind: 'pipeline' },
    },
    {
      slug: 'soirees',
      label: 'Soirées',
      count: '2',
      headline: '2 soirées ce mois.',
      sub: '120 joueurs en moyenne par soirée. De quoi viser une finale inter BDE en décembre.',
      cta: 'Créer une soirée',
      heroLabel: 'Joueurs par soirée',
      heroNum: '120',
      heroDelta: '+20',
      series: [40, 55, 60, 70, 80, 85, 90, 95, 100, 105, 110, 120],
      kpis: [
        { label: 'Prévues', value: '2', delta: 'ce mois' },
        { label: 'Réalisées', value: '5', delta: 'au total' },
        { label: 'Joueurs', value: '600', delta: 'cumul' },
        { label: 'Téléchargements le soir', value: '+38', delta: 'moyenne' },
      ],
      view: {
        kind: 'table',
        title: 'Agenda',
        columns: ['SOIRÉE', 'BDE', 'DATE', 'STATUT'],
        rows: [
          ['Tournoi 421', 'BDE Commerce Lyon', '14 nov.', 'À confirmer'],
          ['Soirée dés', 'BDE Médecine', '28 nov.', 'Confirmé'],
          ['Finale inter BDE', 'Tous', 'Décembre', 'Idée'],
        ],
      },
    },
    {
      slug: 'app-store',
      label: 'App Store',
      count: '4',
      headline: '4 avis attendent une réponse.',
      sub: 'La 1.3 est en review. Tu peux répondre au joueur qui réclamait le mode équipe : il arrive.',
      cta: 'Répondre aux avis',
      heroLabel: 'Note moyenne, 62 avis',
      heroNum: '4,7',
      heroDelta: '+0,1',
      series: [4.3, 4.4, 4.4, 4.5, 4.5, 4.5, 4.6, 4.6, 4.6, 4.7, 4.7, 4.7],
      kpis: [
        { label: 'Téléchargements', value: '2 930', delta: '+184' },
        { label: 'Note', value: '4,7', delta: '+0,1' },
        { label: 'Version', value: '1.2', delta: '1.3 en review' },
        { label: 'Crashs', value: '0,2 %', delta: '-0,1' },
      ],
      view: {
        kind: 'table',
        title: 'Derniers avis',
        columns: ['AVIS', 'NOTE', 'DATE', 'STATUT'],
        rows: [
          ['Parfait en soirée', '5', 'Hier', 'À répondre'],
          ['Il manque un mode équipe', '4', 'Lun.', 'À répondre'],
          ['Les dés dorés valent le coup', '5', 'Dim.', 'À répondre'],
          ['Trop addictif', '5', 'Sam.', 'Répondu'],
        ],
      },
    },
    {
      slug: 'revenus',
      label: 'Revenus',
      headline: '312 € ce mois, +18 %.',
      sub: 'Le pack de dés dorés fait la moitié du chiffre. Les soirées BDE font décoller les achats le lendemain.',
      cta: 'Exporter le mois',
      heroLabel: 'Chiffre d’affaires du mois',
      heroNum: '312 €',
      heroDelta: '+18 %',
      series: [80, 95, 110, 120, 135, 150, 170, 198, 220, 250, 264, 312],
      kpis: [
        { label: 'CA', value: '312 €', delta: '+18 %' },
        { label: 'Achats', value: '96', delta: '+15' },
        { label: 'Panier moyen', value: '3,25 €', delta: '+0,10' },
        { label: 'Part des dés dorés', value: '52 %', delta: '+6' },
      ],
      view: {
        kind: 'table',
        title: 'Par mois',
        columns: ['MOIS', 'CA', 'ACHATS', 'TENDANCE'],
        rows: [
          ['Novembre', '312 €', '96', 'Hausse'],
          ['Octobre', '264 €', '81', 'Hausse'],
          ['Septembre', '198 €', '60', 'Stable'],
        ],
      },
    },
  ],

  home: {
    label: 'CLUB 421',
    floor: 'REZ DE CHAUSSÉE',
    summary: '+184 téléchargements · 312 € ce mois',
    big: '+184',
    bigLabel: 'téléchargements cette semaine',
    mini: [
      { label: 'CA du mois', value: '312 €' },
      { label: 'BDE partenaires', value: '7' },
    ],
    sparkSeed: 2,
    shortTag: '421',
    todos: [{ text: 'Confirmer la soirée du 14' }, { text: 'Répondre aux 4 avis App Store' }],
  },
};
