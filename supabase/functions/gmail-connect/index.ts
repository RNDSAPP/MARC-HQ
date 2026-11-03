// Starts the Gmail connection of one project: returns the Google sign-in address, carrying the
// project and the page to come back to in a signed state.
import { allowedReturn, callbackUrl, cors, json, signState, signedIn } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const who = await signedIn(req);
  if ('error' in who) return json({ error: who.error }, 401);
  const { project_id: project, return_to: returnTo } = await req.json();
  if (typeof project !== 'string' || !project) return json({ error: 'Projet manquant.' }, 400);
  if (typeof returnTo !== 'string' || !allowedReturn(returnTo)) return json({ error: 'Adresse de retour non autorisée.' }, 400);
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  if (!clientId) return json({ error: 'L’identifiant Google n’est pas encore réglé dans Supabase.' }, 503);

  const state = await signState({ u: who.user.id, p: project, r: returnTo, exp: Date.now() + 10 * 60 * 1000 });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email https://www.googleapis.com/auth/gmail.readonly',
    access_type: 'offline',
    prompt: 'consent select_account',
    include_granted_scopes: 'true',
    state,
  });
  return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});
