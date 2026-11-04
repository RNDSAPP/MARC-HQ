import { useEffect, useState } from 'react';

// Putting Marc HQ in the Dock (Mac) or on the home screen (iPhone) as its own app. Chrome and Edge
// offer an install prompt the app can open; Safari has none, so the menu says where to click.

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: InstallPrompt | null = null;
const listeners = new Set<() => void>();
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferred = event as InstallPrompt;
  listeners.forEach((listener) => listener());
});
window.addEventListener('appinstalled', () => {
  deferred = null;
  listeners.forEach((listener) => listener());
});

/** Opened from the Dock or the home screen, in its own window. */
export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export type InstallWay = 'installed' | 'prompt' | 'safari-mac' | 'iphone' | 'other';

function way(): InstallWay {
  if (isInstalled()) return 'installed';
  if (deferred) return 'prompt';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'iphone';
  if (/Macintosh/.test(ua) && /Safari\//.test(ua) && !/Chrome|Chromium|Edg\//.test(ua)) return 'safari-mac';
  return 'other';
}

export function useInstall() {
  const [current, setCurrent] = useState<InstallWay>(way);
  useEffect(() => {
    const listener = () => setCurrent(way());
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    setCurrent(way());
  };
  return { way: current, install };
}
