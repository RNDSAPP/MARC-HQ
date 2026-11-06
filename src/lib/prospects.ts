// Prospecting in Marc HQ, one "spec" per project:
// - Club 421: the BDE, assos, bars and creators Marc offers a die in their colours ("bde" records);
// - RNDS: the clubs, coaches and fighters Marc invites to try the app ("prospect" records).
// Each target is a record (Supabase, table records), so the overview, the figures, the week card
// and the 10 a.m. "à relancer" notification all count it.
import type { RecordKind, RecordRow } from './records';
import { isoDate } from './dates';

export const APP_URL = 'https://apps.apple.com/fr/app/id6821133944';
export const RNDS_APP_URL = 'https://apps.apple.com/app/id6819875092';

export type StageDef = { name: string; pips: number };
export type Messages = { dm: string; objet: string; mail: string };
export type FieldDef = { key: string; label: string; ph?: string; full?: boolean; type?: string; options?: [string, string][] };

/** Everything that differs from one project's prospecting to the other's. */
export type ProspectSpec = {
  project: 'club421' | 'rnds';
  kind: RecordKind;
  /** The module (rubrique) that shows the list. */
  module: string;
  /** Plural and singular, for the counts ("cibles", "profils"). */
  many: string;
  one: string;
  types: Record<string, string>;
  defaultType: string;
  /** The five steps: to contact, contacted, talking, won, no. */
  stages: StageDef[];
  won: string;
  /** Days before the follow-up once contacted, once talking. */
  relanceDays: { contacted: number; talking: number };
  /** How a step is drawn: Club 421 a die, RNDS a round counter. */
  marker: 'die' | 'rounds';
  templates: (r: RecordRow) => Messages;
  /** The follow-up text (DM or mail), when the project has one. */
  relance?: (r: RecordRow, channel: 'dm' | 'mail') => string;
  /** The extra filters (selects), besides the type and the step. */
  selects: { key: string; all: string; label?: (value: string) => string }[];
  /** The two groups of bars in place of the scene. */
  stats: { title: string; of: (r: RecordRow) => string }[];
  legend: [string, string, string];
  offer: string;
  fields: FieldDef[];
  searchKeys: string[];
  csv: { name: string; cols: [string, string][] };
  find: { options: [string, string][]; defaultWhat: string; where: string; text: (n: string, what: string, where: string) => string };
  /** Bulk add by pasting Instagram handles. */
  bulk: boolean;
  dailyGoal: number;
  /** Mails sent by Marc HQ after Marc's tap (« Mails du jour »): who it shows as, where replies go, how many a day. */
  mailer?: { from: string; replyTo: string; daily: number };
  empty: string;
};

const plusDays = (n: number) => isoDate(new Date(Date.now() + n * 86400000));

/** "@bde_x", "https://instagram.com/bde_x/" → "bde_x". */
export const handle = (value?: string) =>
  String(value ?? '')
    .trim()
    .replace(/^@/, '')
    .replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\/@?/i, '')
    .replace(/[/?].*$/, '');

export const stageOf = (spec: ProspectSpec, r: RecordRow) => (spec.stages.some((s) => s.name === r.data.stage) ? r.data.stage : spec.stages[0].name);
export const typeOf = (spec: ProspectSpec, r: RecordRow) => (r.data.type && r.data.type in spec.types ? r.data.type : spec.defaultType);
export const contactedStage = (spec: ProspectSpec) => spec.stages[1].name;
export const talkingStage = (spec: ProspectSpec) => spec.stages[2].name;
export const refusedStage = (spec: ProspectSpec) => spec.stages[4].name;

/** A target waiting for Marc's follow-up today (or late). */
export const isDue = (spec: ProspectSpec, r: RecordRow, today = isoDate()) => {
  const stage = stageOf(spec, r);
  return !!r.data.relance && r.data.relance <= today && (stage === contactedStage(spec) || stage === talkingStage(spec));
};

/** What changes when a target moves to a step: contact day, next follow-up. */
export function stageChange(spec: ProspectSpec, r: RecordRow, stage: string): Record<string, string> {
  const today = isoDate();
  const data: Record<string, string> = { ...r.data, stage };
  if (stage === contactedStage(spec)) {
    if (!data.contacted_at) data.contacted_at = today;
    // Already followed up once: no second reminder
    if (!data.relance || data.relance < today) data.relance = data.relanced_at ? '' : plusDays(spec.relanceDays.contacted);
  } else if (stage === talkingStage(spec)) {
    if (!data.relance || data.relance < today) data.relance = plusDays(spec.relanceDays.talking);
  } else data.relance = '';
  return data;
}

/** The target's own texts when Marc (or an agent) kept some, else the templates. */
export function messagesOf(spec: ProspectSpec, r: RecordRow) {
  const t = spec.templates(r);
  return { dm: r.data.msg_dm || t.dm, objet: r.data.msg_objet || t.objet, mail: r.data.msg_mail || t.mail, own: !!(r.data.msg_dm || r.data.msg_mail) };
}

/** The list as a spreadsheet (semicolons and a BOM, so Excel opens it in French straight away). */
export function toCsv(spec: ProspectSpec, list: RecordRow[]) {
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const cols = spec.csv.cols;
  const lines = [cols.map(([, label]) => q(label)).join(';')].concat(
    list.map((r) => cols.map(([key]) => q(key === 'type' ? spec.types[typeOf(spec, r)] : key === 'stage' ? stageOf(spec, r) : r.data[key] ?? '')).join(';')),
  );
  return '﻿' + lines.join('\n');
}

/** The bulk add: Instagram handles out of pasted text (links, @handles, one bare handle per line). */
export function parseHandles(text: string) {
  const reserved = new Set(['p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct', 'tv', 'about', 'developer', 'legal', 'web', 'login', 'challenge', 'instagram']);
  const out: string[] = [];
  for (const line of text.split(/\n+/)) {
    const parts = line.split(/[\s,;]+/).filter(Boolean);
    for (const tok of parts) {
      const link = tok.match(/instagr(?:am\.com|\.am)\/([^/?#\s]+)/i);
      // A bare word counts only when alone on its line (otherwise it is text)
      if (!link && !tok.startsWith('@') && parts.length > 1) continue;
      if (!link && /^(https?:|www\.)/i.test(tok)) continue;
      const h = (link ? link[1] : tok.replace(/^@+/, '')).replace(/[)\]!?:;,]+$/, '').replace(/\.+$/, '').toLowerCase();
      if (!/^[a-z0-9._]{1,30}$/.test(h) || !/[a-z]/.test(h) || reserved.has(h) || out.includes(h)) continue;
      out.push(h);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ Club 421 */

const CLUB421_TYPES: Record<string, string> = { bde: 'BDE', bds: 'BDS', asso: 'Asso', bar: 'Bar', influenceur: 'Créateur' };

/** The ready-made DM and mail for a target, by kind (bar: "vous", the others: "tu"). */
function club421Templates(r: RecordRow): Messages {
  const nom = r.data.name ?? '';
  const type = r.data.type && r.data.type in CLUB421_TYPES ? r.data.type : 'bde';
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

export const CLUB421: ProspectSpec = {
  project: 'club421',
  kind: 'bde',
  module: 'bde',
  many: 'cibles',
  one: 'cible',
  types: CLUB421_TYPES,
  defaultType: 'bde',
  stages: [
    { name: 'À contacter', pips: 1 },
    { name: 'Contactés', pips: 2 },
    { name: 'En discussion', pips: 4 },
    { name: 'Partenaires', pips: 6 },
    { name: 'Refus', pips: 0 },
  ],
  won: 'Partenaires',
  relanceDays: { contacted: 5, talking: 2 },
  marker: 'die',
  templates: club421Templates,
  selects: [{ key: 'city', all: 'Toutes les villes' }],
  stats: [
    { title: 'Par type', of: (r) => CLUB421_TYPES[r.data.type] ?? 'BDE' },
    { title: 'Par ville', of: (r) => r.data.city || 'Sans ville' },
  ],
  legend: ['cibles', 'contactées', 'partenaires'],
  offer: 'L’offre : un dé (ou une table) aux couleurs du club, offert dans 421 Club. En échange, un partage de l’app à leurs étudiants, clients ou abonnés.',
  fields: [
    { key: 'name', label: 'Nom', ph: 'BDE ESSEC', full: true },
    { key: 'city', label: 'Ville', ph: 'Lyon' },
    { key: 'school', label: 'École ou lieu', ph: 'EM Lyon', full: true },
    { key: 'instagram', label: 'Instagram', ph: 'bde_exemple' },
    { key: 'tiktok', label: 'TikTok' },
    { key: 'email', label: 'Mail', ph: 'bde@ecole.fr', type: 'email' },
    { key: 'followers', label: 'Abonnés', ph: '4 k' },
    { key: 'site', label: 'Site', ph: 'https://', full: true },
  ],
  searchKeys: ['name', 'school', 'city', 'instagram', 'note', 'notes'],
  csv: {
    name: 'prospection-421-club',
    cols: [
      ['name', 'Nom'], ['type', 'Type'], ['school', 'École'], ['city', 'Ville'], ['instagram', 'Instagram'], ['tiktok', 'TikTok'],
      ['email', 'Mail'], ['site', 'Site'], ['followers', 'Abonnés'], ['stage', 'Étape'], ['contacted_at', 'Contacté le'],
      ['relance', 'Relance'], ['note', 'Ce qu’on sait'], ['notes', 'Mes notes'], ['source', 'Source'],
    ],
  },
  find: {
    options: [
      ['BDE et BDS', 'BDE et BDS'],
      ['associations étudiantes festives', 'Assos étudiantes'],
      ['bars étudiants et bars à jeux', 'Bars'],
      ['créateurs Instagram et TikTok sur la vie étudiante', 'Créateurs'],
    ],
    defaultWhat: 'BDE et BDS',
    where: 'Lille, ou une école : KEDGE, INSA…',
    text: (n, what, where) =>
      `Trouve ${n} ${what}${where ? ` à ${where}` : ' en France'} pour la prospection de 421 Club, avec leur Instagram et leur mail public vérifiés sur une vraie page, et ajoute-les à la Prospection de Marc HQ (sans doublons).`,
  },
  bulk: false,
  dailyGoal: 25,
  empty: 'Aucune cible pour l’instant. Ajoute un BDE, un bar ou un créateur, ou demande à un agent d’en trouver.',
};

/* ---------------------------------------------------------------------- RNDS */

const RNDS_TYPES: Record<string, string> = { club: 'Club', coach: 'Coach', combattant: 'Combattant' };
export const SPORTS = ['Boxe anglaise', 'Muay thaï', 'Kick-boxing', 'MMA', 'JJB', 'Lutte', 'Boxe française'];
export const LANGS: Record<string, string> = { fr: 'Français', en: 'Anglais', es: 'Espagnol', pt: 'Portugais' };
const COUNTRIES: Record<string, string> = {
  FR: 'France', BE: 'Belgique', CH: 'Suisse', CA: 'Canada', LU: 'Luxembourg', MA: 'Maroc', TN: 'Tunisie', DZ: 'Algérie', SN: 'Sénégal',
  GB: 'Royaume-Uni', IE: 'Irlande', US: 'États-Unis', AU: 'Australie', NZ: 'Nouvelle-Zélande', ES: 'Espagne', MX: 'Mexique',
  AR: 'Argentine', CO: 'Colombie', CL: 'Chili', PE: 'Pérou', BR: 'Brésil', PT: 'Portugal', TH: 'Thaïlande', NL: 'Pays-Bas', DE: 'Allemagne', IT: 'Italie',
};
export const countryName = (code?: string) => (code ? COUNTRIES[code.toUpperCase()] ?? code.toUpperCase() : '');

type Words = {
  dmTu: string; dmVous: string; mailTu: string; mailVous: string; me: string; fighter: string; coach: string; club: string;
  askTu: string; askVous: string; objet: (type: string, nom: string) => string; free: string; showTu: string; showVous: string;
  bye: string; sign: string; stopTu: string; stopVous: string;
  relanceTu: string; relanceVous: string; relanceMailTu: string; relanceMailVous: string;
};

const SIGN = { fr: 'Marc\nFondateur de RNDS · rnds.app', en: 'Marc\nFounder of RNDS · rnds.app', es: 'Marc\nFundador de RNDS · rnds.app', pt: 'Marc\nFundador do RNDS · rnds.app' };
const WORDS: Record<string, Words> = {
  fr: {
    dmTu: 'Salut !', dmVous: 'Bonjour !', mailTu: 'Salut,', mailVous: 'Bonjour,',
    me: 'Moi c’est Marc, je développe RNDS, une app iPhone gratuite pour les sports de combat.',
    fighter: 'Tu suis tes rounds, ton cardio (VO2max, âge forme) et ta prépa, et tu partages tes stats en story.',
    coach: 'Tu écris une séance avec des consignes par round, tu l’envoies par lien à ton athlète (WhatsApp, sans compte) et tu reçois son compte rendu.',
    club: 'Vos coachs envoient les séances à vos athlètes par un simple lien, sans compte, et reçoivent leur compte rendu.',
    askTu: 'Ça te parlerait de tester ?', askVous: 'Ça vous parlerait de tester ?',
    objet: (type, nom) => (type === 'club' ? `Une app gratuite pour les coachs de ${nom}` : type === 'coach' ? 'RNDS, une app gratuite pour tes séances' : 'RNDS, une app gratuite pour ta prépa'),
    free: 'C’est gratuit :', showTu: 'Si tu veux, je te la montre en 10 minutes.', showVous: 'Je peux vous la montrer en 10 minutes si ça vous intéresse.',
    bye: 'À bientôt,', sign: SIGN.fr,
    stopTu: 'Si ce n’est pas pour toi, réponds simplement « non merci » et je ne t’écrirai plus.',
    stopVous: 'Si ce n’est pas pour vous, répondez simplement « non merci » et je ne vous écrirai plus.',
    relanceTu: 'Salut ! Je reviens vers toi pour RNDS, au cas où mon message serait passé à la trappe. Si tu veux tester, c’est gratuit sur l’App Store (cherche RNDS). Et si ce n’est pas pour toi, aucun souci.',
    relanceVous: 'Bonjour ! Je reviens vers vous pour RNDS, au cas où mon message serait passé à la trappe. C’est gratuit sur l’App Store (cherchez RNDS). Et si ce n’est pas pour vous, aucun souci.',
    relanceMailTu: `Salut,\n\nJe reviens vers toi au sujet de RNDS, au cas où mon premier mail serait passé inaperçu. L’app est gratuite : ${RNDS_APP_URL}\n\nSi tu veux, je te la montre en 10 minutes.\n\n${SIGN.fr}\n\nSi ce n’est pas pour toi, réponds simplement « non merci » et je ne t’écrirai plus.`,
    relanceMailVous: `Bonjour,\n\nJe me permets de revenir vers vous au sujet de RNDS, au cas où mon premier mail serait passé inaperçu. L’app est gratuite : ${RNDS_APP_URL}\n\nJe peux vous la montrer en 10 minutes si ça vous intéresse.\n\n${SIGN.fr}\n\nSi ce n’est pas pour vous, répondez simplement « non merci » et je ne vous écrirai plus.`,
  },
  en: {
    dmTu: 'Hey!', dmVous: 'Hi!', mailTu: 'Hey,', mailVous: 'Hi,',
    me: 'I’m Marc, I build RNDS, a free iPhone app for combat sports.',
    fighter: 'It tracks your rounds, heart rate (VO2max, fitness age) and fight camp, and turns your stats into a story you can post.',
    coach: 'You write a session with notes for each round, send it by link (WhatsApp, no account needed) and get your athlete’s report back.',
    club: 'Your coaches send sessions to your athletes by link, no account needed, and get a report back from each of them.',
    askTu: 'Fancy giving it a try?', askVous: 'Would that be useful for the gym?',
    objet: (type, nom) => (type === 'club' ? `A free app for the coaches at ${nom}` : type === 'coach' ? 'RNDS, a free app for your sessions' : 'RNDS, a free app for your training'),
    free: 'It’s free:', showTu: 'Happy to show you around in 10 minutes.', showVous: 'Happy to show you around in 10 minutes if you’re interested.',
    bye: 'Cheers,', sign: SIGN.en,
    stopTu: 'If it’s not for you, just reply “no thanks” and I won’t write again.', stopVous: 'If it’s not for you, just reply “no thanks” and I won’t write again.',
    relanceTu: 'Hey! Just following up on RNDS in case my message got buried. If you’d like to try it, it’s free on the App Store (search RNDS). And if it’s not for you, no worries at all.',
    relanceVous: 'Hi! Just following up on RNDS in case my message got buried. It’s free on the App Store (search RNDS). And if it’s not for you, no worries at all.',
    relanceMailTu: `Hi,\n\nJust following up on RNDS in case my first email got buried. The app is free: ${RNDS_APP_URL}\n\nHappy to show you around in 10 minutes.\n\n${SIGN.en}\n\nIf it’s not for you, just reply “no thanks” and I won’t write again.`,
    relanceMailVous: `Hi,\n\nJust following up on RNDS in case my first email got buried. The app is free: ${RNDS_APP_URL}\n\nHappy to show you around in 10 minutes if you’re interested.\n\n${SIGN.en}\n\nIf it’s not for you, just reply “no thanks” and I won’t write again.`,
  },
  es: {
    dmTu: '¡Hola!', dmVous: '¡Hola!', mailTu: 'Hola:', mailVous: 'Hola:',
    me: 'Soy Marc, desarrollo RNDS, una app gratuita para deportes de combate en iPhone.',
    fighter: 'Llevas tus rounds, tu cardio (VO2max, edad física) y tu preparación, y compartes tus stats en historias.',
    coach: 'Escribes una sesión con indicaciones por round, la envías por enlace (WhatsApp, sin cuenta) y recibes el informe de tu atleta.',
    club: 'Sus entrenadores envían las sesiones a sus atletas por enlace, sin cuenta, y reciben el informe de cada uno.',
    askTu: '¿Te animas a probarla?', askVous: '¿Les interesaría probarla?',
    objet: (type, nom) => (type === 'club' ? `Una app gratuita para los entrenadores de ${nom}` : 'RNDS, una app gratuita para tus entrenamientos'),
    free: 'Es gratis:', showTu: 'Si quieres, te la enseño en 10 minutos.', showVous: 'Si les interesa, se la enseño en 10 minutos.',
    bye: 'Un saludo,', sign: SIGN.es,
    stopTu: 'Si no es para ti, responde «no, gracias» y no volveré a escribirte.', stopVous: 'Si no es para ustedes, respondan «no, gracias» y no volveré a escribirles.',
    relanceTu: '¡Hola! Te escribo de nuevo sobre RNDS por si mi mensaje se perdió. Si quieres probarla, es gratis en la App Store (busca RNDS). Y si no es para ti, ningún problema.',
    relanceVous: '¡Hola! Les escribo de nuevo sobre RNDS por si mi mensaje se perdió. Es gratis en la App Store (busquen RNDS). Y si no es para ustedes, ningún problema.',
    relanceMailTu: `Hola:\n\nTe escribo de nuevo sobre RNDS por si mi primer correo se perdió. La app es gratis: ${RNDS_APP_URL}\n\nSi te interesa, te la enseño en 10 minutos.\n\n${SIGN.es}\n\nSi no es para ti, responde «no, gracias» y no volveré a escribirte.`,
    relanceMailVous: `Hola:\n\nLes escribo de nuevo sobre RNDS por si mi primer correo se perdió. La app es gratis: ${RNDS_APP_URL}\n\nSi les interesa, se la enseño en 10 minutos.\n\n${SIGN.es}\n\nSi no es para ustedes, respondan «no, gracias» y no volveré a escribirles.`,
  },
  pt: {
    dmTu: 'Oi!', dmVous: 'Olá!', mailTu: 'Oi,', mailVous: 'Olá,',
    me: 'Sou o Marc, desenvolvo o RNDS, um app grátis de esportes de combate para iPhone.',
    fighter: 'Você acompanha seus rounds, seu cardio (VO2max, idade física) e sua preparação, e compartilha suas stats nos stories.',
    coach: 'Você monta um treino com instruções por round, envia por link (WhatsApp, sem conta) e recebe o relatório do seu atleta.',
    club: 'Os professores enviam os treinos aos atletas por link, sem conta, e recebem o relatório de cada um.',
    askTu: 'Topa testar?', askVous: 'Vocês topariam testar?',
    objet: (type, nom) => (type === 'club' ? `Um app grátis para os professores da ${nom}` : 'RNDS, um app grátis para seus treinos'),
    free: 'É grátis:', showTu: 'Se quiser, te mostro em 10 minutos.', showVous: 'Se tiverem interesse, mostro para vocês em 10 minutos.',
    bye: 'Abraço,', sign: SIGN.pt,
    stopTu: 'Se não for pra você, é só responder “não, obrigado” e não escrevo mais.', stopVous: 'Se não for para vocês, é só responder “não, obrigado” e não escrevo mais.',
    relanceTu: 'Oi! Voltando a falar do RNDS, caso minha mensagem tenha se perdido. Se quiser testar, é grátis na App Store (procure RNDS). E se não for pra você, sem problema.',
    relanceVous: 'Olá! Voltando a falar do RNDS, caso minha mensagem tenha se perdido. É grátis na App Store (procurem RNDS). E se não for para vocês, sem problema.',
    relanceMailTu: `Olá,\n\nVoltando a falar do RNDS, caso meu primeiro e-mail tenha se perdido. O app é grátis: ${RNDS_APP_URL}\n\nSe quiser, te mostro em 10 minutos.\n\n${SIGN.pt}\n\nSe não for pra você, é só responder “não, obrigado” e não escrevo mais.`,
    relanceMailVous: `Olá,\n\nVoltando a falar do RNDS, caso meu primeiro e-mail tenha se perdido. O app é grátis: ${RNDS_APP_URL}\n\nSe tiverem interesse, mostro para vocês em 10 minutos.\n\n${SIGN.pt}\n\nSe não for para vocês, é só responder “não, obrigado” e não escrevo mais.`,
  },
};
const wordsOf = (r: RecordRow) => WORDS[r.data.lang] ?? WORDS.fr;

/** The ready-made DM and mail of a profile, in its language (a club: "vous", the others: "tu"). */
function rndsTemplates(r: RecordRow): Messages {
  const w = wordsOf(r);
  const type = r.data.type && r.data.type in RNDS_TYPES ? r.data.type : 'combattant';
  const vous = type === 'club';
  const nom = (r.data.name || '').replace(/^@/, '');
  const benefit = type === 'club' ? w.club : type === 'coach' ? w.coach : w.fighter;
  return {
    dm: [vous ? w.dmVous : w.dmTu, w.me, benefit, vous ? w.askVous : w.askTu].join(' '),
    objet: w.objet(type, nom || 'RNDS'),
    mail: [vous ? w.mailVous : w.mailTu, w.me, benefit, `${w.free} ${RNDS_APP_URL}`, vous ? w.showVous : w.showTu, `${w.bye}\n${w.sign}`, vous ? w.stopVous : w.stopTu].join('\n\n'),
  };
}

export const RNDS: ProspectSpec = {
  project: 'rnds',
  kind: 'prospect',
  module: 'prospection',
  many: 'profils',
  one: 'profil',
  types: RNDS_TYPES,
  defaultType: 'combattant',
  stages: [
    { name: 'À contacter', pips: 1 },
    { name: 'Contactés', pips: 2 },
    { name: 'En discussion', pips: 3 },
    { name: 'Inscrits', pips: 4 },
    { name: 'Pas intéressés', pips: 0 },
  ],
  won: 'Inscrits',
  relanceDays: { contacted: 4, talking: 2 },
  marker: 'rounds',
  templates: rndsTemplates,
  relance: (r, channel) => {
    const w = wordsOf(r);
    const vous = r.data.type === 'club';
    return channel === 'mail' ? (vous ? w.relanceMailVous : w.relanceMailTu) : vous ? w.relanceVous : w.relanceTu;
  },
  selects: [
    { key: 'discipline', all: 'Tous les sports' },
    { key: 'country', all: 'Tous les pays', label: countryName },
    { key: 'lang', all: 'Toutes les langues', label: (v) => LANGS[v] ?? v },
  ],
  stats: [
    { title: 'Par sport', of: (r) => r.data.discipline || 'Sport à préciser' },
    { title: 'Par pays', of: (r) => countryName(r.data.country) || 'Pays à préciser' },
  ],
  legend: ['profils', 'contactés', 'inscrits'],
  offer: 'Le message : RNDS est gratuit. Clubs et coachs : le mode coach (séances envoyées par lien, compte rendu, sans compte). Combattants : rounds, cardio et stats à partager en story.',
  fields: [
    { key: 'name', label: 'Nom', ph: 'Boxing Club Lyon ou @boxeur', full: true },
    { key: 'instagram', label: 'Instagram', ph: 'boxeur_lyon' },
    { key: 'email', label: 'Mail', ph: 'contact@club.fr', type: 'email' },
    { key: 'discipline', label: 'Sport', options: SPORTS.map((s): [string, string] => [s, s]) },
    { key: 'lang', label: 'Langue des messages', options: Object.entries(LANGS) },
    { key: 'city', label: 'Ville', ph: 'Lyon' },
    { key: 'country', label: 'Pays (code)', ph: 'FR' },
    { key: 'followers', label: 'Abonnés', ph: '4 k' },
    { key: 'site', label: 'Site', ph: 'https://', full: true },
  ],
  searchKeys: ['name', 'instagram', 'email', 'city', 'country', 'discipline', 'note', 'notes'],
  csv: {
    name: 'prospection-rnds',
    cols: [
      ['name', 'Nom'], ['type', 'Type'], ['discipline', 'Sport'], ['city', 'Ville'], ['country', 'Pays'], ['lang', 'Langue'],
      ['instagram', 'Instagram'], ['email', 'Mail'], ['stage', 'Étape'], ['channel', 'Contacté par'], ['contacted_at', 'Contacté le'],
      ['relance', 'Relance'], ['note', 'Ce qu’on sait'], ['notes', 'Mes notes'], ['source', 'Source'],
    ],
  },
  find: {
    options: [
      ['combattants (boxe, muay thaï, MMA, JJB, lutte)', 'Combattants'],
      ['clubs et salles (boxe, muay thaï, MMA, JJB, lutte)', 'Clubs'],
      ['coachs de sports de combat', 'Coachs'],
    ],
    defaultWhat: 'combattants (boxe, muay thaï, MMA, JJB, lutte)',
    where: 'Brésil, Londres, Espagne… (vide : partout dans le monde)',
    text: (n, what, where) =>
      `Trouve ${n} ${what}${where ? ` (${where})` : ' partout dans le monde'} pour la prospection de RNDS : Instagram vérifié sur une vraie page, mail public pour les clubs ou mail pro pour les combattants s'il existe, un DM et un mail personnalisés dans leur langue, puis ajoute-les à la Prospection RNDS de Marc HQ (sans doublons, aucun mineur).`,
  },
  bulk: true,
  dailyGoal: 25,
  mailer: { from: 'Marc · RNDS <marc@mail.rnds.app>', replyTo: 'contact@rnds.app', daily: 20 },
  empty: 'Aucun profil pour l’instant. Colle des @ Instagram avec « Ajouter des profils », ou demande à un agent d’en trouver.',
};

const SPECS: Record<string, ProspectSpec> = { club421: CLUB421, rnds: RNDS };

/** The prospecting of a project, if it has one. */
export const specOf = (projectId: string): ProspectSpec | null => SPECS[projectId] ?? null;
