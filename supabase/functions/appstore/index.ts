// App Store Connect for Marc HQ: the app's latest versions and its written reviews (overview), and
// answering a review (reply). The API key stays in the Supabase secrets; each project is tied to
// its app by ASC_APPS ("rnds:123,club421:456").
import { API, appOf, token } from '../_shared/asc.ts';
import { cors, json, safe, signedIn } from '../_shared/common.ts';

type Resource = { id: string; type: string; attributes: Record<string, unknown>; relationships?: Record<string, { data?: { id: string } | null }> };

Deno.serve(safe(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const who = await signedIn(req);
  if ('error' in who) return json({ error: who.error }, 401);
  const { action, project_id: project, review_id: reviewId, text } = await req.json().catch(() => ({}));
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
  // An error on any of the three is said as such (not shown as "no review yet")
  const failed = info.errors ?? versions.errors ?? reviews.errors;
  if (failed) return json({ error: failed[0]?.detail ?? 'App Store Connect ne répond pas.' }, 502);
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
}));
