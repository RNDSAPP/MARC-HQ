// Day and night on the scale model, from the device's clock and the sun over Lyon.
import { useEffect, useState } from 'react';

export type Phase = 'dawn' | 'day' | 'dusk' | 'night';
export type PhaseChoice = 'auto' | 'day' | 'night';

// Lyon, where Marc works. Changing city is just these two numbers.
const LATITUDE = 45.76;
const LONGITUDE = 4.84;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Sunrise and sunset today, as local decimal hours (e.g. 7.4 = 07:24), with a simple solar model. */
export function sunTimes(date = new Date()): { sunrise: number; sunset: number } {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start.getTime()) / 86400000);
  const b = rad((360 / 365) * (day - 81));
  const declination = rad(23.44) * Math.sin(b);
  // Equation of time, in minutes: the sun runs a little early or late over the year.
  const equation = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const utcOffset = -date.getTimezoneOffset() / 60;
  const noon = 12 - LONGITUDE / 15 + utcOffset - equation / 60;
  // -0.83° accounts for the sun's size and the bending of light near the horizon.
  const cosHour =
    (Math.sin(rad(-0.83)) - Math.sin(rad(LATITUDE)) * Math.sin(declination)) / (Math.cos(rad(LATITUDE)) * Math.cos(declination));
  const half = (Math.acos(Math.min(1, Math.max(-1, cosHour))) * 180) / Math.PI / 15;
  return { sunrise: noon - half, sunset: noon + half };
}

/** Dawn from 30 min before sunrise to 1 h after, dusk from 1 h before sunset to 45 min after. */
export function phaseAt(date = new Date()): Phase {
  const { sunrise, sunset } = sunTimes(date);
  const hour = date.getHours() + date.getMinutes() / 60;
  if (hour < sunrise - 0.5 || hour > sunset + 0.75) return 'night';
  if (hour < sunrise + 1) return 'dawn';
  if (hour > sunset - 1) return 'dusk';
  return 'day';
}

/** The phase to show: follows the clock (checked every minute) unless forced to day or night. */
export function usePhase(choice: PhaseChoice): Phase {
  const [phase, setPhase] = useState(() => phaseAt());
  useEffect(() => {
    const timer = window.setInterval(() => setPhase(phaseAt()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  return choice === 'auto' ? phase : choice;
}

export const phaseLabel: Record<Phase, string> = { dawn: 'Aube', day: 'Jour', dusk: 'Crépuscule', night: 'Nuit' };
