// Sends Marc HQ notifications to Marc's computer and phone (Web Push). Two callers:
// - the database (push_notify trigger), with the hook key, when an agent waits for him, finishes,
//   or completes a request he handed out;
// - the app, signed in, to send a test to the person's own devices ({ test: true }).
// The keys come from Vault through push_keys(); a device that is gone is forgotten.
import webpush from 'npm:web-push@3.6.7';
import { admin, cors, json, signedIn } from '../_shared/common.ts';

const NAMES: Record<string, string> = { rnds: 'RNDS', club421: 'Club 421' };

type Message = { title: string; body: string; url: string; tag: string };

/** What to say for a row the trigger sent, or null when there is nothing to tell. */
function messageFor(table: string, row: Record<string, string>): Message | null {
  const project = NAMES[row.project_id] ?? row.project_id;
  if (table === 'agents' && row.status === 'wait') {
    return { title: `${project} · ${row.name} attend ta réponse`, body: row.task || 'Ouvre Marc HQ pour répondre.', url: `/${row.project_id}/vue-d-ensemble`, tag: `agent-${row.project_id}-${row.name}` };
  }
  if (table === 'agents' && row.status === 'done') {
    return { title: `${project} · ${row.name} a terminé`, body: row.task || 'Le travail est fini.', url: `/${row.project_id}/vue-d-ensemble`, tag: `agent-${row.project_id}-${row.name}` };
  }
  if (table === 'agent_requests' && row.status === 'faite') {
    return { title: `${project} · demande faite`, body: row.answer || row.text, url: `/${row.project_id}/vue-d-ensemble`, tag: `request-${row.id}` };
  }
  return null;
}

/** Same length, same time: the hook key check gives nothing away. */
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function send(userId: string, message: Message, keys: { public: string; private: string }) {
  webpush.setVapidDetails('mailto:contact@rnds.app', keys.public, keys.private);
  const { data } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId);
  let sent = 0;
  for (const device of data ?? []) {
    try {
      await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify(message), { TTL: 3600 });
      sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('endpoint', device.endpoint);
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST seulement.' }, 405);
  try {
    const { data: keys } = await admin.rpc('push_keys');
    if (!keys?.public || !keys?.private || !keys?.hook) return json({ error: 'Les notifications ne sont pas encore prêtes.' }, 503);
    const body = await req.json().catch(() => ({}));

    // From the database trigger
    const hook = req.headers.get('x-push-key');
    if (hook !== null) {
      if (!same(hook, keys.hook)) return json({ error: 'Clé refusée.' }, 401);
      const row = body.record as Record<string, string> | undefined;
      const message = row && typeof body.table === 'string' ? messageFor(body.table, row) : null;
      if (!row?.user_id || !message) return json({ sent: 0 });
      return json({ sent: await send(row.user_id, message, keys) });
    }

    // From the app: a test on the person's own devices
    const who = await signedIn(req);
    if ('error' in who) return json({ error: who.error }, 401);
    if (body.test !== true) return json({ error: 'Rien à envoyer.' }, 400);
    const sent = await send(who.user.id, { title: 'Marc HQ', body: 'Les notifications marchent sur cet appareil.', url: '/', tag: 'test' }, keys);
    return json({ sent });
  } catch {
    return json({ error: 'Envoi impossible pour le moment.' }, 500);
  }
});
