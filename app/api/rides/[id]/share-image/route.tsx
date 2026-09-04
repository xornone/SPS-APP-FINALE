import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { fetchRide } from "@/lib/queries";
import { fmtDateLong, fmtKm, fmtM, fmtTime } from "@/lib/format";
import { buildRoutePath } from "@/lib/routeShape";
import { GROUP_INFO, type GroupLevel } from "@/lib/types";

// Image de partage pour une sortie : trace GPX stylise (juste la forme,
// sans fond de carte reelle — pas de tuiles a recuperer/assembler, donc
// simple et fiable sur un hebergement gratuit) + titre, date, lieu,
// distance/D+ et groupes. Rendu via next/og (Satori + resvg, deja fourni
// par Next.js, aucune dependance ni cle API supplementaire), avec la
// police par defaut integree (pas d'appel reseau a une police externe au
// moment de la requete).
export const runtime = "nodejs";

const SIZE = 1080;
const PADDING = 72;

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const ride = await fetchRide(supabase, params.id);
  if (!ride) return new Response("Sortie introuvable.", { status: 404 });

  const groups = (ride.ride_groups || []).map((g) => g.group_level);
  const routeBoxW = SIZE - PADDING * 2;
  const routeBoxH = 400;
  const routePath =
    ride.route_points && ride.route_points.length > 1 ? buildRoutePath(ride.route_points, routeBoxW, routeBoxH) : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #5B21B6, #33124F)",
          padding: PADDING,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, opacity: 0.75 }}>SPS</div>

        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 52,
            lineHeight: 1.15,
            maxHeight: 190,
            overflow: "hidden",
          }}
        >
          {ride.title}
        </div>

        <div style={{ display: "flex", marginTop: 18, fontSize: 27, opacity: 0.85 }}>
          {fmtDateLong(ride.ride_date)} à {fmtTime(ride.ride_time)}
        </div>
        <div style={{ display: "flex", fontSize: 24, opacity: 0.65, marginTop: 4 }}>{ride.place}</div>

        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "center" }}>
          {routePath ? (
            <svg width={routeBoxW} height={routeBoxH} viewBox={`0 0 ${routeBoxW} ${routeBoxH}`}>
              <path
                d={routePath}
                fill="none"
                stroke="white"
                strokeWidth={9}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.95}
              />
            </svg>
          ) : (
            <div style={{ display: "flex", fontSize: 24, opacity: 0.5 }}>Aucun tracé GPX importé</div>
          )}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          <Chip value={fmtKm(ride.distance_km)} label="Distance" />
          <Chip value={fmtM(ride.elevation_gain_m)} label="D+" />
          {groups.map((g) => (
            <GroupChip key={g} group={g} />
          ))}
        </div>
      </div>
    ),
    {
      width: SIZE,
      height: SIZE,
      headers: { "Cache-Control": "public, max-age=1800" },
    }
  );
}

function Chip({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "rgba(255,255,255,0.14)",
        borderRadius: 18,
        padding: "14px 22px",
      }}
    >
      <div style={{ display: "flex", fontSize: 30 }}>{value}</div>
      <div style={{ display: "flex", fontSize: 15, opacity: 0.7, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}
      </div>
    </div>
  );
}

function GroupChip({ group }: { group: GroupLevel }) {
  const info = GROUP_INFO[group];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        background: "rgba(255,255,255,0.14)",
        borderRadius: 18,
        padding: "14px 20px",
      }}
    >
      <div style={{ display: "flex", width: 14, height: 14, borderRadius: 7, background: info.hex }} />
      <div style={{ display: "flex", fontSize: 20 }}>{info.label}</div>
    </div>
  );
}
