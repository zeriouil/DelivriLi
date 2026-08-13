"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, DivIcon } from "leaflet";

interface AnimatedMapProps {
  address: string;
  // Fallback coordinates if geocoding fails (default: Casablanca)
  fallbackLat?: number;
  fallbackLng?: number;
}

// Casablanca city center as default
const DEFAULT_LAT = 33.5731;
const DEFAULT_LNG = -7.5898;

export function AnimatedMap({ address, fallbackLat = DEFAULT_LAT, fallbackLng = DEFAULT_LNG }: AnimatedMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Try to geocode the address using OpenStreetMap's Nominatim API (free, no key needed)
  useEffect(() => {
    if (!address) {
      setCoords({ lat: fallbackLat, lng: fallbackLng });
      setIsLoading(false);
      return;
    }
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        } else {
          setCoords({ lat: fallbackLat, lng: fallbackLng });
        }
      })
      .catch(() => setCoords({ lat: fallbackLat, lng: fallbackLng }))
      .finally(() => setIsLoading(false));
  }, [address, fallbackLat, fallbackLng]);

  // Initialize Leaflet map once we have coordinates
  useEffect(() => {
    if (!coords || !containerRef.current || mapRef.current) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      // Fix default icon paths broken by webpack
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false,
      }).setView([coords.lat, coords.lng], 15);

      mapRef.current = map;

      // Styled dark tile layer from CartoDB
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      // Custom pulsating destination marker
      const destinationIcon: DivIcon = L.divIcon({
        className: "",
        html: `<div class="pulse-marker"><div class="ring"></div><div class="dot"></div></div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      // Animated vehicle marker (courier position, slightly offset to simulate distance)
      const vehicleIcon: DivIcon = L.divIcon({
        className: "",
        html: `<div class="vehicle-marker" style="font-size:28px; line-height:1;">🛵</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      // Place destination marker at delivery address
      L.marker([coords.lat, coords.lng], { icon: destinationIcon }).addTo(map);

      // Place vehicle slightly away from destination
      const vehicleLat = coords.lat - 0.007;
      const vehicleLng = coords.lng + 0.005;
      const vehicleMarker = L.marker([vehicleLat, vehicleLng], { icon: vehicleIcon }).addTo(map);

      // Draw a dashed route line
      L.polyline([[vehicleLat, vehicleLng], [coords.lat, coords.lng]], {
        color: "#6366f1",
        weight: 3,
        dashArray: "8, 8",
        opacity: 0.8,
      }).addTo(map);

      // Animate the vehicle slowly towards the destination
      let progress = 0;
      const animationInterval = setInterval(() => {
        progress += 0.002;
        if (progress > 1) progress = 0; // loop
        const animLat = vehicleLat + (coords.lat - vehicleLat) * progress;
        const animLng = vehicleLng + (coords.lng - vehicleLng) * progress;
        vehicleMarker.setLatLng([animLat, animLng]);
      }, 50);

      // Fit map bounds to show both markers
      map.fitBounds([[vehicleLat, vehicleLng], [coords.lat, coords.lng]], { padding: [30, 30] });

      return () => {
        clearInterval(animationInterval);
      };
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [coords]);

  if (isLoading) {
    return (
      <div className="w-full h-48 bg-slate-800 rounded-2xl flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Locating destination...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-48 rounded-2xl overflow-hidden shadow-md">
      <div ref={containerRef} className="w-full h-full" />
      {/* Dark gradient overlay at bottom for readability */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      {/* Attribution */}
      <div className="absolute bottom-1 right-2 text-[9px] text-white/50 pointer-events-none">
        © OpenStreetMap / CartoDB
      </div>
    </div>
  );
}
