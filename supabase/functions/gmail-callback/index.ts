// Google comes back here after the sign-in: the code is exchanged for a lasting token, kept on
// the server for this project only, then the browser goes back to the app.
import { admin, callbackUrl, readState } from '../_shared/common.ts';

const back = (target: string, result: string) => {
  const url = new URL(target);
  url.searchParams.set('gmail', result);
  return Response.redirect(url.toString(), 302);
};

Deno.serve(async (req) => {
  const params = new URL(req.url).searchParams;
  const state = await readState(params.get('state') ?? '');
  if (!state) return new Response('Lien expiré ou invalide. Recommence depuis Marc HQ.', { status: 400 });
  const code = params.get('code');
  if (!code) return back(state.r, 'annule');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      redirect_uri: callbackUrl,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await response.json();
  if (!response.ok || !tokens.refresh_token) return back(state.r, 'erreur');

  // The box's address, read from Google's identity token
  const claims = JSON.parse(atob(tokens.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  const email = String(claims.email ?? '');

  const link = await admin.from('mail_connections').upsert({ user_id: state.u, project_id: state.p, email, connected_at: new Date().toISOString() });
  const keep = await admin.from('mail_tokens').upsert({ user_id: state.u, project_id: state.p, refresh_token: tokens.refresh_token, updated_at: new Date().toISOString() });
  return back(state.r, link.error || keep.error ? 'erreur' : 'ok');
});
