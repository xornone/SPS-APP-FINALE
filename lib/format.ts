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

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
