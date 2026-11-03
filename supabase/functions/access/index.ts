// Tells the app whether the person signed in may use Marc HQ (their address is in ALLOWED_EMAILS).
import { cors, json, signedIn } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const who = await signedIn(req);
  return json({ allowed: !('error' in who) });
});
