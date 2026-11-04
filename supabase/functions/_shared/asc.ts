// App Store Connect access shared by the functions: the 15-minute token signed with the team's
// .p8 key (kept in the Supabase secrets) and which app belongs to which project (ASC_APPS).
export const API = 'https://api.appstoreconnect.apple.com/v1';

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const text64 = (value: object) => b64url(new TextEncoder().encode(JSON.stringify(value)));

/** A 15-minute App Store Connect token, signed with the .p8 key (ES256). */
export async function token() {
  const pem = atob(Deno.env.get('ASC_PRIVATE_KEY_B64') ?? '');
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${text64({ alg: 'ES256', kid: Deno.env.get('ASC_KEY_ID'), typ: 'JWT' })}.${text64({ iss: Deno.env.get('ASC_ISSUER_ID'), iat: now, exp: now + 900, aud: 'appstoreconnect-v1' })}`;
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned)));
  return `${unsigned}.${b64url(signature)}`;
}

export const appOf = (project: string) =>
  Object.fromEntries((Deno.env.get('ASC_APPS') ?? '').split(',').map((pair) => pair.split(':').map((part) => part.trim())))[project] as string | undefined;

/** Every project tied to an app: [project, app id]. */
export const apps = () =>
  (Deno.env.get('ASC_APPS') ?? '')
    .split(',')
    .map((pair) => pair.split(':').map((part) => part.trim()))
    .filter((pair): pair is [string, string] => pair.length === 2 && Boolean(pair[0] && pair[1]));
