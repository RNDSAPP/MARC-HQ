import { useEffect, useState } from 'react';
import type { Module, PipelineCard, Project } from '../data/types';
import { useSession } from './session';
import { supabase } from './supabase';
import { isoDate } from './dates';

/** What Marc adds in Marc HQ, one kind per module. */
export type RecordKind = 'club' | 'ambassadeur' | 'bde' | 'soiree' | 'post' | 'veille';
export type RecordRow = { id: string; project_id: string; kind: RecordKind; data: Record<string, string>; created_at: string; updated_at?: string };

/** A field of the add / edit sheet. */
export type Field = { key: string; label: string; type: 'text' | 'number' | 'date' | 'select'; options?: string[]; required?: boolean; placeholder?: string };

const RNDS_STAGES = ['À contacter', 'En discussion', 'Contrat à signer', 'Affiliés'];
const BDE_STAGES = ['À contacter', 'Contactés', 'En discussion', 'Partenaires'];

/** Each kind: its name, the module it belongs to, the button that adds it, and its fields. */
export const KINDS: Record<RecordKind, { one: string; module: string; title: string; fields: Field[] }> = {
  club: {
    one: 'club',
    module: 'clubs',
    title: 'Club',
    fields: [
      { key: 'name', label: 'Nom du club', type: 'text', required: true, placeholder: 'Boxe Club Lyon 7' },
      { key: 'city', label: 'Ville', type: 'text', placeholder: 'Lyon 7e' },
      { key: 'members', label: 'Membres', type: 'number', placeholder: '80' },
      { key: 'stage', label: 'Étape', type: 'select', options: RNDS_STAGES },
      { key: 'contact', label: 'Contact', type: 'text', placeholder: 'Nom, téléphone ou mail' },
    ],
  },
  ambassadeur: {
    one: 'ambassadeur',
    module: 'ambassadeurs',
    title: 'Ambassadeur',
    fields: [
      { key: 'name', label: 'Nom', type: 'text', required: true, placeholder: 'Karim B.' },
      { key: 'club', label: 'Club', type: 'text', placeholder: 'Boxe Club Lyon 7' },
      { key: 'code', label: 'Code promo', type: 'text', placeholder: 'LYON10' },
      { key: 'signups', label: 'Inscriptions générées', type: 'number', placeholder: '0' },
      { key: 'status', label: 'Statut', type: 'select', options: ['Actif', 'À relancer', 'En discussion'] },
    ],
  },
  bde: {
    one: 'BDE',
    module: 'bde',
    title: 'BDE',
    fields: [
      { key: 'name', label: 'Nom du BDE', type: 'text', required: true, placeholder: 'BDE Commerce Lyon' },
      { key: 'school', label: 'École', type: 'text', placeholder: 'École de commerce' },
      { key: 'students', label: 'Étudiants', type: 'number', placeholder: '1 200' },
      { key: 'stage', label: 'Étape', type: 'select', options: BDE_STAGES },
      { key: 'contact', label: 'Contact', type: 'text', placeholder: 'Prénom, rôle, téléphone' },
    ],
  },
  soiree: {
    one: 'soirée',
    module: 'soirees',
    title: 'Soirée',
    fields: [
      { key: 'name', label: 'Nom de la soirée', type: 'text', required: true, placeholder: 'Tournoi 421' },
      { key: 'bde', label: 'BDE', type: 'text', placeholder: 'BDE Commerce Lyon' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Statut', type: 'select', options: ['Idée', 'À confirmer', 'Confirmé', 'Faite'] },
    ],
  },
  veille: {
    one: 'compte',
    module: 'veille',
    title: 'Compte',
    fields: [
      { key: 'name', label: 'Compte', type: 'text', required: true, placeholder: '@compte ou lien TikTok / Instagram' },
      { key: 'note', label: 'Pourquoi tu le suis', type: 'text', placeholder: 'Idées de reels, concurrent…' },
    ],
  },
  post: {
    one: 'publication',
    module: 'publications',
    title: 'Publication',
    fields: [
      { key: 'title', label: 'Titre', type: 'text', required: true, placeholder: 'Défi 100 coups' },
      { key: 'format', label: 'Format', type: 'select', options: ['Reel', 'Carrousel', 'TikTok', 'Story'] },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'status', label: 'Statut', type: 'select', options: ['Idée', 'À valider', 'Prêt', 'Publié'] },
    ],
  },
};

/** The kind a module adds ("clubs" → club…), the overview adding the project's main kind. */
export function kindOf(project: Project, moduleSlug: string): RecordKind | null {
  if (moduleSlug === 'vue-d-ensemble') return project.id === 'rnds' ? 'club' : project.id === 'club421' ? 'bde' : null;
  const found = (Object.keys(KINDS) as RecordKind[]).find((kind) => KINDS[kind].module === moduleSlug);
  if (found === 'veille') return found;
  return found && (found === 'bde' || found === 'soiree' ? project.id === 'club421' : project.id === 'rnds') ? found : null;
}

/** The record's name, whatever its kind ("name" or "title"). */
export const nameOf = (record: RecordRow) => record.data.name ?? record.data.title ?? '';

// One shared copy for the whole app, kept live by Supabase Realtime
let rows: RecordRow[] = [];
let ready = false;
/** Whether the records were loaded from Supabase at least once (the calendar waits for it). */
export const recordsReady = () => ready || !supabase;
const listeners = new Set<() => void>();
let started: string | null = null;

async function load() {
  if (!supabase) return;
  const { data, error } = await supabase.from('records').select('id, project_id, kind, data, created_at, updated_at').order('created_at');
  // A failed reload (no network) keeps what is on screen instead of emptying everything
  if (error || !data) return;
  rows = data as RecordRow[];
  ready = true;
  listeners.forEach((listener) => listener());
}

/** Everything Marc added, once signed in. */
export function useRecords() {
  const session = useSession();
  const [, refresh] = useState(0);
  useEffect(() => {
    const listener = () => refresh((n) => n + 1);
    listeners.add(listener);
    if (session && started !== session.user.id && supabase) {
      started = session.user.id;
      load();
      supabase.channel('records-live').on('postgres_changes', { event: '*', schema: 'public', table: 'records' }, load).subscribe();
      // The phone drops the live link in the background: catch up on coming back
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && load());
    }
    return () => {
      listeners.delete(listener);
    };
  }, [session]);
  return rows;
}

/** Add, change or remove a record; '' when it went through, else what went wrong. */
export async function saveRecord(projectId: string, kind: RecordKind, data: Record<string, string>, id?: string) {
  if (!supabase) return 'Supabase n’est pas réglé.';
  const { error } = id
    ? await supabase.from('records').update({ data, updated_at: new Date().toISOString() }).eq('id', id)
    : await supabase.from('records').insert({ project_id: projectId, kind, data });
  if (error) return 'L’enregistrement n’a pas marché. Réessaie.';
  await load();
  return '';
}

/** Remove a record; '' when it went through, else what went wrong. */
export async function removeRecord(id: string) {
  if (!supabase) return 'Supabase n’est pas réglé.';
  const { error } = await supabase.from('records').delete().eq('id', id);
  if (error) return 'La suppression n’a pas marché. Réessaie.';
  await load();
  return '';
}

// ---------------------------------------------------------------------------------------------
// The project in real figures, from what Marc added

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/** "2026-11-14" → "14 nov." (the form the calendar reads), '' when no date. */
const dayMonth = (iso?: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '';
  return y === new Date().getFullYear() ? `${d} ${MONTHS[m - 1]}` : `${d} ${MONTHS[m - 1]} ${y}`;
};
const num = (value?: string) => Number(String(value ?? '').replace(/\s/g, '').replace(',', '.')) || 0;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
const spaced = (n: number) => n.toLocaleString('fr-FR');
const since = (iso: string) => `Depuis ${MONTHS[new Date(iso).getMonth()]}`;
const isToday = (iso?: string) => !!iso && iso >= isoDate();

function patch(project: Project, slug: string, change: (module: Module) => Partial<Module>): Project {
  return { ...project, modules: project.modules.map((module) => (module.slug === slug ? { ...module, ...change(module) } : module)) };
}

/** Cards of a pipeline from the records of one kind, in their stage. */
function pipelineFrom(project: Project, list: RecordRow[], meta: (r: RecordRow) => string, done: string) {
  return {
    ...project.pipeline,
    columns: project.pipeline.columns.map((column) => ({
      ...column,
      cards: list
        .filter((r) => (r.data.stage || project.pipeline.columns[0].name) === column.name)
        .map((r): PipelineCard => ({ name: nameOf(r), meta: meta(r), when: column.name === done ? since(r.created_at) : 'Nouveau' })),
    })),
  };
}

/**
 * RNDS and Club 421 with what Marc added: the pipelines, tables, figures, headlines and the home
 * summary all follow. Nothing added yet: the project stays at 0.
 */
export function withRecords(project: Project, all: RecordRow[]): Project {
  const mine = all.filter((r) => r.project_id === project.id);
  const of = (kind: RecordKind) => mine.filter((r) => r.kind === kind);

  if (project.id === 'rnds') {
    const clubs = of('club');
    const ambassadors = of('ambassadeur');
    const posts = of('post');
    const stage = (name: string) => clubs.filter((c) => (c.data.stage || 'À contacter') === name);
    const affiliated = stage('Affiliés');
    const toSign = stage('Contrat à signer');
    const talking = stage('En discussion');
    const members = affiliated.reduce((sum, c) => sum + num(c.data.members), 0);
    const signups = ambassadors.reduce((sum, a) => sum + num(a.data.signups), 0);
    const ranked = [...ambassadors].sort((a, b) => num(b.data.signups) - num(a.data.signups));
    const planned = posts.filter((p) => p.data.status !== 'Publié' && (isToday(p.data.date) || !p.data.date));
    const toValidate = posts.find((p) => p.data.status === 'À valider');
    const formats = posts.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.data.format || 'Reel']: (acc[p.data.format || 'Reel'] ?? 0) + 1 }), {});
    const topFormat = Object.entries(formats).sort((a, b) => b[1] - a[1])[0];

    let next: Project = { ...project, pipeline: pipelineFrom(project, clubs, (c) => [c.data.city, c.data.members && `${c.data.members} membres`].filter(Boolean).join(' · '), 'Affiliés') };
    next = patch(next, 'vue-d-ensemble', (m) =>
      clubs.length
        ? {
            headline: toSign.length ? `${plural(toSign.length, 'club attend', 'clubs attendent')} ta signature` : `${plural(affiliated.length, 'club affilié', 'clubs affiliés')}`,
            sub: `${plural(clubs.length, 'club')} dans le pipeline, ${plural(ambassadors.length, 'ambassadeur')}.`,
            heroNum: String(affiliated.length),
            heroDelta: '',
            kpis: m.kpis.map((k) =>
              k.label === 'Clubs affiliés' ? { ...k, value: String(affiliated.length) } : k.label === 'Ambassadeurs' ? { ...k, value: String(ambassadors.length) } : k.label === 'Inscriptions générées' ? { ...k, value: spaced(signups) } : k,
            ),
          }
        : { kpis: m.kpis.map((k) => (k.label === 'Ambassadeurs' ? { ...k, value: String(ambassadors.length) } : k.label === 'Inscriptions générées' ? { ...k, value: spaced(signups) } : k)) },
    );
    if (clubs.length) {
      next = patch(next, 'clubs', () => ({
        count: String(clubs.length),
        headline: toSign.length || talking.length ? `${plural(talking.length, 'club')} en discussion, ${toSign.length} à signer` : `${plural(clubs.length, 'club')} dans le pipeline`,
        sub: 'Chaque club est dans son étape : glisse-le d’une étape à l’autre en le modifiant.',
        heroNum: spaced(members),
        heroDelta: '',
        kpis: [
          { label: 'Affiliés', value: String(affiliated.length), delta: '' },
          { label: 'À signer', value: String(toSign.length), delta: '' },
          { label: 'En discussion', value: String(talking.length), delta: '' },
          { label: 'À contacter', value: String(stage('À contacter').length), delta: '' },
        ],
      }));
    }
    if (ambassadors.length) {
      next = patch(next, 'ambassadeurs', (m) => ({
        count: String(ambassadors.length),
        headline: ranked[0] && num(ranked[0].data.signups) > 0 ? `${ranked[0].data.name} a ramené ${plural(num(ranked[0].data.signups), 'inscription')}` : plural(ambassadors.length, 'ambassadeur'),
        sub: `${plural(ambassadors.filter((a) => a.data.status === 'Actif').length, 'actif')}, ${ambassadors.filter((a) => a.data.status === 'À relancer').length} à relancer.`,
        heroNum: spaced(signups),
        heroDelta: '',
        kpis: [
          { label: 'Ambassadeurs', value: String(ambassadors.length), delta: '' },
          { label: 'Actifs', value: String(ambassadors.filter((a) => a.data.status === 'Actif').length), delta: '' },
          { label: 'Meilleur code', value: ranked[0]?.data.code || '–', delta: ranked[0] ? String(num(ranked[0].data.signups)) : '' },
          { label: 'Conversion', value: '–', delta: '' },
        ],
        view: m.view.kind === 'table' ? { ...m.view, rows: ranked.map((a) => [a.data.name, a.data.club || '–', String(num(a.data.signups)), a.data.status || 'Actif']) } : m.view,
      }));
    }
    if (posts.length) {
      next = patch(next, 'publications', (m) => ({
        count: String(planned.length),
        headline: toValidate ? `« ${toValidate.data.title} » attend ton feu vert` : `${plural(planned.length, 'contenu prévu', 'contenus prévus')}`,
        sub: `${plural(posts.filter((p) => p.data.status === 'Publié').length, 'publié')}, ${plural(posts.filter((p) => p.data.status === 'Prêt').length, 'prêt')}.`,
        kpis: [
          { label: 'Prévues', value: String(planned.length), delta: '' },
          { label: 'Publiées', value: String(posts.filter((p) => p.data.status === 'Publié').length), delta: '' },
          { label: 'Engagement', value: '–', delta: '' },
          { label: 'Meilleur format', value: topFormat?.[0] ?? '–', delta: '' },
        ],
        view: m.view.kind === 'table' ? { ...m.view, rows: [...posts].sort((a, b) => (a.data.date ?? '').localeCompare(b.data.date ?? '')).map((p) => [p.data.title, p.data.format || 'Reel', dayMonth(p.data.date) || 'Sans date', p.data.status || 'Idée']) } : m.view,
      }));
    }
    return {
      ...next,
      home: {
        ...next.home,
        summary: `${plural(affiliated.length, 'club')} · ${plural(ambassadors.length, 'ambassadeur')}`,
        mini: [
          { label: 'Clubs affiliés', value: String(affiliated.length) },
          { label: 'Ambassadeurs', value: String(ambassadors.length) },
        ],
      },
    };
  }

  if (project.id === 'club421') {
    const bdes = of('bde');
    const soirees = of('soiree');
    const stage = (name: string) => bdes.filter((b) => (b.data.stage || 'À contacter') === name);
    const partners = stage('Partenaires');
    const students = partners.reduce((sum, b) => sum + num(b.data.students), 0);
    const upcoming = soirees.filter((s) => s.data.status !== 'Faite' && isToday(s.data.date)).sort((a, b) => (a.data.date ?? '').localeCompare(b.data.date ?? ''));
    const done = soirees.filter((s) => s.data.status === 'Faite');

    let next: Project = { ...project, pipeline: pipelineFrom(project, bdes, (b) => [b.data.school, b.data.students && `${b.data.students} étudiants`].filter(Boolean).join(' · '), 'Partenaires') };
    if (bdes.length) {
      next = patch(next, 'vue-d-ensemble', (m) => ({
        headline: upcoming[0] ? `Prochaine soirée : ${upcoming[0].data.name}, le ${dayMonth(upcoming[0].data.date)}` : `${plural(partners.length, 'BDE partenaire', 'BDE partenaires')}`,
        sub: `${plural(bdes.length, 'BDE')} dans le pipeline, ${plural(upcoming.length, 'soirée prévue', 'soirées prévues')}.`,
        heroNum: String(partners.length),
        heroDelta: '',
        kpis: m.kpis.map((k) => (k.label === 'BDE partenaires' ? { ...k, value: String(partners.length) } : k)),
      }));
      next = patch(next, 'bde', () => ({
        count: String(bdes.length),
        headline: stage('En discussion').length ? `${plural(stage('En discussion').length, 'BDE')} en discussion` : `${plural(bdes.length, 'BDE')} dans le pipeline`,
        sub: 'Chaque BDE est dans son étape : fais-le avancer en le modifiant.',
        heroNum: spaced(students),
        heroDelta: '',
        kpis: [
          { label: 'Partenaires', value: String(partners.length), delta: '' },
          { label: 'En discussion', value: String(stage('En discussion').length), delta: '' },
          { label: 'Contactés', value: String(stage('Contactés').length), delta: '' },
          { label: 'À contacter', value: String(stage('À contacter').length), delta: '' },
        ],
      }));
    }
    if (soirees.length) {
      next = patch(next, 'soirees', (m) => ({
        count: String(upcoming.length),
        headline: upcoming[0] ? `Prochaine : ${upcoming[0].data.name}, le ${dayMonth(upcoming[0].data.date)}` : `${plural(done.length, 'soirée faite', 'soirées faites')}`,
        sub: `${plural(upcoming.length, 'soirée prévue', 'soirées prévues')}, ${plural(done.length, 'faite')}. Chaque soirée datée arrive dans ton Google Agenda.`,
        kpis: [
          { label: 'Prévues', value: String(upcoming.length), delta: '' },
          { label: 'Réalisées', value: String(done.length), delta: '' },
          { label: 'Joueurs', value: '–', delta: '' },
          { label: 'Téléchargements le soir', value: '–', delta: '' },
        ],
        view: m.view.kind === 'table' ? { ...m.view, rows: [...soirees].sort((a, b) => (a.data.date ?? '').localeCompare(b.data.date ?? '')).map((s) => [s.data.name, s.data.bde || '–', dayMonth(s.data.date) || 'Sans date', s.data.status || 'Idée']) } : m.view,
      }));
    }
    const money = next.home.summary.split(' · ').pop();
    return {
      ...next,
      home: {
        ...next.home,
        summary: `${plural(partners.length, 'BDE')} · ${money}`,
        mini: next.home.mini.map((item) => (item.label === 'BDE partenaires' ? { ...item, value: String(partners.length) } : item)),
      },
    };
  }

  return project;
}
