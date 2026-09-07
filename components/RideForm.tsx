"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { parseGpx, type ParsedGpx } from "@/lib/gpx";
import { isKnownPlaceUrl, lookupPlaceUrl } from "@/lib/knownPlaces";
import { describeRideProfile } from "@/lib/rideProfile";
import type { StravaConnection, StravaRouteSummary } from "@/lib/strava";
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

export function RideForm({
  ride,
  stravaConnection = null,
}: {
  ride?: Ride;
  stravaConnection?: StravaConnection | null;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(ride?.title || "");
  const [description, setDescription] = useState(ride?.description || "");
  const [date, setDate] = useState(ride?.ride_date || "");
  const [time, setTime] = useState(ride?.ride_time?.slice(0, 5) || "");
  const [place, setPlace] = useState(ride?.place || "");
  const [placeUrl, setPlaceUrl] = useState(ride?.place_url || "");
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

  const [stravaImporting, setStravaImporting] = useState(false);
  const [stravaImportError, setStravaImportError] = useState("");
  const [stravaRoutes, setStravaRoutes] = useState<StravaRouteSummary[]>([]);
  const [stravaRoutesError, setStravaRoutesError] = useState("");

  // Liste les traces (routes) enregistrees sur le compte Strava connecte,
  // pour un choix rapide dans un menu deroulant plutot que de devoir aller
  // copier/coller le lien depuis Strava a chaque fois.
  useEffect(() => {
    if (!stravaConnection) return;
    let cancelled = false;
    fetch("/api/admin/strava/routes")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.routes) setStravaRoutes(data.routes);
        else setStravaRoutesError(data.error || "Impossible de récupérer tes traces Strava.");
      })
      .catch(() => {
        if (!cancelled) setStravaRoutesError("Impossible de récupérer tes traces Strava.");
      });
    return () => {
      cancelled = true;
    };
  }, [stravaConnection]);

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

  // Recupere le trace directement depuis Strava (toujours le propre compte
  // de l'admin connecte, jamais celui d'un autre) plutot que de demander a
  // l'admin d'exporter puis reimporter un fichier .gpx a la main. Reutilise
  // ensuite exactement le meme chemin que handleFileChange une fois le GPX
  // genere cote serveur. `urlOverride` permet de lancer l'import juste
  // apres avoir choisi une trace dans le menu deroulant, sans attendre que
  // `stravaUrl` se mette a jour (evite une valeur perimee).
  async function handleStravaImport(urlOverride?: string) {
    const url = (urlOverride ?? stravaUrl).trim();
    if (!stravaConnection || !url) return;
    setStravaImporting(true);
    setStravaImportError("");
    try {
      const res = await fetch("/api/admin/strava/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const parsed = parseGpx(data.gpxText);
      if (!parsed) throw new Error("Trace Strava illisible.");

      const file = new File([data.gpxText], `strava-${data.stravaId}.gpx`, { type: "application/gpx+xml" });
      setGpxFile(file);
      setGpxFileName(file.name);
      setError("");
      setPreview(parsed);
      setDistance((Math.round(parsed.distanceKm * 10) / 10).toString());
      setElevation(Math.round(parsed.elevationGainM).toString());
      setDescription((prev) => prependGenerated(prev, describeRideProfile(parsed)));
    } catch (err: any) {
      setStravaImportError(err?.message || "Import Strava impossible.");
    } finally {
      setStravaImporting(false);
    }
  }

  function handleRouteSelect(routeId: string) {
    if (!routeId) return;
    const url = `https://www.strava.com/routes/${routeId}`;
    setStravaUrl(url);
    handleStravaImport(url);
  }

  // Pre-remplit automatiquement le lien du lieu quand son nom correspond a
  // un lieu de rendez-vous connu du club (voir lib/knownPlaces.ts). On ne
  // touche jamais a un lien deja saisi a la main : seuls un champ vide, ou
  // un lien lui-meme issu d'un lieu connu (l'admin change d'avis sur le
  // lieu apres coup), sont mis a jour.
  function handlePlaceBlur() {
    const known = lookupPlaceUrl(place);
    if (!known) return;
    if (!placeUrl.trim() || isKnownPlaceUrl(placeUrl)) setPlaceUrl(known);
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

    const payload = { title, description, ride_date: date, ride_time: time, place, place_url: placeUrl.trim(), distance_km: distance, elevation_gain_m: elevation, strava_url: stravaUrl.trim(), groups };

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
          onBlur={handlePlaceBlur}
          placeholder="Adresse ou coordonnées GPS"
          className="input"
        />
      </Field>
      <Field label="Lien du lieu de départ (optionnel)">
        <input
          type="url"
          value={placeUrl}
          onChange={(e) => setPlaceUrl(e.target.value)}
          placeholder="https://maps.google.com/…"
          className="input"
        />
      </Field>
      <Field label="Lien Strava (optionnel)">
        <input
          type="url"
          value={stravaUrl}
          onChange={(e) => setStravaUrl(e.target.value)}
          placeholder="https://www.strava.com/routes/… ou /activities/…"
          className="input"
        />
        {stravaConnection && (
          <div className="mt-2 flex flex-col gap-1.5">
            {stravaRoutes.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => handleRouteSelect(e.target.value)}
                className="input py-2 text-xs"
              >
                <option value="" disabled>
                  Choisir une trace enregistrée sur ton compte…
                </option>
                {stravaRoutes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {r.distanceKm} km, {r.elevationGainM} m D+
                  </option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-2">
              <span className="flex-none text-[11px] text-black/45 dark:text-white/45">
                {stravaConnection.athleteName}
              </span>
              <button
                type="button"
                onClick={() => handleStravaImport()}
                disabled={stravaImporting || !stravaUrl.trim()}
                className="flex-1 rounded-xl border-[1.5px] border-sps-violet600 px-3 py-2 text-xs font-bold text-sps-violet600 disabled:opacity-50 dark:border-sps-violet400 dark:text-sps-violet400"
              >
                {stravaImporting ? "Import en cours…" : "🔄 Importer le tracé depuis le lien"}
              </button>
            </div>
            {stravaRoutesError && <p className="text-[11px] text-black/35 dark:text-white/35">{stravaRoutesError}</p>}
          </div>
        )}
        {!stravaConnection && (
          <p className="mt-1.5 text-[11px] text-black/35 dark:text-white/35">
            Ton compte Strava n’est pas connecté — connecte-le depuis la page Administration pour activer l’import
            automatique.
          </p>
        )}
        {stravaImportError && <p className="mt-1.5 text-[11px] text-red-500">{stravaImportError}</p>}
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
