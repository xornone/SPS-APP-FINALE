export type GroupLevel = "vert" | "rouge" | "violet";

export const GROUP_INFO: Record<GroupLevel, { label: string; range: string; flat: string; hex: string }> = {
  vert: { label: "Vert", range: "24–26 km/h", flat: "≈29–30 km/h sur le plat", hex: "#1F9D63" },
  rouge: { label: "Rouge", range: "26–28 km/h", flat: "≈33–34 km/h sur le plat", hex: "#DC3D3D" },
  violet: { label: "Violet", range: "28+ km/h", flat: "≈37–38 km/h sur le plat", hex: "#7C3AED" },
};

export interface RideGroup {
  ride_id: string;
  group_level: GroupLevel;
  target_speed: string;
}

export interface Ride {
  id: string;
  title: string;
  description: string;
  ride_date: string; // YYYY-MM-DD
  ride_time: string; // HH:MM:SS
  place: string;
  place_url: string | null;
  distance_km: number;
  elevation_gain_m: number;
  strava_url: string | null;
  gpx_path: string | null;
  route_points: [number, number][] | null; // [lat, lon]
  route_elevations: number[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  ride_groups?: RideGroup[];
}

// Une inscription = juste un nom + un groupe, sans compte. `id` sert de
// jeton de reconciliation cote client (localStorage) pour retrouver "ma"
// participation d'un navigateur a l'autre chargement de page.
export interface Participation {
  id: string;
  ride_id: string;
  participant_name: string;
  group_level: GroupLevel;
  created_at: string;
}

export interface RideComment {
  id: string;
  ride_id: string;
  author_name: string;
  message: string;
  created_at: string;
}

export interface Notification {
  id: string;
  kind: "ride_created" | "ride_updated" | "ride_cancelled" | "new_participant";
  ride_id: string | null;
  message: string;
  created_at: string;
}
