import { useEffect } from 'react';
import { usePhase } from '../lib/sun';
import { usePhaseChoice } from './Building';

/** Puts the whole interface in its night theme when it is night (tokens.css, :root[data-theme='night']). */
export default function PhaseTheme() {
  const [choice] = usePhaseChoice();
  const phase = usePhase(choice);
  useEffect(() => {
    const night = phase === 'night';
    document.documentElement.dataset.theme = night ? 'night' : 'day';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', night ? '#0e0f12' : '#f4f4f4');
  }, [phase]);
  return null;
}
