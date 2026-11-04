// Marc HQ's hourly round (called by pg_cron through push_tick(), with the hook key). It sends:
// - at 8 a.m. Paris, the day's tasks of each project (late ones included);
// - from 6 p.m. Paris, a reminder of each soirée planned for the next day;
// - a new App Store review as soon as it shows up;
// - once Apple has published the previous day's sales report: the day's downloads, purchases and
//   proceeds of each app, with the month so far (and the closed month on the 1st);
// - when Apple changes a version's state (sent for review, in review, accepted, rejected, live);
// - at 10 a.m., the clubs and BDE "in discussion" with no news for 7 days (tapping adds the
//   "Relancer" tasks);
// - on Monday at 8 a.m., the summary of the past week.
// A new review also becomes a request to the agents: they draft the reply, Marc sends it in a tap.
// Every notification is logged in push_log, so nothing is ever sent twice.
import { API, apps, token } from '../_shared/asc.ts';
import { admin, json, safe } from '../_shared/common.ts';
import { PROJECT_NAMES, firstTime, pushKeys, sameKey, seen, sendPush, subscribers } from '../_shared/push.ts';
import type { Message, PushKeys } from '../_shared/push.ts';

// App Store Connect › Paiements et rapports financiers: the account's vendor number (not a secret,
// useless without the API key)
const VENDOR = '94946399';

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** Today's date and hour in Paris. */
function paris(now = new Date()) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(now);
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(now));
  return { date, hour };
}

/** "2026-11-04" moved by a number of days. */
function shift(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type Money = Record<string, number>;
/** { EUR: 3.98, USD: 1.2 } → "3,98 € + 1,20 $US" (each currency on its own, euros first). */
const money = (amounts: Money) =>
  Object.entries(amounts)
    .filter(([, value]) => Math.abs(value) >= 0.005)
    .sort(([a], [b]) => (a === 'EUR' ? -1 : b === 'EUR' ? 1 : a.localeCompare(b)))
    .map(([currency, value]) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(value))
    .join(' + ') || '0 €';
const addMoney = (a: Money, b: Money) => {
  const sum = { ...a };
  for (const [currency, value] of Object.entries(b)) sum[currency] = Math.round(((sum[currency] ?? 0) + value) * 100) / 100;
  return sum;
};
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;
const name = (project: string) => PROJECT_NAMES[project] ?? project;

async function toEveryone(message: Message, keys: PushKeys) {
  for (const user of await subscribers()) await sendPush(user, message, keys);
}

// --- 8 a.m.: the day's tasks -------------------------------------------------------------------

async function morning(today: string, keys: PushKeys) {
  for (const user of await subscribers()) {
    if (!(await firstTime(`morning:${user}:${today}`))) continue;
    const { data } = await admin.from('tasks').select('project_id, text, due').eq('user_id', user).eq('done', false).lte('due', today).order('due');
    const byProject = new Map<string, { text: string; due: string }[]>();
    for (const task of data ?? []) byProject.set(task.project_id, [...(byProject.get(task.project_id) ?? []), task]);
    for (const [project, tasks] of byProject) {
      const late = tasks.filter((task) => task.due < today).length;
      const list = tasks.slice(0, 3).map((task) => task.text).join(', ');
      await sendPush(
        user,
        {
          title: `${name(project)} · ${plural(tasks.length, 'tâche')} aujourd’hui${late ? ` (dont ${late} en retard)` : ''}`,
          body: tasks.length > 3 ? `${list} et ${tasks.length - 3} de plus` : list,
          url: `/${project}/todo`,
          tag: `morning-${project}`,
        },
        keys,
      );
    }
  }
}

// --- 6 p.m.: tomorrow's soirées ----------------------------------------------------------------

async function soireesTomorrow(today: string, keys: PushKeys) {
  const tomorrow = shift(today, 1);
  const { data } = await admin.from('records').select('id, user_id, project_id, data').eq('kind', 'soiree').eq('data->>date', tomorrow);
  for (const soiree of data ?? []) {
    if (soiree.data?.status === 'Faite') continue;
    if (!(await firstTime(`soiree:${soiree.id}:${tomorrow}`))) continue;
    const with_ = soiree.data?.bde ? ` avec ${soiree.data.bde}` : '';
    await sendPush(
      soiree.user_id,
      { title: `${name(soiree.project_id)} · soirée demain`, body: `${soiree.data?.name ?? 'Soirée'}${with_}${soiree.data?.status ? ` · ${soiree.data.status}` : ''}`, url: `/${soiree.project_id}/soirees`, tag: `soiree-${soiree.id}` },
      keys,
    );
  }
}

// --- New App Store reviews ---------------------------------------------------------------------

type Review = { id: string; attributes: { rating: number; title?: string; body?: string; reviewerNickname?: string } };

/** Marc's account: the agents' requests are his (the same owner as the marc-hq skill). */
const OWNER_EMAIL = 'marcbouraoui@gmail.com';
let ownerId: string | null = null;
async function owner() {
  if (ownerId) return ownerId;
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  ownerId = data?.users.find((user) => user.email?.toLowerCase() === OWNER_EMAIL)?.id ?? null;
  return ownerId;
}

/** A new review becomes a request to the project's agents: draft the reply (sent by Marc in a tap). */
async function askDraft(project: string, reviewId: string, rating: number, who: string, title: string, body: string) {
  const user = await owner();
  if (!user) return;
  const text = `Brouillon de réponse à un avis App Store ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} de ${who || 'un utilisateur'} : « ${[title, body].filter(Boolean).join(' — ')} ». Réponds dans la langue de l'avis, court et chaleureux, signé de l'équipe ${name(project)}. Mets seulement le texte de la réponse dans « fini » : Marc l'envoie tel quel en un appui.`;
  await admin.from('agent_requests').insert({ user_id: user, project_id: project, text, review_id: reviewId });
}

async function reviews(keys: PushKeys, auth: string) {
  for (const [project, app] of apps()) {
    const response = await fetch(`${API}/apps/${app}/customerReviews?sort=-createdDate&limit=20&fields[customerReviews]=rating,title,body,reviewerNickname`, { headers: { Authorization: auth } });
    if (!response.ok) continue;
    const list = ((await response.json()).data ?? []) as Review[];
    // The first round only learns the reviews already there: no flood of old ones
    const ready = await seen(`reviews-ready:${app}`);
    for (const review of list) {
      if (!(await firstTime(`review:${review.id}`)) || !ready) continue;
      const { rating, title, body, reviewerNickname } = review.attributes;
      await askDraft(project, review.id, rating, reviewerNickname ?? '', title ?? '', body ?? '');
      await toEveryone(
        {
          title: `${name(project)} · nouvel avis ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`,
          body: [title, body].filter(Boolean).join(' — ').slice(0, 160),
          url: `/${project}/app-store`,
          tag: `review-${review.id}`,
        },
        keys,
      );
    }
    if (!ready) await firstTime(`reviews-ready:${app}`);
  }
}

// --- Sales: downloads, purchases, proceeds -----------------------------------------------------

type Day = { downloads: number; purchases: number; proceeds: Money };

/** One app's figures for one day from Apple's daily sales summary; null while not published. */
async function salesOf(vendor: string, date: string, app: string, sku: string, auth: string): Promise<Day | null> {
  const params = new URLSearchParams({
    'filter[frequency]': 'DAILY',
    'filter[reportType]': 'SALES',
    'filter[reportSubType]': 'SUMMARY',
    'filter[vendorNumber]': vendor,
    'filter[reportDate]': date,
    'filter[version]': '1_0',
  });
  const response = await fetch(`${API}/salesReports?${params}`, { headers: { Authorization: auth, Accept: 'application/a-gzip' } });
  if (response.status === 404) {
    const detail = String((await response.json().catch(() => ({}))).errors?.[0]?.detail ?? '');
    // "There were no sales for the date specified": a day at zero; anything else: not out yet
    return /no sales/i.test(detail) ? { downloads: 0, purchases: 0, proceeds: {} } : null;
  }
  if (!response.ok || !response.body) return null;
  const text = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text();
  const [head, ...lines] = text.trim().split('\n');
  const columns = head.split('\t');
  const at = (row: string[], column: string) => row[columns.indexOf(column)] ?? '';
  const day: Day = { downloads: 0, purchases: 0, proceeds: {} };
  for (const line of lines) {
    const row = line.split('\t');
    const type = at(row, 'Product Type Identifier');
    const units = Number(at(row, 'Units')) || 0;
    const ownApp = at(row, 'Apple Identifier') === app;
    const ownPurchase = at(row, 'Parent Identifier') === sku && sku !== '';
    if (!ownApp && !ownPurchase) continue;
    // First downloads (iPhone, iPad, Mac apps); updates and re-downloads are not counted
    if (ownApp && ['1', '1F', '1T', 'F1'].includes(type)) day.downloads += units;
    if (ownPurchase && (type.startsWith('IA') || type === 'FI1')) day.purchases += units;
    const proceeds = Number(at(row, 'Developer Proceeds')) || 0;
    const currency = at(row, 'Currency of Proceeds');
    if (proceeds && currency) day.proceeds = addMoney(day.proceeds, { [currency]: proceeds * units });
  }
  return day;
}

async function sales(today: string, keys: PushKeys, auth: string) {
  const yesterday = shift(today, -1);
  const month = yesterday.slice(0, 7);
  for (const [project, app] of apps()) {
    const info = await fetch(`${API}/apps/${app}?fields[apps]=sku`, { headers: { Authorization: auth } });
    const sku = info.ok ? (((await info.json()).data?.attributes?.sku as string) ?? '') : '';
    const { data: known } = await admin.from('app_sales').select('day').eq('project_id', project).gte('day', `${month}-01`);
    const have = new Set((known ?? []).map((row) => row.day as string));

    // The month so far, quietly (the first round fills it in; then only the new day)
    const missing: string[] = [];
    for (let d = `${month}-01`; d <= yesterday; d = shift(d, 1)) if (!have.has(d)) missing.push(d);
    for (const d of missing.slice(-31)) {
      const day = await salesOf(VENDOR, d, app, sku, auth);
      if (!day) continue;
      await admin.from('app_sales').upsert({ project_id: project, day: d, ...day });
      // Yesterday, as soon as Apple has it: the notification
      const earned = Object.values(day.proceeds).some((value) => value !== 0);
      if (d === yesterday && (day.downloads > 0 || day.purchases > 0 || earned) && (await firstTime(`sales:${project}:${d}`))) {
        const { data: rows } = await admin.from('app_sales').select('downloads, proceeds').eq('project_id', project).gte('day', `${month}-01`).lte('day', yesterday);
        const total = (rows ?? []).reduce((sum, row) => ({ downloads: sum.downloads + row.downloads, proceeds: addMoney(sum.proceeds, row.proceeds as Money) }), { downloads: 0, proceeds: {} as Money });
        const parts = [plural(day.downloads, 'téléchargement'), day.purchases ? plural(day.purchases, 'achat') : '', earned ? money(day.proceeds) : ''].filter(Boolean);
        await toEveryone(
          {
            title: `${name(project)} · hier : ${parts.join(' · ')}`,
            body: `${MONTHS[Number(month.slice(5)) - 1][0].toUpperCase()}${MONTHS[Number(month.slice(5)) - 1].slice(1)} : ${plural(total.downloads, 'téléchargement')} · CA ${money(total.proceeds)}`,
            url: `/${project}/${project === 'club421' ? 'revenus' : 'app-store'}`,
            tag: `sales-${project}`,
          },
          keys,
        );
      }
    }

    // The 1st of the month: last month's total, once
    if (today.endsWith('-01') && !missing.includes(yesterday) && (await firstTime(`month:${project}:${month}`))) {
      const { data: rows } = await admin.from('app_sales').select('downloads, purchases, proceeds').eq('project_id', project).gte('day', `${month}-01`).lte('day', yesterday);
      const total = (rows ?? []).reduce((sum, row) => ({ downloads: sum.downloads + row.downloads, purchases: sum.purchases + row.purchases, proceeds: addMoney(sum.proceeds, row.proceeds as Money) }), { downloads: 0, purchases: 0, proceeds: {} as Money });
      await toEveryone(
        {
          title: `${name(project)} · ${MONTHS[Number(month.slice(5)) - 1]} terminé : CA ${money(total.proceeds)}`,
          body: `${plural(total.downloads, 'téléchargement')} · ${plural(total.purchases, 'achat')}`,
          url: `/${project}/vue-d-ensemble`,
          tag: `month-${project}`,
        },
        keys,
      );
    }
  }
}

// --- Versions: Apple's review, step by step --------------------------------------------------

const VERSION_SAY: Record<string, string> = {
  WAITING_FOR_REVIEW: 'envoyée à Apple',
  IN_REVIEW: 'en cours de vérification chez Apple',
  PENDING_DEVELOPER_RELEASE: 'acceptée, à publier',
  ACCEPTED: 'acceptée par Apple',
  READY_FOR_SALE: 'en ligne sur l’App Store',
  READY_FOR_DISTRIBUTION: 'en ligne sur l’App Store',
  REJECTED: 'refusée par Apple',
  METADATA_REJECTED: 'fiche refusée par Apple',
};

type Version = { id: string; attributes: { versionString: string; appVersionState?: string; appStoreState?: string } };

async function versions(keys: PushKeys, auth: string) {
  for (const [project, app] of apps()) {
    const response = await fetch(`${API}/apps/${app}/appStoreVersions?limit=3&fields[appStoreVersions]=versionString,appVersionState,appStoreState`, { headers: { Authorization: auth } });
    if (!response.ok) continue;
    const ready = await seen(`versions-ready:${app}`);
    for (const version of ((await response.json()).data ?? []) as Version[]) {
      const state = version.attributes.appVersionState ?? version.attributes.appStoreState ?? '';
      // The first round only learns the states already there
      if (!(await firstTime(`version:${version.id}:${state}`)) || !ready || !VERSION_SAY[state]) continue;
      const bad = state.includes('REJECTED');
      await toEveryone(
        {
          title: `${name(project)} ${version.attributes.versionString} : ${VERSION_SAY[state]}`,
          body: bad ? 'Ouvre App Store Connect pour lire le message d’Apple.' : 'Le détail est dans Versions.',
          url: `/${project}/versions`,
          tag: `version-${version.id}`,
        },
        keys,
      );
    }
    if (!ready) await firstTime(`versions-ready:${app}`);
  }
}

// --- 10 a.m.: who to chase -----------------------------------------------------------------------

/** The steps where a club or a BDE is waiting for news from Marc. */
const CHASE: Record<string, string[]> = { club: ['En discussion', 'Contrat à signer'], bde: ['Contactés', 'En discussion'] };

/** "2026-W45": the week of a date, so a contact is chased at most once a week. */
function week(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return `${d.getUTCFullYear()}-W${1 + Math.round(((d.getTime() - first.getTime()) / 86400000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7)}`;
}

async function followUps(today: string, keys: PushKeys) {
  const before = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data } = await admin.from('records').select('id, user_id, project_id, kind, data, updated_at').in('kind', Object.keys(CHASE)).lt('updated_at', before);
  const groups = new Map<string, { user: string; project: string; kind: string; items: { name: string; stage: string; days: number }[] }>();
  for (const record of data ?? []) {
    const stage = String(record.data?.stage ?? '');
    if (!CHASE[record.kind]?.includes(stage)) continue;
    if (!(await firstTime(`relance:${record.id}:${week(today)}`))) continue;
    const key = `${record.user_id}:${record.project_id}`;
    const group = groups.get(key) ?? { user: record.user_id, project: record.project_id, kind: record.kind, items: [] as { name: string; stage: string; days: number }[] };
    group.items.push({ name: String(record.data?.name ?? ''), stage: stage.toLowerCase(), days: Math.floor((Date.now() - new Date(record.updated_at).getTime()) / 86400000) });
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    const what = group.kind === 'club' ? plural(group.items.length, 'club') : plural(group.items.length, 'BDE', 'BDE');
    const names = group.items.map((item) => item.name).filter(Boolean);
    await sendPush(
      group.user,
      {
        title: `${name(group.project)} · ${what} à relancer`,
        body: group.items.map((item) => `${item.name} (${item.stage}, sans nouvelles depuis ${item.days} j)`).join(', ') + '. Touche pour ajouter les tâches « Relancer ».',
        url: `/${group.project}/todo?relancer=${encodeURIComponent(names.join('|'))}`,
        tag: `relance-${group.project}`,
      },
      keys,
    );
  }
}

// --- Monday 8 a.m.: the past week ----------------------------------------------------------------

async function weekly(today: string, keys: PushKeys) {
  const since = shift(today, -7);
  const sinceIso = new Date(`${since}T00:00:00+01:00`).toISOString();
  for (const user of await subscribers()) {
    if (!(await firstTime(`weekly:${user}:${today}`))) continue;
    const lines: string[] = [];
    for (const project of ['rnds', 'club421']) {
      const { data: days } = await admin.from('app_sales').select('downloads, proceeds').eq('project_id', project).gte('day', since).lt('day', today);
      const downloads = (days ?? []).reduce((sum, day) => sum + day.downloads, 0);
      const proceeds = (days ?? []).reduce((sum, day) => addMoney(sum, day.proceeds as Money), {} as Money);
      const { count: tasks } = await admin.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', user).eq('project_id', project).eq('done', true).gte('done_at', sinceIso);
      const won = project === 'rnds' ? ['club', 'Affiliés'] : ['bde', 'Partenaires'];
      const { count: signed } = await admin.from('records').select('id', { count: 'exact', head: true }).eq('user_id', user).eq('project_id', project).eq('kind', won[0]).eq('data->>stage', won[1]).gte('updated_at', sinceIso);
      const { count: soirees } = await admin.from('records').select('id', { count: 'exact', head: true }).eq('user_id', user).eq('project_id', project).eq('kind', 'soiree').gte('data->>date', today).lte('data->>date', shift(today, 7));
      const parts = [
        plural(downloads, 'téléchargement'),
        Object.values(proceeds).some((value) => value) ? money(proceeds) : '',
        plural(tasks ?? 0, 'tâche faite', 'tâches faites'),
        signed ? `${signed} ${project === 'rnds' ? (signed > 1 ? 'clubs signés' : 'club signé') : signed > 1 ? 'BDE partenaires' : 'BDE partenaire'}` : '',
        soirees ? plural(soirees, 'soirée à venir', 'soirées à venir') : '',
      ].filter(Boolean);
      lines.push(`${name(project)} : ${parts.join(' · ')}`);
    }
    await sendPush(user, { title: 'Ta semaine · RNDS et Club 421', body: lines.join('\n'), url: '/', tag: 'weekly' }, keys);
  }
}

Deno.serve(
  safe(async (req) => {
    const keys = await pushKeys();
    if (!keys) return json({ error: 'Les notifications ne sont pas encore prêtes.' }, 503);
    if (!sameKey(req.headers.get('x-push-key') ?? '', keys.hook)) return json({ error: 'Clé refusée.' }, 401);
    const { date, hour } = paris();
    const done: string[] = [];
    // Each part on its own: one failing (Apple down) does not stop the others
    const run = async (label: string, part: () => Promise<void>) => {
      try {
        await part();
        done.push(label);
      } catch (error) {
        console.error(label, error);
      }
    };
    if (hour >= 8 && hour < 12) await run('morning', () => morning(date, keys));
    if (hour >= 18) await run('soirees', () => soireesTomorrow(date, keys));
    if (hour >= 10 && hour < 13) await run('follow-ups', () => followUps(date, keys));
    const monday = new Date(`${date}T12:00:00Z`).getUTCDay() === 1;
    if (monday && hour >= 8 && hour < 12) await run('weekly', () => weekly(date, keys));
    const auth = `Bearer ${await token()}`;
    await run('versions', () => versions(keys, auth));
    await run('reviews', () => reviews(keys, auth));
    await run('sales', () => sales(date, keys, auth));
    return json({ ok: true, date, hour, done });
  }),
);
