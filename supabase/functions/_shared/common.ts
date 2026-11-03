// Shared by the Google functions (Gmail, Calendar): CORS, the service client, who is signed in,
// the signed "state" that carries what is being linked through Google's sign-in and back, and
// a fresh Google access token from a kept refresh token.
import { createClient } from 'npm:@supabase/supabase-js@2';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const url = Deno.env.get('SUPABASE_URL')!;
// New projects expose their secret keys as JSON; older ones as SUPABASE_SERVICE_ROLE_KEY
export const serviceKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  (JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>).default;

export const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

/** Where Google sends back after sign-in, for every kind of link (Gmail, Calendar). */
export const callbackUrl = `${url}/functions/v1/google-callback`;

/** The person behind the request, if signed in and on the allowed list (ALLOWED_EMAILS). */
export async function signedIn(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return { error: 'Connecte-toi à Marc HQ.' } as const;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return { error: 'Session expirée, reconnecte-toi.' } as const;
  const allowed = (Deno.env.get('ALLOWED_EMAILS') ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.includes((data.user.email ?? '').toLowerCase())) {
    return { error: 'Cette adresse n’est pas autorisée sur Marc HQ.' } as const;
  }
  return { user: data.user } as const;
}

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64url = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

async function hmac(text: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(serviceKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
}

/** k: what is being linked; p: the project (Gmail only); r: the page to go back to. */
export type State = { k: 'gmail' | 'calendar'; u: string; p: string; r: string; exp: number };

export async function signState(state: State) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(state)));
  return `${body}.${b64url(await hmac(body))}`;
}

export async function readState(value: string): Promise<State | null> {
  const [body, sig] = value.split('.');
  if (!body || !sig || b64url(await hmac(body)) !== sig) return null;
  const state = JSON.parse(new TextDecoder().decode(fromB64url(body))) as State;
  return state.exp > Date.now() ? state : null;
}

/** Where the app may send Google back to: the origins in APP_ORIGINS. */
export function allowedReturn(target: string) {
  try {
    const origin = new URL(target).origin;
    const origins = (Deno.env.get('APP_ORIGINS') ?? 'http://localhost:5173').split(',').map((o) => o.trim());
    return origins.includes(origin);
  } catch {
    return false;
  }
}

/** A short-lived Google access token from a kept refresh token, or null if Google refuses it. */
export async function googleAccess(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!response.ok) return null;
  return (await response.json()).access_token as string;
}

/** The Google sign-in address for these scopes. */
export function googleSignIn(scopes: string, state: string) {
  const params = new URLSearchParams({
    client_id: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: `openid email ${scopes}`,
    access_type: 'offline',
    prompt: 'consent select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}
