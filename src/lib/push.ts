import { useEffect, useState } from 'react';
import { supabase } from './supabase';

// Notifications on this computer or phone (Web Push). The device subscribes through the service
// worker (public/sw.js) and is kept in Supabase (push_subscriptions); the `push` function sends
// to it when an agent waits for Marc, finishes, or completes a request.

/** The public half of the Web Push keys (the private half is in Supabase Vault). */
const PUBLIC_KEY = 'BAoIJe075oTqwsL7Io105rQ0GNZwseeZDjP-ySF9C8b8tdjJekmWVjmJPNUSXlJba_bv5snzo4iSHlUcDLLIxx0';

export type PushState = 'unsupported' | 'install' | 'blocked' | 'off' | 'on';

const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent);
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

function keyBytes(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/** A short name for the device, shown nowhere yet but handy to tell them apart in the table. */
function deviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Mac/.test(ua)) return 'Mac';
  return 'Ordinateur';
}

async function currentState(): Promise<PushState> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    // On an iPhone, notifications only exist once Marc HQ is on the home screen
    return isIOS() && !standalone() ? 'install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'blocked';
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  return subscription && Notification.permission === 'granted' ? 'on' : 'off';
}

/** Turns notifications on for this device: asks the permission, subscribes, saves it. */
export async function enablePush(): Promise<PushState> {
  if (!supabase) return 'unsupported';
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'off';
  const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  const subscription = (await registration.pushManager.getSubscription()) ?? (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(PUBLIC_KEY) }));
  const json = subscription.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert({ endpoint: subscription.endpoint, p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '', device: deviceName() });
  if (error) {
    await subscription.unsubscribe();
    throw new Error('save');
  }
  return 'on';
}

/** Turns them off on this device only. */
export async function disablePush(): Promise<PushState> {
  const registration = await navigator.serviceWorker.getRegistration('/');
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription) {
    await supabase?.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
    await subscription.unsubscribe();
  }
  return 'off';
}

/** Sends a test notification to every device of the signed-in person. Returns how many got it. */
export async function testPush(): Promise<number> {
  if (!supabase) return 0;
  const { data, error } = await supabase.functions.invoke('push', { body: { test: true } });
  if (error) throw error;
  return (data as { sent?: number }).sent ?? 0;
}

export function usePushState() {
  const [state, setState] = useState<PushState | null>(null);
  useEffect(() => {
    let alive = true;
    currentState()
      .then((value) => alive && setState(value))
      .catch(() => alive && setState('unsupported'));
    return () => {
      alive = false;
    };
  }, []);
  return [state, setState] as const;
}
