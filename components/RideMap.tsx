"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

export function RideMap({
  points,
  className = "",
}: {
  points: [number, number][] | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || !points || points.length < 2) return;
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap",
        }).addTo(mapRef.current);
      }

      const map = mapRef.current;
      map.eachLayer((layer) => {
        if ((layer as any)._isRoute) map.removeLayer(layer);
      });

      const line = L.polyline(points, { color: "#7C3AED", weight: 5, lineJoin: "round" });
      (line as any)._isRoute = true;
      line.addTo(map);

      const startIcon = L.divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#1F9D63;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      const startMarker = L.marker(points[0], { icon: startIcon });
      (startMarker as any)._isRoute = true;
      startMarker.addTo(map);

      map.fitBounds(line.getBounds(), { padding: [24, 24] });
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [points]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  if (!points || points.length < 2) {
    return (
      <div className={`flex items-center justify-center bg-black/[0.03] text-sm text-black/40 dark:bg-white/5 dark:text-white/40 ${className}`}>
        Aucun tracé GPX importé pour cette sortie.
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
