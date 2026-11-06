// Sends the RNDS prospecting mails Marc validated in Marc HQ (« Mails du jour »), through Resend,
// from a sending address of its own (PROSPECT_FROM, a subdomain of rnds.app, so the app's sign-in
// codes keep their reputation), replies going to contact@rnds.app (PROSPECT_REPLY_TO).
// Only on Marc's tap, signed in: the app sends the exact subject and text he saw, one call per batch.
// Each mail sent moves its card to « Contactés » (or notes the follow-up), so nothing goes twice.
import { cors, json, safe, signedIn, admin } from '../_shared/common.ts';

const MAX_PER_CALL = 25;
const MAX_PER_DAY = 40;
const FOLLOW_UP_DAYS = 4;
/** The legal footer of a commercial mail: who writes, from where. */
const FOOTER = '—\nRNDS · Marc Bouraoui · 143 avenue Thiers, 69006 Lyon, France';

type Item = { id: string; subject: string; text: string };

const paris = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
const plusDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const validEmail = (e: string) => /^[^\s@<>()"]+@[^\s@<>()"]+\.[a-z]{2,}$/i.test(e);

Deno.serve(safe(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST seulement.' }, 405);
  const who = await signedIn(req);
  if ('error' in who) return json({ error: who.error }, 401);

  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('PROSPECT_FROM');
  const replyTo = Deno.env.get('PROSPECT_REPLY_TO') ?? 'contact@rnds.app';
  if (!key || !from) return json({ error: 'L’envoi des mails n’est pas encore réglé (adresse d’envoi ou clé Resend).' }, 503);

  const body = await req.json().catch(() => ({}));
  const mode = body.mode === 'relance' ? 'relance' : 'first';
  const items: Item[] = (Array.isArray(body.items) ? body.items : [])
    .filter((i: Item) => i && typeof i.id === 'string' && typeof i.subject === 'string' && typeof i.text === 'string')
    .map((i: Item) => ({ id: i.id, subject: i.subject.trim().slice(0, 200), text: i.text.trim().slice(0, 5000) }))
    .filter((i: Item) => i.subject && i.text);
  if (!items.length) return json({ error: 'Aucun mail à envoyer.' }, 400);
  if (items.length > MAX_PER_CALL) return json({ error: `${MAX_PER_CALL} mails au plus d’un coup.` }, 400);

  const today = paris();
  // A daily ceiling, whatever the app asks: a new sending address must warm up slowly
  const { count } = await admin
    .from('records')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', who.user.id)
    .eq('kind', 'prospect')
    .eq('data->>channel', 'mail')
    .or(`data->>contacted_at.eq.${today},data->>relanced_at.eq.${today}`);
  const room = Math.max(0, MAX_PER_DAY - (count ?? 0));
  if (!room) return json({ error: `Déjà ${MAX_PER_DAY} mails aujourd’hui : la suite demain.` }, 429);

  const { data: rows } = await admin
    .from('records')
    .select('id, data')
    .eq('user_id', who.user.id)
    .eq('project_id', 'rnds')
    .eq('kind', 'prospect')
    .in('id', items.map((i) => i.id));
  const byId = new Map((rows ?? []).map((r) => [r.id as string, r.data as Record<string, string>]));

  const sent: string[] = [];
  const failed: { id: string; why: string }[] = [];
  for (const item of items.slice(0, room)) {
    const data = byId.get(item.id);
    const email = (data?.email ?? '').trim();
    if (!data || !validEmail(email)) {
      failed.push({ id: item.id, why: 'adresse absente ou invalide' });
      continue;
    }
    const stage = data.stage || 'À contacter';
    if (mode === 'first' && stage !== 'À contacter') {
      failed.push({ id: item.id, why: 'déjà contacté' });
      continue;
    }
    if (mode === 'relance' && (!data.relance || data.relance > today || data.relanced_at)) {
      failed.push({ id: item.id, why: 'pas de relance prévue aujourd’hui' });
      continue;
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        reply_to: replyTo,
        subject: item.subject,
        text: `${item.text}\n\n${FOOTER}`,
        headers: { 'List-Unsubscribe': `<mailto:${replyTo}?subject=${encodeURIComponent('Ne plus recevoir de mails de RNDS')}>` },
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.id) {
      console.error('resend', res.status, out);
      failed.push({ id: item.id, why: res.status === 429 ? 'trop vite, réessaie dans une minute' : 'refusé par le service d’envoi' });
      if (res.status === 401 || res.status === 403) break;
      continue;
    }
    const next =
      mode === 'relance'
        ? { ...data, relance: '', relanced_at: today, last_mail_id: out.id }
        : {
            ...data,
            stage: 'Contactés',
            channel: 'mail',
            contacted_at: today,
            relance: data.relanced_at ? '' : plusDays(today, FOLLOW_UP_DAYS),
            msg_objet: item.subject,
            msg_mail: item.text,
            last_mail_id: out.id,
          };
    await admin.from('records').update({ data: next, updated_at: new Date().toISOString() }).eq('id', item.id).eq('user_id', who.user.id);
    sent.push(item.id);
    // Resend takes two requests a second on its free plan
    await new Promise((r) => setTimeout(r, 600));
  }
  const left = items.length - sent.length - failed.length;
  return json({ sent: sent.length, failed, left: left > 0 ? left : 0 });
}));
