// Line icons for the workspace sections, drawn in the spirit of Apple's SF Symbols.
import type { ReactNode } from 'react';

type Props = {
  slug: string;
  size?: number;
};

const paths: Record<string, ReactNode> = {
  // Overview: four tiles
  'vue-d-ensemble': (
    <>
      <rect x="4" y="4" width="7" height="7" rx="2" />
      <rect x="13" y="4" width="7" height="7" rx="2" />
      <rect x="4" y="13" width="7" height="7" rx="2" />
      <rect x="13" y="13" width="7" height="7" rx="2" />
    </>
  ),
  // Clubs: a building
  clubs: (
    <>
      <path d="M4 20V9.5L12 4l8 5.5V20" />
      <path d="M9.5 20v-5.5h5V20" />
      <path d="M2.5 20h19" />
    </>
  ),
  // Ambassadors: two people
  ambassadeurs: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19.5c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M15.5 5.2a3.2 3.2 0 0 1 0 6" />
      <path d="M17 14.6c1.9.5 3.2 2.1 3.5 4.9" />
    </>
  ),
  // Posts: a video frame
  publications: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="3" />
      <path d="M10.5 9.5v5l4-2.5z" />
    </>
  ),
  // Followers: rising line
  abonnes: (
    <>
      <path d="M3.5 17.5l5-5 3.5 3.5 7.5-7.5" />
      <path d="M14.5 8.5h5v5" />
    </>
  ),
  // Student unions: graduation cap
  bde: (
    <>
      <path d="M2.5 9.5L12 5l9.5 4.5L12 14z" />
      <path d="M6.5 11.5v4.2c1.4 1.4 3.3 2.1 5.5 2.1s4.1-.7 5.5-2.1v-4.2" />
      <path d="M21.5 9.5v5" />
    </>
  ),
  // Parties: calendar
  soirees: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17" />
      <path d="M8 3.5v3M16 3.5v3" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  // App Store: a star
  'app-store': <path d="M12 3.8l2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8z" />,
  // To do: a ticked list
  todo: (
    <>
      <path d="M4 6.5l1.6 1.6L8.5 5" />
      <path d="M4 12.5l1.6 1.6L8.5 11" />
      <path d="M4 18.5l1.6 1.6L8.5 17" />
      <path d="M11.5 7h8.5M11.5 13h8.5M11.5 19h8.5" />
    </>
  ),
  // Notes: a page with a folded corner
  notes: (
    <>
      <path d="M6 3.5h8.5L19 8v12.5H6z" />
      <path d="M14 3.5V8.5h5" />
      <path d="M9 13h7M9 16.5h5" />
    </>
  ),
  // Ideas: a light bulb
  idees: (
    <>
      <path d="M8.5 15.5c-1.8-1.3-3-3.3-3-5.6a6.5 6.5 0 0 1 13 0c0 2.3-1.2 4.3-3 5.6v2h-7z" />
      <path d="M9.5 20.5h5" />
    </>
  ),
  // More: three rows
  plus: (
    <>
      <path d="M4.5 7h15M4.5 12h15M4.5 17h15" />
    </>
  ),
  // Revenue: euro sign in a circle
  revenus: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.8 8.6a3.8 3.8 0 1 0 0 6.8" />
      <path d="M8 11h5M8 13.2h5" />
    </>
  ),
};

export default function ModuleIcon({ slug, size = 20 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[slug] ?? paths['vue-d-ensemble']}
    </svg>
  );
}
