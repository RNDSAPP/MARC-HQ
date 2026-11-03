// Club 421 in Marc HQ: real figures only. What is not plugged in yet is at 0; the App Store
// comes live from App Store Connect, the agents from Claude Code, the tasks from Supabase.
import type { Project } from './types';

export const club421: Project = {
  id: 'club421',
  name: 'Club 421',
  tag: 'Jeu iOS',
  mark: '4',
  space: 'Espace Club 421',
  searchPlaceholder: 'Rechercher un BDE, une soirée, un avis',

  // Real agents come from Claude Code (marc-hq skill, lib/agents.ts); none written here
  agents: [],

  todos: [],

  pipeline: {
    title: 'Pipeline BDE',
    hotAction: 'Relancer',
    columns: [
      { name: 'À contacter', tone: 'new', cards: [] },
      { name: 'Contactés', tone: 'muted', cards: [] },
      { name: 'En discussion', tone: 'alert', hot: true, cards: [] },
      { name: 'Partenaires', tone: 'accent', cards: [] },
    ],
  },

  modules: [
    {
      slug: 'vue-d-ensemble',
      label: 'Vue d’ensemble',
      headline: 'Premier BDE à trouver',
      sub: 'Pas encore de BDE partenaire ni de revenu. Ajoute un premier BDE pour lancer les soirées.',
      cta: 'Ajouter un BDE',
      heroLabel: 'BDE partenaires',
      heroNum: '0',
      heroDelta: 'pas encore',
      series: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      kpis: [
        { label: 'Téléchargements', value: '–', delta: 'à brancher' },
        { label: 'CA du mois', value: '0 €', delta: '' },
        { label: 'BDE partenaires', value: '0', delta: '' },
        { label: 'Note App Store', value: '–', delta: '' },
      ],
      view: { kind: 'pipeline' },
    },
    {
      slug: 'bde',
      label: 'BDE',
      count: '0',
      headline: 'Pas encore de BDE',
      sub: 'Ajoute ton premier BDE : il apparaîtra sur le campus, dans son étape (à contacter, contacté, en discussion, partenaire).',
      cta: 'Ajouter un BDE',
      heroLabel: 'Étudiants touchés',
      heroNum: '0',
      heroDelta: 'pas encore',
      series: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      kpis: [
        { label: 'Partenaires', value: '0', delta: '' },
        { label: 'En discussion', value: '0', delta: '' },
        { label: 'Contactés', value: '0', delta: '' },
        { label: 'À contacter', value: '0', delta: '' },
      ],
      view: { kind: 'pipeline' },
    },
    {
      slug: 'soirees',
      label: 'Soirées',
      count: '0',
      headline: 'Pas encore de soirée',
      sub: 'Les soirées viendront avec les premiers BDE : chacune apparaîtra ici avec sa date, et dans ton Google Agenda.',
      cta: 'Créer une soirée',
      heroLabel: 'Joueurs par soirée',
      heroNum: '0',
      heroDelta: 'pas encore',
      series: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      kpis: [
        { label: 'Prévues', value: '0', delta: '' },
        { label: 'Réalisées', value: '0', delta: '' },
        { label: 'Joueurs', value: '0', delta: '' },
        { label: 'Téléchargements le soir', value: '–', delta: '' },
      ],
      view: {
        kind: 'table',
        title: 'Agenda',
        columns: ['Soirée', 'BDE', 'Date', 'Statut'],
        rows: [],
      },
    },
    // App Store: filled live from App Store Connect once signed in (lib/appstore.ts, withStore)
    {
      slug: 'app-store',
      label: 'App Store',
      headline: 'Avis App Store',
      sub: 'Les avis et les versions arrivent en direct d’App Store Connect.',
      cta: 'Répondre aux avis',
      heroLabel: 'Note moyenne',
      heroNum: '–',
      heroDelta: '',
      series: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      kpis: [
        { label: 'En ligne', value: '–', delta: '' },
        { label: 'Dernière version', value: '–', delta: '' },
        { label: 'Avis écrits', value: '0', delta: '' },
        { label: 'À répondre', value: '0', delta: '' },
      ],
      view: {
        kind: 'table',
        title: 'Derniers avis',
        columns: ['Avis', 'Note', 'Date', 'Statut'],
        rows: [],
      },
    },
    {
      slug: 'revenus',
      label: 'Revenus',
      headline: '0 € pour l’instant',
      sub: 'Pas encore de vente. Les revenus apparaîtront ici, mois par mois, dès le premier achat.',
      cta: 'Exporter le mois',
      heroLabel: 'Chiffre d’affaires du mois',
      heroNum: '0 €',
      heroDelta: 'pas encore',
      series: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      kpis: [
        { label: 'CA', value: '0 €', delta: '' },
        { label: 'Achats', value: '0', delta: '' },
        { label: 'Panier moyen', value: '–', delta: '' },
        { label: 'Part des dés dorés', value: '0 %', delta: '' },
      ],
      view: {
        kind: 'table',
        title: 'Par mois',
        columns: ['Mois', 'CA', 'Achats', 'Tendance'],
        rows: [['Novembre', '0 €', '0', 'Stable']],
      },
    },
  ],

  home: {
    label: 'Club 421',
    floor: 'Rez-de-chaussée',
    summary: '0 BDE · 0 € ce mois',
    big: '0 €',
    bigLabel: 'chiffre d’affaires ce mois',
    mini: [
      { label: 'CA du mois', value: '0 €' },
      { label: 'BDE partenaires', value: '0' },
    ],
    trendModule: 'revenus',
    shortTag: '421',
    todos: [],
  },
};
