// A narrow door into Marc HQ for the RNDS agent that runs on the iMac (driven from Telegram).
// It holds no Supabase account token: it checks its own key (AGENT_RNDS_KEY) and can only touch
// the RNDS part of Marc HQ — the agent's status, Marc's requests, the RNDS tasks, the RNDS cards
// (clubs, ambassadors, prospects) and the RNDS sales. Nothing else (no Club 421, mail, calendar,
// or the RNDS app's own database). Revoke it by changing or deleting AGENT_RNDS_KEY.
import { admin, json, safe } from '../_shared/common.ts';

const PROJECT = 'rnds';
const OWNER = Deno.env.get('AGENT_RNDS_OWNER') ?? '';
const KEY = Deno.env.get('AGENT_RNDS_KEY') ?? '';
const STATES: Record<string, string> = { travail: 'work', attente: 'wait', fini: 'done' };
/** Cards the agent may read; it may write the first three (the templates stay Marc's). */
const READ_KINDS = ['club', 'ambassadeur', 'prospect', 'modele'];
const WRITE_KINDS = ['club', 'ambassadeur', 'prospect'];

/** Same length and same bytes, compared without an early exit. */
function sameKey(given: string) {
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(KEY);
  if (!KEY || KEY.length < 32 || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

const text = (value: unknown, max = 2000) => String(value ?? '').trim().slice(0, max);
const fail = (message: string, status = 400) => json({ error: message }, status);

/** Throws the database error so `safe` answers a clear message instead of a silent half-write. */
function check<T>(result: { data: T; error: unknown }) {
  if (result.error) throw result.error;
  return result.data;
}

Deno.serve(safe(async (req) => {
  if (req.method !== 'POST') return fail('POST seulement.', 405);
  if (!OWNER) return fail('Porte non configurée.', 503);
  if (!sameKey(req.headers.get('x-agent-key') ?? '')) return fail('Clé refusée.', 401);

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const now = new Date().toISOString();

  switch (body.action) {
    case 'etat': {
      const state = STATES[text(body.etat)];
      const name = text(body.agent, 60);
      if (!state || !name) return fail('etat : agent et etat (travail, attente, fini) attendus.');
      check(await admin.from('agents').upsert({
        user_id: OWNER, project_id: PROJECT, name, status: state,
        task: text(body.texte, 300), action: text(body.bouton, 30) || (state === 'wait' ? 'Répondre' : 'Voir'), updated_at: now,
      }, { onConflict: 'user_id,project_id,name' }));
      return json({ ok: true });
    }
    case 'demandes': {
      const rows = check(await admin.from('agent_requests').select('id, status, agent, text, created_at')
        .eq('user_id', OWNER).eq('project_id', PROJECT).neq('status', 'faite').order('created_at'));
      return json({ demandes: rows });
    }
    case 'prendre':
    case 'fini': {
      const id = text(body.id, 64);
      if (!id) return fail('id attendu.');
      const change = body.action === 'prendre'
        ? { status: 'prise', agent: text(body.agent, 60), updated_at: now }
        : { status: 'faite', answer: text(body.reponse, 4000), updated_at: now };
      const rows = check(await admin.from('agent_requests').update(change)
        .eq('id', id).eq('user_id', OWNER).eq('project_id', PROJECT).select('id'));
      return rows?.length ? json({ ok: true }) : fail('Demande introuvable dans RNDS.', 404);
    }
    case 'taches': {
      let query = admin.from('tasks').select('id, text, due, done, created_at, done_at')
        .eq('user_id', OWNER).eq('project_id', PROJECT).order('due', { nullsFirst: false }).order('created_at');
      if (!body.toutes) query = query.eq('done', false);
      return json({ taches: check(await query) });
    }
    case 'tache_ajouter': {
      const label = text(body.texte, 300);
      const due = text(body.echeance, 10);
      if (!label) return fail('texte attendu.');
      if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return fail('echeance au format AAAA-MM-JJ.');
      const id = `tache-${crypto.randomUUID()}`;
      check(await admin.from('tasks').insert({ user_id: OWNER, id, project_id: PROJECT, text: label, due: due || null, done: false }));
      return json({ ok: true, id });
    }
    case 'tache_cocher': {
      const done = body.faite !== false;
      const rows = check(await admin.from('tasks').update({ done, done_at: done ? now : null })
        .eq('id', text(body.id, 80)).eq('user_id', OWNER).eq('project_id', PROJECT).select('id'));
      return rows?.length ? json({ ok: true }) : fail('Tâche introuvable dans RNDS.', 404);
    }
    case 'fiches': {
      const kind = text(body.type, 20);
      if (!READ_KINDS.includes(kind)) return fail(`type parmi : ${READ_KINDS.join(', ')}.`);
      const limit = Math.min(Math.max(Number(body.limite) || 100, 1), 500);
      const rows = check(await admin.from('records').select('id, data, created_at, updated_at')
        .eq('user_id', OWNER).eq('project_id', PROJECT).eq('kind', kind).order('updated_at', { ascending: false }).limit(limit));
      return json({ fiches: rows });
    }
    case 'fiche_enregistrer': {
      const kind = text(body.type, 20);
      const data = body.data;
      if (!WRITE_KINDS.includes(kind)) return fail(`type parmi : ${WRITE_KINDS.join(', ')}.`);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return fail('data : un objet attendu.');
      if (JSON.stringify(data).length > 20000) return fail('data trop gros.');
      const id = text(body.id, 64);
      if (id) {
        const found = check(await admin.from('records').select('data')
          .eq('id', id).eq('user_id', OWNER).eq('project_id', PROJECT).eq('kind', kind).maybeSingle());
        if (!found) return fail('Fiche introuvable dans RNDS.', 404);
        check(await admin.from('records').update({ data: { ...(found.data as object), ...data }, updated_at: now }).eq('id', id));
        return json({ ok: true, id });
      }
      const row = check(await admin.from('records').insert({ user_id: OWNER, project_id: PROJECT, kind, data }).select('id').single());
      return json({ ok: true, id: (row as { id: string }).id });
    }
    case 'ventes': {
      const days = Math.min(Math.max(Number(body.jours) || 30, 1), 400);
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const rows = check(await admin.from('app_sales').select('day, downloads, purchases, proceeds')
        .eq('project_id', PROJECT).gte('day', since).order('day', { ascending: false }));
      return json({ ventes: rows });
    }
    default:
      return fail('action inconnue : etat, demandes, prendre, fini, taches, tache_ajouter, tache_cocher, fiches, fiche_enregistrer, ventes.');
  }
}));
