import { createClient } from "@/lib/supabase/server";
import { fetchAllParticipations, fetchRides } from "@/lib/queries";
import { isPastDate } from "@/lib/format";

// Page volontairement collective : aucun classement nominatif des membres,
// uniquement des chiffres qui mettent en avant le club dans son ensemble.
export default async function ClassementPage() {
  const supabase = createClient();
  const [rides, participations] = await Promise.all([fetchRides(supabase), fetchAllParticipations(supabase)]);

  const ridesById = new Map(rides.map((r) => [r.id, r]));
  const past = participations
    .map((p) => ({ ...p, ride: ridesById.get(p.ride_id) }))
    .filter((p) => p.ride && isPastDate(p.ride.ride_date));

  // Km cumules parcourus par l'ensemble des membres : chaque inscription a
  // une sortie passee ajoute la distance de cette sortie au total (une
  // sortie avec 8 participants compte 8 fois sa distance).
  const totalKm = past.reduce((sum, p) => sum + (p.ride?.distance_km || 0), 0);
  const totalRidesOrganized = rides.length;

  // Sorties proposees par le club, par annee (toutes les sorties creees,
  // passees comme a venir).
  const perYear = new Map<number, number>();
  rides.forEach((r) => {
    const year = Number(r.ride_date.slice(0, 4));
    if (!Number.isNaN(year)) perYear.set(year, (perYear.get(year) || 0) + 1);
  });
  const yearRows = Array.from(perYear.entries()).sort((a, b) => b[0] - a[0]);
  const maxYearCount = Math.max(...yearRows.map(([, c]) => c), 1);

  // Activite club (km cumules, tous participants, 6 derniers mois)
  const now = new Date();
  const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const buckets: { label: string; km: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ label: MONTHS[dt.getMonth()], km: 0 });
  }
  past.forEach((p) => {
    const [y, m] = p.ride!.ride_date.split("-").map(Number);
    const idx = buckets.length - 1 - (now.getFullYear() * 12 + now.getMonth() - (y * 12 + (m - 1)));
    if (idx >= 0 && idx < buckets.length) buckets[idx].km += p.ride!.distance_km;
  });
  const maxKm = Math.max(...buckets.map((b) => b.km), 1);

  return (
    <div>
      <div className="px-5 pb-1 pt-5">
        <h1 className="font-display text-[26px] tracking-wide">Statistique SPS</h1>
        <p className="text-[12.5px] text-black/45 dark:text-white/45">Les chiffres du club, tous membres confondus.</p>
      </div>

      <div className="flex gap-2.5 px-5 py-4">
        <ClubStat value={`${Math.round(totalKm).toLocaleString("fr-FR")} km`} label="Parcourus par les membres" />
        <ClubStat value={String(totalRidesOrganized)} label="Sorties organisées" />
      </div>

      <div className="px-5 py-3">
        <h2 className="font-display text-xl tracking-wide">Activité du club</h2>
      </div>
      <div className="mx-5 mb-5 rounded-2xl border border-black/[0.06] bg-white px-2.5 pb-2.5 pt-3.5 dark:border-white/10 dark:bg-[#1A1422]">
        <div className="flex h-[90px] items-end gap-2.5">
          {buckets.map((b, i) => (
            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
              <div
                className="w-full max-w-[26px] rounded-t-md rounded-b-[3px] bg-gradient-to-b from-sps-violet400 to-sps-violet600"
                style={{ height: `${Math.max(6, (b.km / maxKm) * 100)}%` }}
                title={`${Math.round(b.km)} km`}
              />
              <span className="text-[10px] font-bold text-black/35 dark:text-white/35">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-1.5">
        <h2 className="font-display text-xl tracking-wide">Sorties par année</h2>
      </div>
      <div className="mx-5 mb-6 overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#1A1422]">
        {yearRows.length === 0 ? (
          <p className="p-6 text-center text-sm text-black/40 dark:text-white/40">Aucune sortie proposée pour le moment.</p>
        ) : (
          yearRows.map(([year, count]) => (
            <div
              key={year}
              className="flex items-center gap-3 border-b border-black/[0.05] px-4 py-3 last:border-0 dark:border-white/[0.06]"
            >
              <span className="w-12 flex-none font-display text-base">{year}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/[0.05] dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sps-violet400 to-sps-violet600"
                  style={{ width: `${Math.max(6, (count / maxYearCount) * 100)}%` }}
                />
              </div>
              <span className="w-20 flex-none text-right text-[12.5px] text-black/45 dark:text-white/45">
                {count} sortie{count > 1 ? "s" : ""}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ClubStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-black/[0.06] bg-white py-3.5 text-center dark:border-white/10 dark:bg-[#1A1422]">
      <span className="block font-display text-[20px] leading-none">{value}</span>
      <span className="mt-1.5 block px-1 text-[10px] uppercase leading-tight tracking-wide text-black/35 dark:text-white/35">
        {label}
      </span>
    </div>
  );
}
