const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
// Abrégés conventionnels français (pas une simple troncature à 3 lettres : "sept", "juil", "juin"…)
const MONTHS_SHORT = ["janv", "févr", "mars", "avr", "mai", "juin", "juil", "août", "sept", "oct", "nov", "déc"];

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function fmtDateLong(iso: string): string {
  const d = parseLocalDate(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function fmtDateShort(iso: string): string {
  const d = parseLocalDate(iso);
  return `${DAYS[d.getDay()].slice(0, 3).toUpperCase()} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()].toUpperCase()}`;
}

export function fmtTime(hms: string): string {
  return hms.slice(0, 5);
}

export function isPastDate(iso: string): boolean {
  const d = parseLocalDate(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function daysUntil(iso: string): number {
  const d = parseLocalDate(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

export function isWeekend(iso: string): boolean {
  const day = parseLocalDate(iso).getDay();
  return day === 0 || day === 6;
}

export function withinDays(iso: string, days: number): boolean {
  const n = daysUntil(iso);
  return n >= 0 && n <= days;
}

export function fmtKm(v: number): string {
  return `${(Math.round(v * 10) / 10).toString().replace(".", ",")} km`;
}

export function fmtM(v: number): string {
  return `${Math.round(v)} m`;
}

// Formatage court d'un timestamp (ISO complet, avec heure) pour la
// discussion sous une sortie : juste l'heure si c'est aujourd'hui, sinon
// date courte + heure.
export function fmtCommentTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const hh = `${d.getHours()}`.padStart(2, "0");
  const mm = `${d.getMinutes()}`.padStart(2, "0");
  const sameDay =
    d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (sameDay) return `${hh}:${mm}`;
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} · ${hh}:${mm}`;
}

// Lundi de la semaine calendaire (ISO) contenant la date donnee, a minuit.
function mondayOf(d: Date): Date {
  const day = d.getDay(); // 0 = dimanche ... 6 = samedi
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Cle stable (date du lundi, AAAA-MM-JJ) identifiant la semaine calendaire
// d'une sortie — sert a regrouper les sorties par semaine (lundi -> dimanche)
// pour afficher un intercalaire entre chaque semaine dans les listes.
export function weekKey(iso: string): string {
  const monday = mondayOf(parseLocalDate(iso));
  const y = monday.getFullYear();
  const m = `${monday.getMonth() + 1}`.padStart(2, "0");
  const d = `${monday.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Libelle d'intercalaire pour une semaine calendaire (lundi -> dimanche),
// ex. "8 – 14 septembre" ou "29 sept. – 5 oct." si elle change de mois.
// Prefixe "Cette semaine · " si la semaine contient la date du jour.
export function fmtWeekLabel(iso: string): string {
  const monday = mondayOf(parseLocalDate(iso));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const sameMonth = monday.getMonth() === sunday.getMonth();
  const thisYear = new Date().getFullYear();

  const startLabel = sameMonth ? `${monday.getDate()}` : `${monday.getDate()} ${MONTHS_SHORT[monday.getMonth()]}.`;
  const endLabel = `${sunday.getDate()} ${sameMonth ? MONTHS[sunday.getMonth()] : `${MONTHS_SHORT[sunday.getMonth()]}.`}`;
  const yearSuffix = sunday.getFullYear() !== thisYear ? ` ${sunday.getFullYear()}` : "";
  const range = `${startLabel} – ${endLabel}${yearSuffix}`;

  const isCurrentWeek = monday.getTime() === mondayOf(new Date()).getTime();
  return isCurrentWeek ? `Cette semaine · ${range}` : range;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
