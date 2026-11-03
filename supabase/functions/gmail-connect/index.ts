// Starts the Gmail connection of one project: returns the Google sign-in address, carrying the
// project and the page to come back to in a signed state.
import { allowedReturn, cors, googleSignIn, json, signState, signedIn } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const who = await signedIn(req);
  if ('error' in who) return json({ error: who.error }, 401);
  const { project_id: project, return_to: returnTo } = await req.json();
  if (typeof project !== 'string' || !project) return json({ error: 'Projet manquant.' }, 400);
  if (typeof returnTo !== 'string' || !allowedReturn(returnTo)) return json({ error: 'Adresse de retour non autorisée.' }, 400);
  if (!Deno.env.get('GOOGLE_CLIENT_ID')) return json({ error: 'L’identifiant Google n’est pas encore réglé dans Supabase.' }, 503);

  const state = await signState({ k: 'gmail', u: who.user.id, p: project, r: returnTo, exp: Date.now() + 10 * 60 * 1000 });
  return json({ url: googleSignIn('https://www.googleapis.com/auth/gmail.readonly', state) });
});
