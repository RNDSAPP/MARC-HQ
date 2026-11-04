import { useEffect } from 'react';
import { useStored } from '../hooks/useStored';

// The maps' little characters move with CSS animations, which keep the processor busy. They only
// play when they are worth it: in "auto", while the Marc HQ window is the one in use (paused as
// soon as Marc works in another app, or the tab is hidden); in "off", never (a still drawing).
// The page then carries the class motion-off on <html> (styles in MapViewport.css).

export type Motion = 'auto' | 'off';

export function useMotion() {
  return useStored<Motion>('marc-hq:motion', () => 'auto');
}

/** Keeps the motion-off class on <html> in step with the setting and the window in use. */
export function useMotionGate() {
  const [motion] = useMotion();
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => root.classList.toggle('motion-off', motion === 'off' || document.visibilityState !== 'visible' || !document.hasFocus());
    apply();
    window.addEventListener('focus', apply);
    window.addEventListener('blur', apply);
    document.addEventListener('visibilitychange', apply);
    return () => {
      window.removeEventListener('focus', apply);
      window.removeEventListener('blur', apply);
      document.removeEventListener('visibilitychange', apply);
    };
  }, [motion]);
}
