// Sending Marc HQ notifications (Web Push), shared by the functions: the keys from Vault
// (push_keys), the send to every device of a person, and a log so nothing is sent twice.
import webpush from 'npm:web-push@3.6.7';
import { admin } from './common.ts';

export type Message = { title: string; body: string; url: string; tag: string };
export type PushKeys = { public: string; private: string; hook: string };

export const PROJECT_NAMES: Record<string, string> = { rnds: 'RNDS', club421: 'Club 421' };

/** The Web Push keys and the hook key, or null while they are not in Vault. */
export async function pushKeys(): Promise<PushKeys | null> {
  const { data } = await admin.rpc('push_keys');
  return data?.public && data?.private && data?.hook ? (data as PushKeys) : null;
}

/** Same length, same time: a key check that gives nothing away. */
export function sameKey(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Sends to every device of the person; a device that is gone is forgotten. Returns how many got it. */
export async function sendPush(userId: string, message: Message, keys: PushKeys) {
  webpush.setVapidDetails('mailto:contact@rnds.app', keys.public, keys.private);
  const { data } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', userId);
  let sent = 0;
  for (const device of data ?? []) {
    try {
      await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify(message), { TTL: 6 * 3600 });
      sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('endpoint', device.endpoint);
    }
  }
  return sent;
}

/** The people who turned notifications on somewhere. */
export async function subscribers() {
  const { data } = await admin.from('push_subscriptions').select('user_id');
  return [...new Set((data ?? []).map((row) => row.user_id as string))];
}

/** True the first time a key is seen (then it is logged): the guard against sending twice. */
export async function firstTime(key: string) {
  const { error } = await admin.from('push_log').insert({ key });
  return !error;
}

/** Whether a key was already logged, without logging it. */
export async function seen(key: string) {
  const { data } = await admin.from('push_log').select('key').eq('key', key).maybeSingle();
  return Boolean(data);
}
