// Marc HQ's hourly round (called by pg_cron through push_tick(), with the hook key). It sends:
// - at 8 a.m. Paris, the day's tasks of each project (late ones included);
// - from 6 p.m. Paris, a reminder of each soirée planned for the next day;
// - a new App Store review as soon as it shows up;
// - once Apple has published the previous day's sales report: the day's downloads, purchases and
//   proceeds of each app, with the month so far (and the closed month on the 1st).
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

async function reviews(keys: PushKeys, auth: string) {
  for (const [project, app] of apps()) {
    const response = await fetch(`${API}/apps/${app}/customerReviews?sort=-createdDate&limit=20&fields[customerReviews]=rating,title,body,reviewerNickname`, { headers: { Authorization: auth } });
    if (!response.ok) continue;
    const list = ((await response.json()).data ?? []) as Review[];
    // The first round only learns the reviews already there: no flood of old ones
    const ready = await seen(`reviews-ready:${app}`);
    for (const review of list) {
      if (!(await firstTime(`review:${review.id}`)) || !ready) continue;
      const { rating, title, body } = review.attributes;
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
    const auth = `Bearer ${await token()}`;
    await run('reviews', () => reviews(keys, auth));
    await run('sales', () => sales(date, keys, auth));
    return json({ ok: true, date, hour, done });
  }),
);
