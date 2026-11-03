// Brings a project's Google calendar in line with Marc HQ: the app sends the full list of what
// should be there (dated tasks, soirées, meetings); events are created, changed or removed so
// the calendar matches. Each event carries its Marc HQ key, so nothing else is ever touched.
import { admin, cors, googleAccess, json, signedIn } from '../_shared/common.ts';

type Wanted = { key: string; title: string; date: string; description: string };
type GoogleEvent = { id: string; summary?: string; description?: string; start?: { date?: string }; extendedProperties?: { private?: Record<string, string> } };

const CALENDAR = 'https://www.googleapis.com/calendar/v3';
const nextDay = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const who = await signedIn(req);
  if ('error' in who) return json({ error: who.error }, 401);
  const { project_id: project, project_name: name, events } = (await req.json()) as { project_id: string; project_name: string; events: Wanted[] };
  if (!project || !Array.isArray(events)) return json({ error: 'Demande incomplète.' }, 400);

  const { data: saved } = await admin.from('calendar_tokens').select('refresh_token').eq('user_id', who.user.id).maybeSingle();
  if (!saved) return json({ error: 'Google Agenda n’est pas connecté.', reconnect: true }, 404);
  const access = await googleAccess(saved.refresh_token);
  if (!access) return json({ error: 'Google demande de reconnecter l’agenda.', reconnect: true }, 401);
  const headers = { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' };

  // The project's own calendar, created the first time (or again if it was deleted in Google)
  const { data: known } = await admin.from('calendar_projects').select('calendar_id').eq('user_id', who.user.id).eq('project_id', project).maybeSingle();
  let calendarId = known?.calendar_id as string | undefined;
  if (calendarId && (await fetch(`${CALENDAR}/calendars/${encodeURIComponent(calendarId)}`, { headers })).status !== 200) calendarId = undefined;
  if (!calendarId) {
    const created = await fetch(`${CALENDAR}/calendars`, { method: 'POST', headers, body: JSON.stringify({ summary: name, description: `Créé par Marc HQ pour ${name}`, timeZone: 'Europe/Paris' }) });
    if (!created.ok) return json({ error: 'Google n’a pas pu créer l’agenda.' }, 502);
    calendarId = (await created.json()).id as string;
    await admin.from('calendar_projects').upsert({ user_id: who.user.id, project_id: project, calendar_id: calendarId });
  }
  const base = `${CALENDAR}/calendars/${encodeURIComponent(calendarId)}/events`;

  // What Marc HQ already put there
  const listed = await (await fetch(`${base}?privateExtendedProperty=${encodeURIComponent('marchq=1')}&maxResults=2500&showDeleted=false`, { headers })).json();
  const existing = new Map<string, GoogleEvent>();
  for (const event of (listed.items ?? []) as GoogleEvent[]) {
    const key = event.extendedProperties?.private?.key;
    if (key) existing.set(key, event);
  }

  let created = 0;
  let changed = 0;
  let removed = 0;
  for (const want of events) {
    const body = {
      summary: want.title,
      description: want.description,
      start: { date: want.date },
      end: { date: nextDay(want.date) },
      extendedProperties: { private: { marchq: '1', key: want.key } },
      transparency: 'transparent',
    };
    const have = existing.get(want.key);
    existing.delete(want.key);
    if (!have) {
      if ((await fetch(base, { method: 'POST', headers, body: JSON.stringify(body) })).ok) created++;
    } else if (have.summary !== want.title || have.description !== want.description || have.start?.date !== want.date) {
      if ((await fetch(`${base}/${have.id}`, { method: 'PATCH', headers, body: JSON.stringify(body) })).ok) changed++;
    }
  }
  // Whatever is no longer in Marc HQ (task done or removed, soirée gone)
  for (const stale of existing.values()) {
    if ((await fetch(`${base}/${stale.id}`, { method: 'DELETE', headers })).ok) removed++;
  }
  return json({ created, changed, removed, total: events.length });
});
