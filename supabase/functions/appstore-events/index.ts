// Apple's App Store Server Notifications (version 2) for RNDS and Club 421: Apple calls this address
// on every purchase, renewal and refund. Each message is signed by Apple; it is checked against
// Apple's root certificate (Apple Root CA - G3, embedded below) with Apple's own library before
// anything is believed. Then Marc gets a notification: "paiement reçu", "abonnement renouvelé"…
import { Environment, NotificationTypeV2, SignedDataVerifier } from 'npm:@apple/app-store-server-library@1.5.0';
import { API, apps, token } from '../_shared/asc.ts';
import { json, safe } from '../_shared/common.ts';
import { PROJECT_NAMES, firstTime, pushKeys, sendPush, subscribers } from '../_shared/push.ts';

// https://www.apple.com/certificateauthority/AppleRootCA-G3.cer
// SHA-256 63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79
const APPLE_ROOT_G3 = Uint8Array.from(atob('MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA=='), (c) => c.charCodeAt(0));

/** The bundle id of each project's app, asked once to App Store Connect. */
let bundles: Map<string, { project: string; app: string }> | null = null;
async function appsByBundle() {
  if (bundles) return bundles;
  const auth = `Bearer ${await token()}`;
  const found = new Map<string, { project: string; app: string }>();
  for (const [project, app] of apps()) {
    const response = await fetch(`${API}/apps/${app}?fields[apps]=bundleId`, { headers: { Authorization: auth } });
    if (response.ok) found.set((await response.json()).data.attributes.bundleId, { project, app });
  }
  bundles = found;
  return found;
}

/** What the payload says about itself, before checking (only to pick the right app and verifier). */
function peek(signed: string) {
  try {
    const payload = JSON.parse(atob(signed.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { bundleId: payload?.data?.bundleId as string | undefined, environment: payload?.data?.environment as string | undefined };
  } catch {
    return {};
  }
}

const money = (milli: number | undefined, currency: string | undefined) =>
  milli === undefined || !currency ? '' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(milli / 1000);

/** The words for each kind of event worth telling; the others (status changes, tests…) are quiet. */
const SAY: Partial<Record<string, string>> = {
  [NotificationTypeV2.ONE_TIME_CHARGE]: 'paiement reçu',
  [NotificationTypeV2.SUBSCRIBED]: 'nouvel abonnement',
  [NotificationTypeV2.DID_RENEW]: 'abonnement renouvelé',
  [NotificationTypeV2.REFUND]: 'remboursement',
  [NotificationTypeV2.TEST]: 'test d’Apple reçu',
};

Deno.serve(
  safe(async (req) => {
    if (req.method !== 'POST') return json({ error: 'POST seulement.' }, 405);
    const { signedPayload } = await req.json().catch(() => ({}));
    if (typeof signedPayload !== 'string') return json({ error: 'Rien à lire.' }, 400);

    const { bundleId, environment } = peek(signedPayload);
    const target = bundleId ? (await appsByBundle()).get(bundleId) : undefined;
    if (!target || !bundleId) return json({ error: 'App inconnue.' }, 400);
    const sandbox = environment === Environment.SANDBOX;
    const verifier = new SignedDataVerifier([APPLE_ROOT_G3 as unknown as Buffer], true, sandbox ? Environment.SANDBOX : Environment.PRODUCTION, bundleId, sandbox ? undefined : Number(target.app));

    let notification;
    try {
      notification = await verifier.verifyAndDecodeNotification(signedPayload);
    } catch {
      return json({ error: 'Signature refusée.' }, 401);
    }
    const what = notification.notificationType ? SAY[notification.notificationType] : undefined;
    // Apple sends each message until it gets a 200: answer it even when there is nothing to say
    if (!what || !notification.notificationUUID || !(await firstTime(`apple:${notification.notificationUUID}`))) return json({ ok: true });

    const signedTransaction = notification.data?.signedTransactionInfo;
    const transaction = signedTransaction ? await verifier.verifyAndDecodeTransaction(signedTransaction).catch(() => undefined) : undefined;
    const amount = money(transaction?.price, transaction?.currency);
    const keys = await pushKeys();
    if (keys) {
      const message = {
        title: `${PROJECT_NAMES[target.project] ?? target.project} · ${what}${amount ? ` : ${notification.notificationType === NotificationTypeV2.REFUND ? '−' : ''}${amount}` : ''}${sandbox ? ' (test)' : ''}`,
        body: transaction?.productId ? `Produit : ${transaction.productId}` : 'App Store',
        url: `/${target.project}/vue-d-ensemble`,
        tag: `apple-${notification.notificationUUID}`,
      };
      for (const user of await subscribers()) await sendPush(user, message, keys);
    }
    return json({ ok: true });
  }),
);
