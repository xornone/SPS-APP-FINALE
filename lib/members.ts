/**
 * Liste officielle des membres actifs de SPS et outils de réconciliation
 * nominative avec les pseudonymes / variantes de saisie des participants.
 */

// Plages Unicode des diacritiques combinants pour le nettoyage des accents
const COMBINING_DIACRITICS_START = 0x0300;
const COMBINING_DIACRITICS_END = 0x036f;

// Plages Unicode d'emojis pour ignorer les pictogrammes saisis dans l'app
const EMOJI_RANGES: Array<[number, number]> = [
  [0x2300, 0x23ff],
  [0x2600, 0x27bf],
  [0x2b00, 0x2bff],
  [0x1f1e6, 0x1f1ff],
  [0x1f300, 0x1faff],
  [0xfe0e, 0xfe0f],
];

function isEmojiCodePoint(code: number): boolean {
  if (code === 0x200d) return true;
  return EMOJI_RANGES.some(([start, end]) => code >= start && code <= end);
}

export function stripEmojiAndDiacritics(value: string): string {
  let withoutEmoji = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (isEmojiCodePoint(code)) continue;
    withoutEmoji += ch;
  }

  let out = "";
  for (const ch of withoutEmoji.normalize("NFD")) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= COMBINING_DIACRITICS_START && code <= COMBINING_DIACRITICS_END) continue;
    out += ch;
  }
  return out;
}

/**
 * Liste officielle des membres actifs SPS (99 membres au total :
 * 98 membres transmis par Thomas Trégaro + Martin Lemmens, l'un des admins du club).
 */
export const SPS_ACTIVE_MEMBERS: readonly string[] = [
  "Thomas Trégaro",
  "Marina Trégaro",
  "Théo Doussot",
  "Ulysse Dumas",
  "Huu Duc Nguyen",
  "Raphaël Villette",
  "Andrea Arcis-Jobert",
  "Antonin Simon",
  "Margaux Dirat",
  "Franck Georges",
  "Hugo Lembrez",
  "Florian Sicard-Baux",
  "Julien Davallon",
  "Redouane Mimouni",
  "Frederic Tardivot (Fred)",
  "Tanguy Delacôte",
  "Nicolas Lermission",
  "Hugo Dautruche",
  "Nathan Andrieu",
  "Theo Dupuy",
  "Pierrick Michel",
  "Diego Frappas",
  "Michel Heitzmann",
  "Theo Payet",
  "Matthieu Tranier",
  "Eloi Roussel",
  "Aymeric Closier",
  "Nathan Gavalda",
  "Vincent Carli",
  "Alexis Tesseyre",
  "Elie Willems",
  "Christopher Walton",
  "Remy Triboult",
  "Kevin Costil",
  "Ben Horny",
  "Xavier Tabel",
  "Loïc Pérez",
  "Florian Lamarre",
  "Brandon Guillerminet",
  "Elias Khaldi",
  "Louis Regnier",
  "Mohcine Matine",
  "Léonard Zocchetto",
  "Florian Maillou",
  "Pierre-Louis Mejean",
  "Vincent Jacquot",
  "François Xavier Rives",
  "Richard King",
  "Louise Girot Person",
  "Nicholas Sydenham",
  "Valentin Ensuque",
  "Gaspard Cayrat",
  "Moaad Fattali",
  "Thomas Lecoq",
  "Cédric Hamonier",
  "Jean-Baptiste Lafon",
  "Giulia Atcher",
  "Marion Buchou",
  "François Granier",
  "Alexandre Bouyssoux",
  "Julien Boisson",
  "Didier Varon",
  "Damien Kurtzemann",
  "Simon Boddaert",
  "Justine Durand",
  "Louis Prome",
  "Kieran Sweetman",
  "Valentin Escoffier",
  "Lucille Roux",
  "André Boeufgras",
  "Patrick Boeufgras",
  "Benjamin Embry",
  "Clément Dubreucq",
  "René Espinosa Rojas",
  "Hendricks Delcambre",
  "Raquel Cardó Fernández",
  "Fandy Sabarila",
  "Dorian Raymond",
  "Pierrick Pinault",
  "Hester van Wachem",
  "Audrey Mignon",
  "Maurizio Agnino",
  "Richard Planchon",
  "Lucas Nesta",
  "Anthony Capelotar",
  "Tom Garrandaux",
  "Mathis Roblot",
  "Charly Jegat",
  "Boris Cormary",
  "Léo Kiner",
  "Cédric Baudinet",
  "Zoé Paquet",
  "Pauline Moalic",
  "Jonas Graffe",
  "Pierre Fabbri",
  "Anaïs Gevaudan",
  "Maxime Colin",
  "Camille Frairrot",
  // 99e membre : Martin Lemmens (admin de l'app, présent dans lib/admins.ts)
  "Martin Lemmens",
];

/**
 * Correspondances spécifiques pour les pseudonymes ou abréviations
 * fréquemment saisis par les membres lors de leurs inscriptions.
 */
export const KNOWN_MEMBER_ALIASES: Record<string, string> = {
  "duc nguyen": "Huu Duc Nguyen",
  "charly j": "Charly Jegat",
  "jb lafon": "Jean-Baptiste Lafon",
  "andrea arcis": "Andrea Arcis-Jobert",
  "louise girot": "Louise Girot Person",
  "raph v": "Raphaël Villette",
  "ceric hamonier": "Cédric Hamonier",
  "fred tardivot": "Frederic Tardivot (Fred)",
  "frederic tardivot": "Frederic Tardivot (Fred)",
};

export function tokenizeName(str: string): string[] {
  return stripEmojiAndDiacritics(str)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function tokenKey(tokens: string[]): string {
  return [...tokens].sort().join(" ");
}

// Table de recherche rapide par ensemble de mots-clés normalisés
const exactMemberMap = new Map<string, string>();
const memberTokensCache: Array<{ member: string; tokenSet: Set<string> }> = [];

for (const member of SPS_ACTIVE_MEMBERS) {
  const tokens = tokenizeName(member);
  exactMemberMap.set(tokenKey(tokens), member);
  memberTokensCache.push({ member, tokenSet: new Set(tokens) });
}

for (const [alias, target] of Object.entries(KNOWN_MEMBER_ALIASES)) {
  exactMemberMap.set(tokenKey(tokenizeName(alias)), target);
}

/**
 * Réconcilie un nom de participant saisi dans l'application avec un membre officiel.
 * 1. Recherche par alias explicite (ex. "Charly J" -> "Charly Jegat")
 * 2. Recherche par ensemble exact de mots (ex. "Jacquot vincent" -> "Vincent Jacquot")
 * 3. Recherche par sous-ensemble strict (ex. "Louise Girot" -> "Louise Girot Person")
 */
export function findOfficialMember(participantName: string): string | null {
  const tokens = tokenizeName(participantName);
  if (tokens.length === 0) return null;

  const key = tokenKey(tokens);
  const exact = exactMemberMap.get(key);
  if (exact) return exact;

  if (tokens.length >= 2) {
    const candidates = memberTokensCache.filter(({ tokenSet }) =>
      tokens.every((t) => tokenSet.has(t))
    );
    if (candidates.length === 1) {
      return candidates[0].member;
    }
  }

  return null;
}
