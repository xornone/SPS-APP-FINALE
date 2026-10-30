"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";

export function RideMap({
  points,
  className = "",
  activePoint,
  activeLabel,
}: {
  points?: [number, number][] | null;
  className?: string;
  activePoint?: [number, number] | null;
  activeLabel?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<any>(null);
  const activeMarkerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || !points || points.length < 2) return;
      const L = await import("leaflet");
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L;

      if (!mapRef.current) {
        mapRef.current = L.map(containerRef.current, {
          zoomControl: true,
          attributionControl: true,
        });
        L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          maxZoom: 20,
          subdomains: ["0", "1", "2", "3"],
          attribution: "© Google Maps",
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

  // Synchronisation du curseur actif (survol sur la courbe de D+)
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    if (!activePoint) {
      if (activeMarkerRef.current) {
        map.removeLayer(activeMarkerRef.current);
        activeMarkerRef.current = null;
      }
      return;
    }

    const markerHtml = `
      <div style="position:relative;display:flex;flex-direction:column;align-items:center;pointer-events:none;">
        ${
          activeLabel
            ? `<div style="
                position:absolute;
                bottom:24px;
                background:rgba(18,11,26,0.92);
                color:#ffffff;
                font-family:system-ui,-apple-system,sans-serif;
                font-size:11px;
                font-weight:800;
                padding:3px 9px;
                border-radius:999px;
                white-space:nowrap;
                box-shadow:0 3px 12px rgba(0,0,0,0.45);
                border:1px solid rgba(255,255,255,0.25);
                letter-spacing:0.01em;
                pointer-events:none;
              ">${activeLabel}</div>`
            : ""
        }
        <div style="
          width:18px;
          height:18px;
          border-radius:50%;
          background:#7C3AED;
          border:3px solid #FFFFFF;
          box-shadow:0 0 0 3.5px rgba(124,58,237,0.45),0 3px 8px rgba(0,0,0,0.5);
        "></div>
      </div>
    `;

    const icon = L.divIcon({
      className: "sps-active-route-cursor",
      html: markerHtml,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (!activeMarkerRef.current) {
      activeMarkerRef.current = L.marker(activePoint, {
        icon,
        zIndexOffset: 3000,
      }).addTo(map);
    } else {
      activeMarkerRef.current.setLatLng(activePoint);
      activeMarkerRef.current.setIcon(icon);
    }

    // Si le curseur sort de l'écran (ex. zoom poussé), recentrage doux
    const bounds = map.getBounds();
    if (bounds && !bounds.contains(activePoint)) {
      map.panTo(activePoint, { animate: true, duration: 0.2 });
    }
  }, [activePoint, activeLabel]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      activeMarkerRef.current = null;
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
