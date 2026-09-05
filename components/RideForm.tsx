"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseGpx, type ParsedGpx } from "@/lib/gpx";
import { describeRideProfile } from "@/lib/rideProfile";
import { GROUP_INFO, type GroupLevel, type Ride } from "@/lib/types";
import { RideMap } from "./RideMap";
import { Icon } from "./Icons";

const ALL_GROUPS: GroupLevel[] = ["vert", "rouge", "violet"];

// Place le texte genere au debut de la description, sans jamais effacer ce
// que l'admin a deja saisi (qui reste tel quel, en dessous).
function prependGenerated(current: string, generated: string): string {
  const trimmed = current.trim();
  return trimmed ? `${generated}\n\n${trimmed}` : generated;
}

export function RideForm({ ride }: { ride?: Ride }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(ride?.title || "");
  const [description, setDescription] = useState(ride?.description || "");
  const [date, setDate] = useState(ride?.ride_date || "");
  const [time, setTime] = useState(ride?.ride_time?.slice(0, 5) || "");
  const [place, setPlace] = useState(ride?.place || "");
  const [distance, setDistance] = useState(ride ? String(ride.distance_km) : "");
  const [elevation, setElevation] = useState(ride ? String(ride.elevation_gain_m) : "");
  const [stravaUrl, setStravaUrl] = useState(ride?.strava_url || "");
  const [groups, setGroups] = useState<GroupLevel[]>(
    ride?.ride_groups?.map((g) => g.group_level) || ["vert", "rouge"]
  );
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [gpxFileName, setGpxFileName] = useState(ride?.gpx_path ? ride.gpx_path.split("/").pop() : "");
  const [preview, setPreview] = useState<ParsedGpx | null>(
    ride?.route_points ? { points: ride.route_points, elevations: ride.route_elevations || [], distanceKm: ride.distance_km, elevationGainM: ride.elevation_gain_m, hasRealElevation: true } : null
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleGroup(g: GroupLevel) {
    setGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setGpxFile(file);
    setGpxFileName(file.name);
    const text = await file.text();
    const parsed = parseGpx(text);
    if (!parsed) {
      setError("Fichier GPX invalide.");
      return;
    }
    setError("");
    setPreview(parsed);
    setDistance((Math.round(parsed.distanceKm * 10) / 10).toString());
    setElevation(Math.round(parsed.elevationGainM).toString());
    // Ajoute l'analyse du parcours au DEBUT de la description, sans jamais
    // effacer ce que l'admin a deja ecrit (qui reste en dessous).
    setDescription((prev) => prependGenerated(prev, describeRideProfile(parsed)));
  }

  function regenerateDescription() {
    if (preview) setDescription((prev) => prependGenerated(prev, describeRideProfile(preview)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!groups.length) {
      setError("Sélectionne au moins un groupe.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = { title, description, ride_date: date, ride_time: time, place, distance_km: distance, elevation_gain_m: elevation, strava_url: stravaUrl.trim(), groups };

    try {
      let rideId = ride?.id;
      if (rideId) {
        const res = await fetch(`/api/admin/rides/${rideId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await fetch(`/api/admin/rides`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        rideId = data.ride.id;
      }

      if (gpxFile && rideId) {
        const fd = new FormData();
        fd.append("file", gpxFile);
        const res = await fetch(`/api/admin/rides/${rideId}/gpx`, { method: "POST", body: fd });
        if (!res.ok) throw new Error((await res.json()).error);
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="pb-8">
      <Field label="Titre de la sortie">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sortie dimanche – Pic Saint-Loup"
          className="input"
        />
      </Field>
      <div className="px-5 pb-3.5">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="block text-[12px] font-extrabold uppercase tracking-wide text-black/45 dark:text-white/45">
            Description
          </label>
          {preview && (
            <button
              type="button"
              onClick={regenerateDescription}
              className="text-[11px] font-bold text-sps-violet600 dark:text-sps-violet400"
            >
              ✨ Générer depuis le parcours
            </button>
          )}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Présentez la sortie, les difficultés, le point de rendez-vous…"
          rows={4}
          className="input resize-y"
        />
        {preview && (
          <p className="mt-1 text-[11px] text-black/35 dark:text-white/35">
            Suggestion générée à partir du GPX (montées détectées) — à relire et compléter (lieu de rendez-vous, consignes…).
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 px-5 pb-3.5">
        <Field label="Date" bare>
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
        </Field>
        <Field label="Heure de départ" bare>
          <input required type="time" value={time} onChange={(e) => setTime(e.target.value)} className="input" />
        </Field>
      </div>
      <Field label="Lieu de départ">
        <input
          required
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Adresse ou coordonnées GPS"
          className="input"
        />
      </Field>
      <Field label="Lien Strava (optionnel)">
        <input
          type="url"
          value={stravaUrl}
          onChange={(e) => setStravaUrl(e.target.value)}
          placeholder="https://www.strava.com/routes/…"
          className="input"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3 px-5 pb-3.5">
        <Field label="Distance (km)" bare>
          <input required type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} className="input" />
        </Field>
        <Field label="D+ (m)" bare>
          <input required type="number" value={elevation} onChange={(e) => setElevation(e.target.value)} className="input" />
        </Field>
      </div>

      <div className="px-5 pb-3.5">
        <label className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide text-black/45 dark:text-white/45">
          Groupes disponibles
        </label>
        <div className="flex gap-2">
          {ALL_GROUPS.map((g) => {
            const info = GROUP_INFO[g];
            const checked = groups.includes(g);
            return (
              <button
                type="button"
                key={g}
                onClick={() => toggleGroup(g)}
                className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border-[1.5px] px-1 py-2.5 text-[11px] font-extrabold"
                style={{
                  color: info.hex,
                  borderColor: checked ? info.hex : "rgba(0,0,0,.08)",
                  background: checked ? `${info.hex}1A` : "transparent",
                }}
              >
                <b className="text-[12.5px]">{info.label}</b>
                {info.range}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 pb-2">
        <label className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide text-black/45 dark:text-white/45">
          Fichier GPX
        </label>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          className="flex w-full flex-col items-center gap-1 rounded-2xl border-[1.5px] border-dashed border-black/15 bg-black/[0.02] py-5 dark:border-white/15 dark:bg-white/[0.03]"
        >
          <Icon name="gpx" size={26} />
          <span className="text-xs text-black/45 dark:text-white/45">
            {ride?.gpx_path ? "GPX déjà importé — touchez pour le remplacer" : "Importer un fichier .gpx"}
          </span>
          {gpxFileName && <span className="text-xs font-bold text-sps-violet600 dark:text-sps-violet400">{gpxFileName}</span>}
        </button>
        <input ref={fileInput} type="file" accept=".gpx" onChange={handleFileChange} className="hidden" />
      </div>

      {preview && (
        <div className="mx-5 mb-4 h-[150px] overflow-hidden rounded-2xl border border-black/[0.06] dark:border-white/10">
          <RideMap points={preview.points} className="h-full w-full" />
        </div>
      )}

      {error && <p className="px-5 pb-3 text-xs text-red-500">{error}</p>}

      <div className="px-5">
        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sps-violet500 to-sps-violet700 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60"
        >
          <Icon name="check" size={16} /> {saving ? "Enregistrement…" : ride ? "Enregistrer les modifications" : "Créer la sortie"}
        </button>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          padding: 12px 13px;
          border-radius: 12px;
          border: 1.5px solid rgba(0, 0, 0, 0.1);
          background: white;
          color: #150f1c;
          font-size: 13.5px;
          font-family: inherit;
        }
        .input::placeholder {
          color: rgba(21, 15, 28, 0.4);
        }
        .dark .input {
          background: #1a1422;
          border-color: rgba(255, 255, 255, 0.12);
          color: white;
        }
        .dark .input::placeholder {
          color: rgba(255, 255, 255, 0.35);
        }
      `}</style>
    </form>
  );
}

function Field({ label, children, bare = false }: { label: string; children: React.ReactNode; bare?: boolean }) {
  if (bare) {
    return (
      <div>
        <label className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide text-black/45 dark:text-white/45">
          {label}
        </label>
        {children}
      </div>
    );
  }
  return (
    <div className="px-5 pb-3.5">
      <label className="mb-1.5 block text-[12px] font-extrabold uppercase tracking-wide text-black/45 dark:text-white/45">
        {label}
      </label>
      {children}
    </div>
  );
}
