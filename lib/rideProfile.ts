import { haversineKm } from "./gpx";
import { fmtKm, fmtM } from "./format";

/**
 * Analyse du profil altimetrique d'une trace GPX : detection des montees
 * significatives et generation d'un texte de description pret a etre
 * propose dans le formulaire d'edition d'une sortie (l'admin peut ensuite
 * le modifier ou le completer librement, ce n'est qu'une suggestion).
 */

export interface ClimbSegment {
  /** Distance (km) depuis le depart ou commence la montee. */
  startKm: number;
  lengthKm: number;
  elevationGainM: number;
  avgGradientPct: number;
}

interface ResampledProfile {
  distKm: number[];
  ele: number[];
}

const RESAMPLE_STEP_M = 100;
const SMOOTH_RADIUS = 1; // fenetre de lissage ~ (2*1+1)*100m = 300m
const MIN_SWING_M = 12; // amplitude mini pour valider un sommet/creux (filtre le bruit GPS)
const MIN_CLIMB_KM = 0.8;
const MIN_CLIMB_GRADIENT_PCT = 2.5;
const MIN_SHORT_CLIMB_GAIN_M = 40;
const MIN_SHORT_CLIMB_GRADIENT_PCT = 4;
const MAX_CLIMBS_IN_TEXT = 3;

/**
 * Reechantillonne le profil altimetrique tous les `stepM` metres par
 * interpolation lineaire. Les points d'un GPX ne sont pas espaces
 * regulierement (enregistrement par temps, pas par distance) : travailler
 * sur une grille reguliere simplifie et fiabilise le calcul de pente.
 */
export function resampleProfile(
  points: [number, number][],
  elevations: number[],
  stepM = RESAMPLE_STEP_M
): ResampledProfile {
  if (points.length < 2 || points.length !== elevations.length) return { distKm: [], ele: [] };

  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + haversineKm(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]));
  }
  const totalKm = cum[cum.length - 1];
  if (totalKm <= 0) return { distKm: [0], ele: [elevations[0]] };

  const stepKm = stepM / 1000;
  const distKm: number[] = [];
  const ele: number[] = [];
  let srcIdx = 0;
  for (let d = 0; d <= totalKm; d += stepKm) {
    while (srcIdx < cum.length - 2 && cum[srcIdx + 1] < d) srcIdx++;
    const d0 = cum[srcIdx];
    const d1 = cum[srcIdx + 1] ?? d0;
    const t = d1 > d0 ? Math.min(Math.max((d - d0) / (d1 - d0), 0), 1) : 0;
    const e0 = elevations[srcIdx];
    const e1 = elevations[srcIdx + 1] ?? e0;
    distKm.push(d);
    ele.push(e0 + (e1 - e0) * t);
  }
  // Le pas de la boucle peut s'arreter jusqu'a `stepKm` avant la fin reelle
  // de la trace (ex: totalKm=9.989 et stepKm=0.1 -> dernier d=9.9) : on
  // ajoute explicitement le tout dernier point pour ne pas tronquer une
  // montee ou une bosse situee en toute fin de parcours.
  if (distKm[distKm.length - 1] < totalKm) {
    distKm.push(totalKm);
    ele.push(elevations[elevations.length - 1]);
  }
  return { distKm, ele };
}

/** Moyenne glissante simple : attenue le bruit GPS/barometrique du GPX. */
function smooth(values: number[], radius: number): number[] {
  return values.map((_, i) => {
    const from = Math.max(0, i - radius);
    const to = Math.min(values.length - 1, i + radius);
    let sum = 0;
    for (let j = from; j <= to; j++) sum += values[j];
    return sum / (to - from + 1);
  });
}

/**
 * Detecte les montees significatives d'une trace a partir de son profil
 * altimetrique. Algorithme "zigzag" : on suit l'altitude lissee et on ne
 * valide un sommet ou un creux que lorsqu'elle a devie d'au moins
 * MIN_SWING_M depuis le dernier extremum retenu, ce qui ignore le bruit
 * sans connaitre a l'avance la forme du parcours. Chaque paire
 * creux -> sommet consecutive est ensuite filtree pour ne garder que les
 * montees reellement notables (longueur et/ou pente suffisantes).
 */
export function detectClimbs(points: [number, number][], elevations: number[]): ClimbSegment[] {
  const { distKm, ele } = resampleProfile(points, elevations);
  if (distKm.length < 3) return [];
  const smoothed = smooth(ele, SMOOTH_RADIUS);

  type Extremum = { idx: number; isPeak: boolean };
  const extrema: Extremum[] = [];
  let runMaxIdx = 0;
  let runMinIdx = 0;
  let trend: "up" | "down" | null = null;

  // Deux regles de suivi differentes sont necessaires pour rester precis
  // quand le profil comporte un plateau plat :
  // - en pleine montee (trend "up"), le sommet doit se figer au PREMIER
  //   point qui atteint le maximum (comparaison stricte) : un plateau plat
  //   juste apres le sommet ne doit pas etre compte comme faisant partie
  //   de la montee.
  // - avant une montee (trend "down" ou pas encore determine), le creux de
  //   depart doit au contraire avancer jusqu'au DERNIER point du plateau
  //   plat (comparaison large) : c'est bien la ou la montee commence
  //   reellement, pas au debut du plat qui la precede.
  for (let i = 1; i < smoothed.length; i++) {
    if (trend === "up") {
      if (smoothed[i] > smoothed[runMaxIdx]) runMaxIdx = i;
    } else if (trend === "down") {
      if (smoothed[i] <= smoothed[runMinIdx]) runMinIdx = i;
    } else {
      if (smoothed[i] >= smoothed[runMaxIdx]) runMaxIdx = i;
      if (smoothed[i] <= smoothed[runMinIdx]) runMinIdx = i;
    }

    if (trend !== "down" && smoothed[runMaxIdx] - smoothed[i] >= MIN_SWING_M) {
      extrema.push({ idx: runMaxIdx, isPeak: true });
      trend = "down";
      runMinIdx = i;
    } else if (trend !== "up" && smoothed[i] - smoothed[runMinIdx] >= MIN_SWING_M) {
      extrema.push({ idx: runMinIdx, isPeak: false });
      trend = "up";
      runMaxIdx = i;
    }
  }
  if (trend === "up") extrema.push({ idx: runMaxIdx, isPeak: true });
  if (trend === "down") extrema.push({ idx: runMinIdx, isPeak: false });

  const climbs: ClimbSegment[] = [];
  for (let i = 0; i < extrema.length - 1; i++) {
    const a = extrema[i];
    const b = extrema[i + 1];
    if (a.isPeak || !b.isPeak) continue; // on ne garde que les paires creux -> sommet
    const gainM = smoothed[b.idx] - smoothed[a.idx];
    const lengthKm = distKm[b.idx] - distKm[a.idx];
    if (lengthKm <= 0 || gainM <= 0) continue;
    const avgGradientPct = (gainM / (lengthKm * 1000)) * 100;
    const isSignificant =
      (lengthKm >= MIN_CLIMB_KM && avgGradientPct >= MIN_CLIMB_GRADIENT_PCT) ||
      (gainM >= MIN_SHORT_CLIMB_GAIN_M && avgGradientPct >= MIN_SHORT_CLIMB_GRADIENT_PCT);
    if (!isSignificant) continue;
    climbs.push({ startKm: distKm[a.idx], lengthKm, elevationGainM: gainM, avgGradientPct });
  }
  return climbs;
}

function fmtGradient(pct: number): string {
  return `${(Math.round(pct * 10) / 10).toString().replace(".", ",")}%`;
}

function describeClimb(c: ClimbSegment): string {
  return `${fmtKm(c.lengthKm)} à ${fmtGradient(c.avgGradientPct)} de moyenne (vers le km ${Math.round(c.startKm)})`;
}

export interface RideProfileInput {
  points: [number, number][];
  elevations: number[];
  distanceKm: number;
  elevationGainM: number;
  hasRealElevation: boolean;
}

/**
 * Genere un texte de description (francais) resumant le relief d'une
 * sortie a partir de sa trace GPX. Pense comme une SUGGESTION prete a
 * etre placee dans le champ description du formulaire, pas comme un texte
 * final : l'admin la complete ensuite (lieu de rendez-vous, consignes...).
 */
export function describeRideProfile(parsed: RideProfileInput): string {
  const intro = `Parcours de ${fmtKm(parsed.distanceKm)} avec ${fmtM(parsed.elevationGainM)} de dénivelé positif.`;

  if (!parsed.hasRealElevation) {
    // Le GPX ne contient pas d'altitude reelle : le denivele affiche est deja
    // une estimation, impossible d'en tirer une analyse fiable du relief.
    return intro;
  }

  const climbs = detectClimbs(parsed.points, parsed.elevations).sort(
    (a, b) => b.elevationGainM - a.elevationGainM
  );

  if (climbs.length === 0) {
    const gainPerKm = parsed.elevationGainM / Math.max(parsed.distanceKm, 0.1);
    const note = gainPerKm < 6 ? "Profil plutôt plat, sans difficulté notable." : "Relief roulant, sans grosse difficulté isolée.";
    return `${intro} ${note}`;
  }

  const top = climbs.slice(0, MAX_CLIMBS_IN_TEXT).sort((a, b) => a.startKm - b.startKm);
  const parts = top.map(describeClimb);

  let climbSentence: string;
  if (parts.length === 1) {
    climbSentence = `Une montée à négocier : ${parts[0]}.`;
  } else {
    const last = parts[parts.length - 1];
    const rest = parts.slice(0, -1).join(", ");
    climbSentence = `Plusieurs montées au programme : ${rest} puis ${last}.`;
  }

  const remaining = climbs.length - top.length;
  const extra =
    remaining > 0 ? ` (+ ${remaining} autre${remaining > 1 ? "s" : ""} bosse${remaining > 1 ? "s" : ""} plus courte${remaining > 1 ? "s" : ""})` : "";

  return `${intro} ${climbSentence}${extra}`;
}
