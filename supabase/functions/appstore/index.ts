// App Store Connect for Marc HQ: the app's latest versions and its written reviews (overview), and
// answering a review (reply). The API key stays in the Supabase secrets; each project is tied to
// its app by ASC_APPS ("rnds:123,club421:456").
import { cors, json, signedIn } from '../_shared/common.ts';

const API = 'https://api.appstoreconnect.apple.com/v1';

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const text64 = (value: object) => b64url(new TextEncoder().encode(JSON.stringify(value)));

/** A 15-minute App Store Connect token, signed with the .p8 key (ES256). */
async function token() {
  const pem = atob(Deno.env.get('ASC_PRIVATE_KEY_B64') ?? '');
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${text64({ alg: 'ES256', kid: Deno.env.get('ASC_KEY_ID'), typ: 'JWT' })}.${text64({ iss: Deno.env.get('ASC_ISSUER_ID'), iat: now, exp: now + 900, aud: 'appstoreconnect-v1' })}`;
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(unsigned)));
  return `${unsigned}.${b64url(signature)}`;
}

const appOf = (project: string) =>
  Object.fromEntries((Deno.env.get('ASC_APPS') ?? '').split(',').map((pair) => pair.split(':').map((part) => part.trim())))[project] as string | undefined;

type Resource = { id: string; type: string; attributes: Record<string, unknown>; relationships?: Record<string, { data?: { id: string } | null }> };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const who = await signedIn(req);
  if ('error' in who) return json({ error: who.error }, 401);
  const { action, project_id: project, review_id: reviewId, text } = await req.json();
  const app = appOf(project);
  if (!app) return json({ error: 'Aucune app App Store reliée à ce projet.' }, 404);
  const headers = { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' };

  if (action === 'reply') {
    if (typeof reviewId !== 'string' || typeof text !== 'string' || !text.trim()) return json({ error: 'Réponse vide.' }, 400);
    const response = await fetch(`${API}/customerReviewResponses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        data: {
          type: 'customerReviewResponses',
          attributes: { responseBody: text.trim() },
          relationships: { review: { data: { type: 'customerReviews', id: reviewId } } },
        },
      }),
    });
    if (!response.ok) {
      const detail = (await response.json().catch(() => ({}))).errors?.[0]?.detail;
      return json({ error: detail ?? 'Apple a refusé la réponse.' }, 502);
    }
    return json({ ok: true });
  }

  // Overview: the app, its latest versions, its latest written reviews with any answer
  const [info, versions, reviews] = await Promise.all([
    fetch(`${API}/apps/${app}?fields[apps]=name,bundleId`, { headers }).then((r) => r.json()),
    fetch(`${API}/apps/${app}/appStoreVersions?limit=3&fields[appStoreVersions]=versionString,appStoreState,appVersionState,createdDate,platform`, { headers }).then((r) => r.json()),
    fetch(
      `${API}/apps/${app}/customerReviews?sort=-createdDate&limit=50&include=response&fields[customerReviews]=rating,title,body,reviewerNickname,createdDate,territory,response&fields[customerReviewResponses]=responseBody,state,lastModifiedDate`,
      { headers },
    ).then((r) => r.json()),
  ]);
  if (info.errors) return json({ error: info.errors[0]?.detail ?? 'App Store Connect ne répond pas.' }, 502);
  const answers = new Map<string, Resource>(((reviews.included ?? []) as Resource[]).map((r) => [r.id, r]));
  return json({
    app: { name: info.data.attributes.name, bundleId: info.data.attributes.bundleId },
    versions: ((versions.data ?? []) as Resource[]).map((v) => ({
      version: v.attributes.versionString,
      state: v.attributes.appVersionState ?? v.attributes.appStoreState,
      platform: v.attributes.platform,
      created: v.attributes.createdDate,
    })),
    reviews: ((reviews.data ?? []) as Resource[]).map((r) => {
      const answer = r.relationships?.response?.data ? answers.get(r.relationships.response.data.id) : undefined;
      return {
        id: r.id,
        rating: r.attributes.rating,
        title: r.attributes.title,
        body: r.attributes.body,
        nickname: r.attributes.reviewerNickname,
        date: r.attributes.createdDate,
        territory: r.attributes.territory,
        response: answer ? { body: answer.attributes.responseBody, state: answer.attributes.state } : null,
      };
    }),
  });
});
