// The latest mails of a project's box: who, subject, date, a snippet, and whether it is unread.
import { admin, cors, googleAccess, json, safe, signedIn } from '../_shared/common.ts';

const header = (headers: { name: string; value: string }[], name: string) => headers.find((h) => h.name.toLowerCase() === name)?.value ?? '';

Deno.serve(safe(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const who = await signedIn(req);
  if ('error' in who) return json({ error: who.error }, 401);
  const { project_id: project } = await req.json();

  const { data: saved } = await admin.from('mail_tokens').select('refresh_token').eq('user_id', who.user.id).eq('project_id', project).maybeSingle();
  if (!saved) return json({ error: 'Aucune boîte connectée pour ce projet.', reconnect: true }, 404);

  const access = await googleAccess(saved.refresh_token);
  if (!access) return json({ error: 'Google demande de reconnecter cette boîte.', reconnect: true }, 401);

  const auth = { Authorization: `Bearer ${access}` };
  const api = 'https://gmail.googleapis.com/gmail/v1/users/me';
  const list = await (await fetch(`${api}/messages?labelIds=INBOX&maxResults=20`, { headers: auth })).json();
  const messages = await Promise.all(
    (list.messages ?? []).map(async ({ id }: { id: string }) => {
      const m = await (await fetch(`${api}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, { headers: auth })).json();
      const headers = m.payload?.headers ?? [];
      return {
        id,
        thread: m.threadId as string,
        from: header(headers, 'from'),
        subject: header(headers, 'subject'),
        date: Number(m.internalDate ?? 0),
        snippet: (m.snippet ?? '') as string,
        unread: ((m.labelIds ?? []) as string[]).includes('UNREAD'),
      };
    }),
  );
  return json({ messages });
}));
