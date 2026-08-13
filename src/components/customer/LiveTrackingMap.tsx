"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker, Polyline } from "leaflet";

interface LiveTrackingMapProps {
  deliveryAddress: string;
  orderStatus?: string;
}

interface CourierPosition {
  lat: number;
  lng: number;
  ts: number;
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

function readCourierPosition(): CourierPosition | null {
  try {
    const raw = localStorage.getItem("courier_position");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CourierPosition;
    // Discard if older than 60 seconds (courier went offline)
    if (Date.now() - parsed.ts > 60000) return null;
    return parsed;
  } catch {
    return null;
  }
}

function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function LiveTrackingMap({ deliveryAddress, orderStatus }: LiveTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const courierMarkerRef = useRef<Marker | null>(null);
  const routeLineRef = useRef<Polyline | null>(null);
  const destCoordsRef = useRef<[number, number] | null>(null);
  const [courierPos, setCourierPos] = useState<CourierPosition | null>(null);
  const [distanceMetres, setDistanceMetres] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Build map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let destroyed = false;

    const buildMap = async () => {
      const L = (await import("leaflet")).default;
      if (destroyed || !containerRef.current || mapRef.current) return;

      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

      const destCoords = await geocodeAddress(deliveryAddress);
      destCoordsRef.current = destCoords;
      const center = destCoords ?? [33.5731, -7.5898];

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
        doubleClickZoom: false,
      }).setView(center as [number, number], 15);

      mapRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);

      // Customer destination marker
      if (destCoords) {
        const destIcon = L.divIcon({
          className: "",
          html: `<div style="background:#10b981;color:white;border-radius:50% 50% 50% 0;width:36px;height:36px;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 14px rgba(16,185,129,0.45);">
                   <span style="transform:rotate(45deg);font-size:16px;">🏠</span>
                 </div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 36],
        });
        L.marker(destCoords, { icon: destIcon }).addTo(map)
          .bindPopup("<b>Your location</b>", { closeButton: false });
      }

      // Courier marker (placed at real or estimated position)
      const realPos = readCourierPosition();
      const initialCourierPos: [number, number] = realPos
        ? [realPos.lat, realPos.lng]
        : destCoords
        ? [destCoords[0] - 0.012, destCoords[1] + 0.01]
        : [center[0] - 0.012, center[1] + 0.01];

      const courierIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center;">
                 <div style="position:absolute;width:50px;height:50px;border-radius:50%;background:rgba(99,102,241,0.15);animation:pulse-ring 2s ease-out infinite;"></div>
                 <div style="width:32px;height:32px;border-radius:50%;background:#6366f1;border:3px solid white;box-shadow:0 0 14px rgba(99,102,241,0.55);display:flex;align-items:center;justify-content:center;font-size:15px;">🛵</div>
               </div>`,
        iconSize: [52, 52],
        iconAnchor: [26, 26],
      });

      const marker = L.marker(initialCourierPos, { icon: courierIcon }).addTo(map)
        .bindPopup("<b>Your courier</b>", { closeButton: false });
      courierMarkerRef.current = marker;

      // Dashed route line
      if (destCoords) {
        const line = L.polyline([initialCourierPos, destCoords], {
          color: "#6366f1", weight: 3, dashArray: "8 6", opacity: 0.65,
        }).addTo(map);
        routeLineRef.current = line;
        map.fitBounds([initialCourierPos, destCoords], { padding: [50, 50] });
      }
    };

    buildMap();
    return () => {
      destroyed = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll localStorage for courier position every 3 seconds
  useEffect(() => {
    const poll = () => {
      const pos = readCourierPosition();
      setCourierPos(pos);
      setIsLive(pos !== null);
    };

    poll(); // immediate
    const interval = setInterval(poll, 3000);

    // Also listen for storage events (same-device multi-tab)
    const onStorage = (e: StorageEvent) => {
      if (e.key === "courier_position") poll();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // Update map when courier position changes
  useEffect(() => {
    if (!courierPos || !courierMarkerRef.current || !mapRef.current) return;

    const latlng: [number, number] = [courierPos.lat, courierPos.lng];
    courierMarkerRef.current.setLatLng(latlng);

    // Update route line
    if (routeLineRef.current && destCoordsRef.current) {
      routeLineRef.current.setLatLngs([latlng, destCoordsRef.current]);
    }

    // Calculate and display distance
    if (destCoordsRef.current) {
      const m = haversineMetres(latlng[0], latlng[1], destCoordsRef.current[0], destCoordsRef.current[1]);
      setDistanceMetres(m);
    }
  }, [courierPos]);

  const distanceLabel = distanceMetres === null
    ? null
    : distanceMetres < 50
    ? "Almost there!"
    : distanceMetres < 1000
    ? `${Math.round(distanceMetres)} m away`
    : `${(distanceMetres / 1000).toFixed(1)} km away`;

  const statusLabel = orderStatus === "arrived"
    ? "Courier has arrived 📍"
    : orderStatus === "picked_up" || orderStatus === "out_for_delivery"
    ? "On the way to you 🛵"
    : "Live Tracking";

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-sm border border-slate-100" style={{ height: "260px" }}>
      <div ref={containerRef} className="w-full h-full" />

      {/* Live indicator */}
      <div className="absolute top-3 left-3 z-10">
        <div className={`flex items-center gap-2 backdrop-blur-md rounded-xl px-3 py-1.5 shadow-sm text-xs font-semibold ${
          isLive ? "bg-white/90 text-slate-700" : "bg-white/70 text-slate-400"
        }`}>
          <span className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-500 animate-pulse" : "bg-slate-300"}`} />
          {isLive ? statusLabel : "Locating courier…"}
        </div>
      </div>

      {/* Distance badge */}
      {distanceLabel && isLive && (
        <div className="absolute top-3 right-3 z-10 bg-indigo-600 text-white rounded-xl px-3 py-1.5 text-xs font-black shadow-lg shadow-indigo-600/30">
          {distanceLabel}
        </div>
      )}

      {/* Arrived banner */}
      {orderStatus === "arrived" && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-emerald-500 text-white text-center py-2.5 text-sm font-black">
          🛵 Your courier is at your door!
        </div>
      )}
    </div>
  );
}
