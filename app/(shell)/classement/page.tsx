import { createClient } from "@/lib/supabase/server";
import { fetchAllParticipations, fetchRides } from "@/lib/queries";
import { Avatar } from "@/components/Avatar";
import { GROUP_INFO, type GroupLevel } from "@/lib/types";
import { isPastDate } from "@/lib/format";

interface Row {
  displayName: string;
  count: number;
  km: number;
  elevation: number;
  favGroup?: GroupLevel;
}

export default async function ClassementPage() {
  const supabase = createClient();
  const [rides, participations] = await Promise.all([fetchRides(supabase), fetchAllParticipations(supabase)]);

  const ridesById = new Map(rides.map((r) => [r.id, r]));
  const past = participations
    .map((p) => ({ ...p, ride: ridesById.get(p.ride_id) }))
    .filter((p) => p.ride && isPastDate(p.ride.ride_date));

  // Regroupement par nom normalisé (espaces/casse) — c'est le seul moyen de
  // consolider "les mêmes personnes" sans compte ; deux membres homonymes
  // partageront la même ligne, ce qui est le compromis assumé de ce modèle.
  const byName = new Map<string, Row & { groupFreq: Record<string, number> }>();
  past.forEach((p) => {
    const key = p.participant_name.trim().toLowerCase();
    if (!key) return;
    const existing = byName.get(key) || {
      displayName: p.participant_name.trim(),
      count: 0,
      km: 0,
      elevation: 0,
      groupFreq: {},
    };
    existing.count += 1;
    existing.km += p.ride!.distance_km;
    existing.elevation += p.ride!.elevation_gain_m;
    existing.groupFreq[p.group_level] = (existing.groupFreq[p.group_level] || 0) + 1;
    existing.displayName = p.participant_name.trim(); // garde la dernière casse utilisée
    byName.set(key, existing);
  });

  const rows: Row[] = Array.from(byName.values())
    .map((r) => ({
      ...r,
      favGroup: (Object.entries(r.groupFreq).sort((a, b) => b[1] - a[1])[0]?.[0] as GroupLevel) || undefined,
    }))
    .sort((a, b) => b.count - a.count || b.km - a.km)
    .slice(0, 20);

  // Activité club (km cumulés, tous participants, 6 derniers mois)
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
        <h1 className="font-display text-[26px] tracking-wide">Classement</h1>
        <p className="text-[12.5px] text-black/45 dark:text-white/45">
          Nombre de sorties réalisées, par nom déclaré à l&apos;inscription.
        </p>
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
        <h2 className="font-display text-xl tracking-wide">Les plus assidus</h2>
      </div>
      <div className="mx-5 mb-6 overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/10 dark:bg-[#1A1422]">
        {rows.length === 0 ? (
          <p className="p-6 text-center text-sm text-black/40 dark:text-white/40">
            Aucune sortie réalisée pour le moment.
          </p>
        ) : (
          rows.map((r, i) => (
            <div key={r.displayName} className="flex items-center gap-3 border-b border-black/[0.05] px-4 py-3 last:border-0 dark:border-white/[0.06]">
              <span className="w-5 flex-none text-center font-display text-base text-black/35 dark:text-white/35">{i + 1}</span>
              <Avatar name={r.displayName} seed={r.displayName} size="sm" />
              <div className="min-w-0 flex-1">
                <b className="block truncate text-[13.5px] font-bold">{r.displayName}</b>
                <span className="text-[11.5px] text-black/45 dark:text-white/45">
                  {r.count} sortie{r.count > 1 ? "s" : ""} · {Math.round(r.km)} km
                  {r.favGroup && (
                    <>
                      {" · "}
                      <span style={{ color: GROUP_INFO[r.favGroup].hex }} className="font-bold">
                        {GROUP_INFO[r.favGroup].label}
                      </span>
                    </>
                  )}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
