// Starts linking the Google Calendar of the person signed in. The scope only lets Marc HQ manage
// the calendars it creates itself ("RNDS", "Club 421"), never the other calendars.
import { allowedReturn, cors, googleSignIn, json, safe, signState, signedIn } from '../_shared/common.ts';

Deno.serve(safe(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const who = await signedIn(req);
  if ('error' in who) return json({ error: who.error }, 401);
  const { return_to: returnTo } = await req.json();
  if (typeof returnTo !== 'string' || !allowedReturn(returnTo)) return json({ error: 'Adresse de retour non autorisée.' }, 400);
  if (!Deno.env.get('GOOGLE_CLIENT_ID')) return json({ error: 'L’identifiant Google n’est pas encore réglé dans Supabase.' }, 503);

  const state = await signState({ k: 'calendar', u: who.user.id, p: '', r: returnTo, exp: Date.now() + 10 * 60 * 1000 });
  return json({ url: googleSignIn('https://www.googleapis.com/auth/calendar.app.created', state) });
}));
