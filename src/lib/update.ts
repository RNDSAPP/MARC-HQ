import { useEffect, useState } from 'react';

declare const __BUILD__: string;

// Marc HQ updates itself: the app knows its build id, and checks the one online (/version.json,
// never cached) when it comes back to the screen and every 10 minutes. A new version found while
// Marc was away loads at once; one found while he is using it waits for a tap on "Mettre à jour".

const mine = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';

async function online() {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;
    return ((await response.json()) as { build?: string }).build ?? null;
  } catch {
    return null;
  }
}

/** True when a newer version is online and waiting for a tap. */
export function useUpdate() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (mine === 'dev') return;
    let away = false;
    const check = async (comingBack: boolean) => {
      const build = await online();
      if (!build || build === mine) return;
      if (comingBack) window.location.reload();
      else setReady(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') away = true;
      else if (away) {
        away = false;
        check(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(() => document.visibilityState === 'visible' && check(false), 10 * 60 * 1000);
    check(false);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, []);
  return ready;
}
