"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

interface LiveTrackingMapProps {
  deliveryAddress: string;
  // Simulated courier position — in production, this would come from a
  // realtime Supabase channel where the courier's app pushes location updates
  courierPosition?: [number, number] | null;
}

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { "Accept-Language": "en" } }
    );
    const data = await res.json();
    if (data?.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  } catch {}
  return null;
}

export function LiveTrackingMap({ deliveryAddress, courierPosition }: LiveTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const courierMarkerRef = useRef<Marker | null>(null);

  // Build map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let destroyed = false;

    const buildMap = async () => {
      const L = (await import("leaflet")).default;
      if (destroyed || !containerRef.current || mapRef.current) return;

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

      // Geocode delivery address for destination pin
      const destCoords = await geocodeAddress(deliveryAddress);
      const center = destCoords ?? [33.5731, -7.5898];

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
      }).setView(center, 14);

      mapRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);

      // Destination marker (house pin)
      if (destCoords) {
        const destIcon = L.divIcon({
          className: "",
          html: `<div style="background:#10b981;color:white;border-radius:50% 50% 50% 0;width:32px;height:32px;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 12px rgba(16,185,129,0.4);">
                   <span style="transform:rotate(45deg);font-size:14px;">🏠</span>
                 </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
        L.marker(destCoords, { icon: destIcon }).addTo(map);
      }

      // Courier marker (or simulated position)
      const initialCourierPos: [number, number] = courierPosition ?? [
        center[0] - 0.01,
        center[1] + 0.008,
      ];

      const courierIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:48px;height:48px;display:flex;align-items:center;justify-content:center;">
                 <div style="position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(99,102,241,0.15);animation:pulse-ring 2s ease-out infinite;"></div>
                 <div style="width:28px;height:28px;border-radius:50%;background:#6366f1;border:3px solid white;box-shadow:0 0 12px rgba(99,102,241,0.6);display:flex;align-items:center;justify-content:center;font-size:13px;">🛵</div>
               </div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      });

      const marker = L.marker(initialCourierPos, { icon: courierIcon }).addTo(map);
      courierMarkerRef.current = marker;

      // Route line
      if (destCoords) {
        L.polyline([initialCourierPos, destCoords], {
          color: "#6366f1",
          weight: 3,
          dashArray: "6 6",
          opacity: 0.7,
        }).addTo(map);

        map.fitBounds([initialCourierPos, destCoords], { padding: [40, 40] });
      }
    };

    buildMap();
    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live update courier marker when position changes
  useEffect(() => {
    if (courierPosition && courierMarkerRef.current) {
      courierMarkerRef.current.setLatLng(courierPosition);
    }
  }, [courierPosition]);

  return (
    <div className="relative w-full h-52 rounded-3xl overflow-hidden shadow-sm border border-slate-100">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-sm">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-xs font-semibold text-slate-700">Live tracking</span>
      </div>
    </div>
  );
}
