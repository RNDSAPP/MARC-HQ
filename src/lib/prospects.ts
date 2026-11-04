// Club 421 prospecting: the BDE, assos, bars and creators Marc offers a die in their colours.
// Each target is a "bde" record (Supabase, table records), so the overview pipeline, the figures,
// the week card and the 10 a.m. "à relancer" notification all count it.
import type { RecordRow } from './records';
import { isoDate } from './dates';

export const APP_URL = 'https://apps.apple.com/fr/app/id6821133944';

export const TYPES = { bde: 'BDE', bds: 'BDS', asso: 'Asso', bar: 'Bar', influenceur: 'Créateur' } as const;
export type TargetType = keyof typeof TYPES;

/** The steps of a target, with the pips of its die (0 = crossed out). The first four are the pipeline columns. */
export const STAGES = [
  { name: 'À contacter', pips: 1 },
  { name: 'Contactés', pips: 2 },
  { name: 'En discussion', pips: 4 },
  { name: 'Partenaires', pips: 6 },
  { name: 'Refus', pips: 0 },
] as const;
export type Stage = (typeof STAGES)[number]['name'];

export const stageOf = (r: RecordRow): Stage => (STAGES.some((s) => s.name === r.data.stage) ? (r.data.stage as Stage) : 'À contacter');
export const typeOf = (r: RecordRow): TargetType => (r.data.type && r.data.type in TYPES ? (r.data.type as TargetType) : 'bde');

/** "@bde_x", "https://instagram.com/bde_x/" → "bde_x". */
export const handle = (value?: string) =>
  String(value ?? '')
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\/@?/i, '')
    .replace(/[/?].*$/, '');

export const plusDays = (n: number) => isoDate(new Date(Date.now() + n * 86400000));

/** A target waiting for Marc's follow-up today (or late). */
export const isDue = (r: RecordRow, today = isoDate()) => {
  const stage = stageOf(r);
  return !!r.data.relance && r.data.relance <= today && (stage === 'Contactés' || stage === 'En discussion');
};

/** What changes when a target moves to a step: contact day, next follow-up. */
export function stageChange(r: RecordRow, stage: Stage): Record<string, string> {
  const today = isoDate();
  const data: Record<string, string> = { ...r.data, stage };
  if (stage === 'Contactés') {
    if (!data.contacted_at) data.contacted_at = today;
    if (!data.relance || data.relance < today) data.relance = plusDays(5);
  } else if (stage === 'En discussion') {
    if (!data.relance || data.relance < today) data.relance = plusDays(2);
  } else data.relance = '';
  return data;
}

/** The ready-made DM and mail for a target, by kind (bar: "vous", the others: "tu"). */
export function templates(r: RecordRow) {
  const nom = r.data.name ?? '';
  const type = typeOf(r);
  if (type === 'bar') {
    return {
      dm: `Bonjour ${nom} !\n\nJe m'appelle Marc, je fais 421 Club, une app iPhone pour jouer au 421 entre amis, au comptoir ou à distance.\n\nOn aimerait créer gratuitement un dé aux couleurs de ${nom} dans l'app : vos clients le retrouveraient en jouant chez vous.\n\nEn échange, juste une petite affiche avec le lien de l'app au comptoir, ou une story. Ça vous dirait ? Je peux vous envoyer un aperçu du dé.`,
      objet: `Un dé aux couleurs de ${nom} dans 421 Club`,
      mail: `Bonjour,\n\nJe m'appelle Marc et je développe 421 Club, une app iPhone pour jouer au 421 entre amis : au bar, en soirée ou à distance.\n\nJe vous propose de créer gratuitement un dé aux couleurs de ${nom} dans l'app. Vos clients pourraient jouer avec chez vous, et le nom du bar apparaîtrait dans le catalogue de dés.\n\nEn échange, on vous demande simplement de faire connaître l'app : une affiche avec un QR code au comptoir, ou une story sur votre compte.\n\nL'app est ici : ${APP_URL}\n\nSi ça vous intéresse, envoyez-moi votre logo et vos couleurs, je vous montre le dé avant de le publier.\n\nBelle journée,\nMarc\n421 Club`,
    };
  }
  if (type === 'influenceur') {
    const ig = handle(r.data.instagram);
    const who = ig ? `@${ig}` : nom;
    return {
      dm: `Salut ${who} !\n\nJe suis Marc, je fais 421 Club, une app iPhone pour jouer au 421 entre potes, en soirée ou à distance.\n\nJ'adore ce que tu fais sur la vie étudiante. On aimerait créer un dé à ton nom dans l'app, que ta communauté pourrait débloquer et utiliser.\n\nEn échange, une story ou une vidéo où tu joues une partie avec tes potes. Ça te tente ? Je t'envoie un aperçu du dé si tu veux.`,
      objet: 'Un dé à ton nom dans 421 Club',
      mail: `Salut,\n\nJe suis Marc, je développe 421 Club, une app iPhone pour jouer au 421 entre potes : en soirée, au bar ou à distance.\n\nOn aimerait créer un dé à ton nom dans l'app, que ta communauté pourrait utiliser en jouant.\n\nEn échange, on te propose de montrer l'app dans une story ou une vidéo (une partie avec tes potes, par exemple). Pas de script imposé, tu fais comme tu le sens.\n\nL'app : ${APP_URL}\n\nSi ça te parle, je t'envoie un aperçu du dé à tes couleurs.\n\nÀ bientôt,\nMarc\n421 Club`,
    };
  }
  const qui = type === 'bds' ? 'vos sportifs' : 'vos étudiants';
  const Qui = qui.charAt(0).toUpperCase() + qui.slice(1);
  return {
    dm: `Salut l'équipe ${nom} !\n\nJe suis Marc, je fais 421 Club, une app iPhone pour jouer au 421 entre potes, en soirée ou à distance.\n\nOn aimerait créer gratuitement un dé aux couleurs de ${nom} dans l'app : ${qui} pourraient jouer avec pendant vos soirées, et même lancer un tournoi avec le mode Soirée.\n\nEn échange, juste un partage de l'app à ${qui} (story ou mail). Ça vous dit ? Je vous envoie un aperçu du dé si vous voulez.`,
    objet: `Un dé aux couleurs de ${nom} dans 421 Club`,
    mail: `Bonjour l'équipe ${nom},\n\nJe m'appelle Marc et je développe 421 Club, une app iPhone pour jouer au 421 entre amis : en soirée, au bar ou à distance.\n\nOn propose aux associations étudiantes de créer gratuitement un dé aux couleurs de leur asso dans l'app. ${Qui} pourraient jouer avec pendant vos soirées, et le mode Soirée permet d'organiser un tournoi en quelques secondes.\n\nEn échange, on vous demande simplement de partager l'app à ${qui} : une story, un post ou un mot dans votre newsletter.\n\nL'app : ${APP_URL}\n\nSi ça vous intéresse, envoyez-moi votre logo et vos couleurs, je vous montre le dé avant de le publier.\n\nÀ bientôt,\nMarc\n421 Club`,
  };
}

/** The target's own texts when Marc kept some, else the templates. */
export function messagesOf(r: RecordRow) {
  const t = templates(r);
  return { dm: r.data.msg_dm || t.dm, objet: r.data.msg_objet || t.objet, mail: r.data.msg_mail || t.mail, own: !!(r.data.msg_dm || r.data.msg_mail) };
}

/** The list as a spreadsheet (semicolons and a BOM, so Excel opens it in French straight away). */
export function toCsv(list: RecordRow[]) {
  const cols: [string, string][] = [
    ['name', 'Nom'], ['type', 'Type'], ['school', 'École'], ['city', 'Ville'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'],
    ['email', 'Mail'], ['site', 'Site'], ['followers', 'Abonnés'], ['stage', 'Étape'], ['contacted_at', 'Contacté le'],
    ['relance', 'Relance'], ['note', 'Ce qu’on sait'], ['notes', 'Mes notes'], ['source', 'Source'],
  ];
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [cols.map(([, label]) => q(label)).join(';')].concat(
    list.map((r) => cols.map(([key]) => q(key === 'type' ? TYPES[typeOf(r)] : key === 'stage' ? stageOf(r) : r.data[key] ?? '')).join(';')),
  );
  return '﻿' + lines.join('\n');
}
