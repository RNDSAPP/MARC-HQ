import { useEffect } from 'react';
import { useStored } from '../hooks/useStored';

// The maps' little characters move with CSS animations (Building.css). Left alone, the browser
// plays them at the screen's rate (up to 120 images a second on a MacBook) all day long. So they
// are held still in CSS (MapViewport.css) and this driver moves them on itself:
// - at 30 images a second at most (15 when the Mac asks for less motion);
// - only while Marc HQ is the window in use and visible, and the map is on screen;
// - asleep after 60 seconds without a mouse move, a key or a touch, awake at the next one;
// - never in "off" (Carte fixe, the account menu).
// When it does not move, no image of the map is drawn at all. <html> carries motion-off while
// the driver sleeps, for the parts that follow it (the bartender's round, Building.tsx).

export type Motion = 'auto' | 'off';

export function useMotion() {
  return useStored<Motion>('marc-hq:motion', () => 'auto');
}

const IDLE_AFTER = 60_000;
const RESUMED = 'marc-hq:motion-resumed';

/** Resolves at once while the map moves, else as soon as it moves again. */
export function whenMoving() {
  if (!document.documentElement.classList.contains('motion-off')) return Promise.resolve();
  return new Promise<void>((resolve) => window.addEventListener(RESUMED, () => resolve(), { once: true }));
}

/** The map animations to drive: those inside a map on screen. */
function mapAnimations() {
  return document.getAnimations().filter((animation) => {
    const target = (animation.effect as KeyframeEffect | null)?.target;
    return target instanceof Element && target.closest('.map-pan') && !target.closest('.map--away');
  });
}

/** Runs the driver for the whole app (mounted once, in App). */
export function useMotionDriver() {
  const [motion] = useMotion();
  useEffect(() => {
    const root = document.documentElement;
    const slow = window.matchMedia('(prefers-reduced-motion: reduce)');
    let timer = 0;
    let last = 0;
    let lastInput = performance.now();
    let list: Animation[] = [];
    let listAt = 0;

    const tick = () => {
      const now = performance.now();
      if (now - lastInput > IDLE_AFTER) return update();
      const step = Math.min(now - last, 250);
      last = now;
      // The list is refreshed every second (a page change brings new figures)
      if (now - listAt > 1000) {
        list = mapAnimations();
        listAt = now;
      }
      for (const animation of list) {
        // Transitions (the bartender walking) start running on their own: they are held too
        if (animation.playState === 'running') animation.pause();
        animation.currentTime = Number(animation.currentTime ?? 0) + step;
      }
    };

    const update = () => {
      const idle = performance.now() - lastInput > IDLE_AFTER;
      const active = motion !== 'off' && document.visibilityState === 'visible' && document.hasFocus() && !idle;
      const wasOff = root.classList.contains('motion-off');
      root.classList.toggle('motion-off', !active);
      window.clearInterval(timer);
      timer = 0;
      if (!active) return;
      last = performance.now();
      listAt = 0;
      timer = window.setInterval(tick, 1000 / (slow.matches ? 15 : 30));
      if (wasOff) window.dispatchEvent(new Event(RESUMED));
    };

    const onInput = () => {
      const wasIdle = performance.now() - lastInput > IDLE_AFTER;
      lastInput = performance.now();
      if (wasIdle) update();
    };

    update();
    const inputs = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
    inputs.forEach((name) => window.addEventListener(name, onInput, { passive: true, capture: true }));
    window.addEventListener('focus', update);
    window.addEventListener('blur', update);
    document.addEventListener('visibilitychange', update);
    slow.addEventListener('change', update);
    return () => {
      window.clearInterval(timer);
      inputs.forEach((name) => window.removeEventListener(name, onInput, { capture: true }));
      window.removeEventListener('focus', update);
      window.removeEventListener('blur', update);
      document.removeEventListener('visibilitychange', update);
      slow.removeEventListener('change', update);
    };
  }, [motion]);
}
