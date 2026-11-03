// Shared by the Gmail functions: CORS, the service client, who is signed in, and the signed
// "state" that carries the project through Google's sign-in and back.
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

export const callbackUrl = `${url}/functions/v1/gmail-callback`;

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

export type State = { u: string; p: string; r: string; exp: number };

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
