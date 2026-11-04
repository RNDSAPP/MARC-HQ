// Sends Marc HQ notifications to Marc's computer and phone (Web Push). Two callers:
// - the database (push_notify trigger), with the hook key, when an agent waits for him, finishes,
//   or completes a request he handed out;
// - the app, signed in, to send a test to the person's own devices ({ test: true }).
// The keys come from Vault through push_keys(); a device that is gone is forgotten.
import { cors, json, safe, signedIn } from '../_shared/common.ts';
import { PROJECT_NAMES, pushKeys, sameKey, sendPush } from '../_shared/push.ts';
import type { Message } from '../_shared/push.ts';

/** What to say for a row the trigger sent, or null when there is nothing to tell. */
function messageFor(table: string, row: Record<string, string>): Message | null {
  const project = PROJECT_NAMES[row.project_id] ?? row.project_id;
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

Deno.serve(safe(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST seulement.' }, 405);
  const keys = await pushKeys();
  if (!keys) return json({ error: 'Les notifications ne sont pas encore prêtes.' }, 503);
  const body = await req.json().catch(() => ({}));

  // From the database trigger
  const hook = req.headers.get('x-push-key');
  if (hook !== null) {
    if (!sameKey(hook, keys.hook)) return json({ error: 'Clé refusée.' }, 401);
    const row = body.record as Record<string, string> | undefined;
    const message = row && typeof body.table === 'string' ? messageFor(body.table, row) : null;
    if (!row?.user_id || !message) return json({ sent: 0 });
    return json({ sent: await sendPush(row.user_id, message, keys) });
  }

  // From the app: a test on the person's own devices
  const who = await signedIn(req);
  if ('error' in who) return json({ error: who.error }, 401);
  if (body.test !== true) return json({ error: 'Rien à envoyer.' }, 400);
  const sent = await sendPush(who.user.id, { title: 'Marc HQ', body: 'Les notifications marchent sur cet appareil.', url: '/', tag: 'test' }, keys);
  return json({ sent });
}));
