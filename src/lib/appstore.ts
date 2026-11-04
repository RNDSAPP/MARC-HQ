import { useCallback, useEffect, useState } from 'react';
import type { Project } from '../data/types';
import { isoDate } from './dates';
import { compact } from './format';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { useSession } from './session';
import { supabase } from './supabase';

export type StoreReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  nickname: string;
  date: string;
  territory: string;
  response: { body: string; state: string } | null;
};
export type StoreVersion = { version: string; state: string; platform: string; created: string };
/** One month of sales from Apple's daily reports; proceeds per currency, never added together. */
export type StoreMonth = { month: string; downloads: number; purchases: number; proceeds: Record<string, number> };
export type StoreData = {
  app: { name: string; bundleId: string };
  versions: StoreVersion[];
  reviews: StoreReview[];
  sales?: { through: string | null; months: StoreMonth[]; days?: { day: string; downloads: number; purchases: number; proceeds: Record<string, number> }[] };
};

const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const monthName = (key: string) => MONTH_NAMES[Number(key.slice(5, 7)) - 1] ?? key;
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** { EUR: 3.98, USD: 1.2 } → "3,98 € + 1,20 $US", euros first; "0 €" when nothing. */
export function moneyText(amounts: Record<string, number>) {
  const parts = Object.entries(amounts)
    .filter(([, value]) => Math.abs(value) >= 0.005)
    .sort(([a], [b]) => (a === 'EUR' ? -1 : b === 'EUR' ? 1 : a.localeCompare(b)))
    .map(([currency, value]) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: value >= 1000 ? 0 : 2 }).format(value));
  return parts.join(' + ') || '0 €';
}

/** Apple's version states, in Marc's words. */
export const VERSION_STATE: Record<string, string> = {
  READY_FOR_SALE: 'En ligne',
  READY_FOR_DISTRIBUTION: 'En ligne',
  ACCEPTED: 'Acceptée',
  PENDING_DEVELOPER_RELEASE: 'Acceptée, à publier',
  WAITING_FOR_REVIEW: 'En attente de review',
  IN_REVIEW: 'En review',
  PREPARE_FOR_SUBMISSION: 'En préparation',
  PROCESSING_FOR_APP_STORE: 'En traitement',
  PROCESSING_FOR_DISTRIBUTION: 'En traitement',
  REJECTED: 'Refusée',
  METADATA_REJECTED: 'Fiche refusée',
  DEVELOPER_REJECTED: 'Retirée',
  REPLACED_WITH_NEW_VERSION: 'Remplacée',
};

async function failure(error: unknown) {
  if (error instanceof FunctionsHttpError) return ((await error.context.json().catch(() => ({}))).error as string) ?? 'Erreur du serveur.';
  return 'Pas de réponse du serveur.';
}

// The projects that have an app on App Store Connect (the server ties each one to its app)
const STORE_PROJECTS = ['rnds', 'club421'];

// One shared copy for the whole app: loaded once per session, again after answering a review
const cache: Record<string, StoreData> = {};
const errors: Record<string, string> = {};
const listeners = new Set<() => void>();
let loadedFor: string | null = null;

async function fetchOverview(projectId: string) {
  if (!supabase) return;
  const { data, error } = await supabase.functions.invoke('appstore', { body: { action: 'overview', project_id: projectId } });
  if (error) errors[projectId] = await failure(error);
  else {
    delete errors[projectId];
    cache[projectId] = data as StoreData;
  }
  listeners.forEach((listener) => listener());
}

/** Every project's live App Store data, once Marc is signed in. */
export function useStoreOverviews() {
  const session = useSession();
  const [, refresh] = useState(0);
  useEffect(() => {
    const listener = () => refresh((n) => n + 1);
    listeners.add(listener);
    if (session && loadedFor !== session.user.id) {
      loadedFor = session.user.id;
      STORE_PROJECTS.forEach(fetchOverview);
    }
    return () => {
      listeners.delete(listener);
    };
  }, [session]);
  return cache;
}

/**
 * The project's app on App Store Connect, read through the `appstore` server function once Marc
 * is signed in: latest versions and written reviews, and a way to answer a review. `enabled`
 * limits it to the App Store page.
 */
export function useAppStore(projectId: string, enabled: boolean) {
  const session = useSession();
  const all = useStoreOverviews();
  const reload = useCallback(() => fetchOverview(projectId), [projectId]);
  const reply = useCallback(
    async (reviewId: string, text: string) => {
      if (!supabase) return 'Supabase n’est pas réglé.';
      const { error: failed } = await supabase.functions.invoke('appstore', { body: { action: 'reply', project_id: projectId, review_id: reviewId, text } });
      if (failed) return failure(failed);
      await fetchOverview(projectId);
      return '';
    },
    [projectId],
  );
  return { session, data: enabled ? (all[projectId] ?? null) : null, error: enabled ? (errors[projectId] ?? '') : '', reload, reply };
}

const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`;

/** A version in words: "1.7 en attente de review". */
export const versionLine = (version: StoreVersion | undefined) => (version ? `${version.version} ${(VERSION_STATE[version.state] ?? version.state).toLowerCase()}` : '');

/**
 * The project with its App Store page in real figures: headline, rating, versions and reviews
 * waiting for an answer, as App Store Connect gives them.
 */
export function withStore(project: Project, store: StoreData | undefined): Project {
  if (!store) return project;
  return withSales(withReviews(project, store), store);
}

/**
 * Downloads and revenue, from Apple's daily sales reports (kept by the hourly round): the month so
 * far on the overview, the App Store page and the home card, and month by month on "Revenus".
 */
function withSales(project: Project, store: StoreData): Project {
  if (!store.sales) return project;
  const key = isoDate().slice(0, 7);
  const empty: StoreMonth = { month: key, downloads: 0, purchases: 0, proceeds: {} };
  const months = store.sales.months;
  const now = months.find((month) => month.month === key) ?? empty;
  const ca = moneyText(now.proceeds);
  const euros = (month: StoreMonth) => month.proceeds.EUR ?? 0;
  const downloads = { label: 'Téléchargements', value: compact(String(now.downloads)), delta: `en ${monthName(key)}` };
  const revenue = { label: 'CA du mois', value: ca, delta: now.purchases ? `${now.purchases} achat${now.purchases > 1 ? 's' : ''}` : `en ${monthName(key)}` };
  // The last 12 months, oldest first, for the curve
  const last12 = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 11 + i);
    const at = isoDate(d).slice(0, 7);
    return months.find((month) => month.month === at) ?? { ...empty, month: at };
  });
  const segments = project.home.summary.split(' · ').filter((part) => !part.includes('€'));
  return {
    ...project,
    home: {
      ...project.home,
      // Revenue on the card when the app sells (Club 421 always shows it, at 0 € too)
      summary: (project.home.mini.some((item) => item.label === 'CA du mois') || Object.keys(now.proceeds).length ? [...segments, `${ca} ce mois`] : segments).join(' · '),
      big: project.home.bigLabel.includes('chiffre') ? ca : project.home.big,
      mini: project.home.mini.map((item) => (item.label === 'CA du mois' ? { ...item, value: ca } : item.label === 'Téléchargements' ? { ...item, value: downloads.value } : item)),
    },
    modules: project.modules.map((module) => {
      const kpis = module.kpis.map((kpi) => (kpi.label === 'Téléchargements' ? downloads : kpi.label === 'CA du mois' ? revenue : kpi));
      if (module.slug === 'app-store') {
        return { ...module, kpis: [downloads, revenue, ...module.kpis.filter((kpi) => kpi.label === 'En ligne' || kpi.label === 'À répondre')] };
      }
      if (module.slug !== 'revenus') return { ...module, kpis };
      const basket = now.purchases && euros(now) ? moneyText({ EUR: euros(now) / now.purchases }) : '–';
      return {
        ...module,
        headline: Object.keys(now.proceeds).length ? `${ca} en ${monthName(key)}` : module.headline,
        heroNum: ca,
        heroDelta: `${now.downloads} téléchargement${now.downloads > 1 ? 's' : ''}`,
        series: last12.map(euros),
        kpis: kpis.map((kpi) => (kpi.label === 'CA' ? { ...kpi, value: ca } : kpi.label === 'Achats' ? { ...kpi, value: String(now.purchases) } : kpi.label === 'Panier moyen' ? { ...kpi, value: basket } : kpi)),
        view:
          module.view.kind === 'table'
            ? {
                ...module.view,
                rows: [...months].reverse().map((month, i, list) => {
                  const before = list[i + 1];
                  const trend = !before ? 'Stable' : euros(month) > euros(before) ? 'Hausse' : euros(month) < euros(before) ? 'Baisse' : 'Stable';
                  return [capital(monthName(month.month)), moneyText(month.proceeds), String(month.purchases), trend];
                }),
              }
            : module.view,
      };
    }),
  };
}

/** The App Store page in real figures: headline, rating, versions and reviews waiting for an answer. */
function withReviews(project: Project, store: StoreData): Project {
  const notes = store.reviews.map((r) => r.rating);
  const average = notes.length ? (notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1).replace('.', ',') : '–';
  const waiting = store.reviews.filter((r) => !r.response).length;
  const current = store.versions[0];
  const online = store.versions.find((v) => VERSION_STATE[v.state] === 'En ligne');
  // The version in front of what the records say (clubs, BDE…), kept as they are
  const rest = project.home.summary.split(' · ').filter((part) => !/ (en ligne|en attente|en review|acceptée|en préparation|en traitement|refusée)/i.test(part));
  return {
    ...project,
    home: { ...project.home, summary: [versionLine(current), ...rest].filter(Boolean).join(' · ') },
    modules: project.modules.map((module) =>
      module.slug !== 'app-store'
        ? { ...module, kpis: module.kpis.map((kpi) => (kpi.label === 'Note App Store' ? { ...kpi, value: average, delta: `${plural(notes.length, 'avis')}` } : kpi)) }
        : {
            ...module,
            count: waiting ? String(waiting) : undefined,
            headline: waiting ? `${plural(waiting, 'avis')} ${waiting > 1 ? 'attendent' : 'attend'} une réponse` : notes.length ? 'Tous les avis ont une réponse' : 'Pas encore d’avis écrit',
            sub: [current && `Version ${versionLine(current)}.`, online && online !== current && `La ${online.version} est en ligne.`].filter(Boolean).join(' '),
            heroLabel: `Note moyenne, ${plural(notes.length, 'avis écrit')}`,
            heroNum: average,
            heroDelta: '',
            series: notes.length ? Array(12).fill(Number(average.replace(',', '.'))) : Array(12).fill(0),
            kpis: [
              { label: 'En ligne', value: online ? online.version : '–', delta: online ? 'version publiée' : '' },
              { label: 'Dernière version', value: current ? current.version : '–', delta: current ? (VERSION_STATE[current.state] ?? current.state) : '' },
              { label: 'Avis écrits', value: String(notes.length), delta: '' },
              { label: 'À répondre', value: String(waiting), delta: '' },
            ],
          },
    ),
  };
}
