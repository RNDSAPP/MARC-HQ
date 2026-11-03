// Dates shown in the interface, always computed from today.

/** ISO week number (weeks start on Monday, week 1 holds the first Thursday). */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Labels of the first and last of the `count` weeks ending this week, e.g. S34 and S45. */
export function weekSpan(count: number, today = new Date()): { first: string; last: string } {
  const start = new Date(today);
  start.setDate(start.getDate() - (count - 1) * 7);
  return { first: `S${isoWeek(start)}`, last: `S${isoWeek(today)}` };
}

/** "Mardi 3 novembre" */
export function dayLabel(today = new Date()): string {
  const label = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(today);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "16:45" */
export function timeLabel(today = new Date()): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(today);
}

/** "Bonjour" in the morning and early afternoon, "Bonsoir" from 16 h. */
export function greeting(today = new Date()): string {
  const hour = today.getHours();
  return hour >= 5 && hour < 16 ? 'Bonjour' : 'Bonsoir';
}
